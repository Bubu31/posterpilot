## Context

The legacy `mediux-scraper-monorepo` is a Python tool (a complete 1420-line `main.py` plus an unfinished package/app refactor) that resolves titles to TMDB IDs, scrapes mediux.pro for artwork sets, and emits Kometa YAML inside a consolidated JSON dump. It is CLI-only and file-driven; there is no UI and no direct-to-Plex application.

This change starts a **new repository** that keeps the proven scraping *behavior* as a reference but rebuilds the tool as a self-hosted web app. The user runs it on a Mac (development/daily use) and on an Unraid server (where Plex and Kometa already run). The headline requirement is a modern UI for browsing a Plex library and comparing/applying MediaUX covers.

Stack was chosen deliberately: the workload is I/O-bound (HTTP to Plex/TMDB/MediaUX) and the centerpiece is an image-heavy interactive UI, which is the JavaScript/TypeScript ecosystem's strength. A single language end-to-end yields one container and one mental model, and the user's `fallow` code-intelligence tool only analyzes TS/JS.

## Goals / Non-Goals

**Goals:**

- One TypeScript codebase (SvelteKit on Bun) serving UI + API + background worker from a single Docker image.
- Browse a Plex library, discover MediaUX covers per item, and apply a chosen cover — directly via Plex API and/or via exported Kometa YAML.
- Library-wide operations run as background jobs with live progress (SSE).
- Persist everything in SQLite so the tool is stateful and restart-safe.
- Identical behavior on Mac and Unraid via the same image and mounted volumes.

**Non-Goals (v1):**

- Overlays/badges, collections, or any Kometa feature beyond poster/background replacement.
- Per-episode title-card management (phase 2 — the scraper may surface them, but applying them is out of scope).
- Multi-user accounts and hardened auth (LAN/self-hosted single user; optional simple password only).
- Multiple Plex servers in one instance.
- Reusing any Python code; the legacy repo is a behavioral reference only.

## Decisions

### Framework: SvelteKit (vs. Next.js, Remix)

SvelteKit gives server routes + UI in one deployable with less boilerplate and a smaller image than Next.js, and its load/actions model fits a data-driven CRUD+grid app well. Next.js/React was the runner-up (familiarity, `next/image`); rejected as heavier than needed for a single-user self-hosted tool. Remix/Nuxt were viable but offered no decisive advantage.

### Runtime: Bun (vs. Node LTS)

Bun runs TypeScript natively, has a built-in SQLite driver, fast startup, and a single-process model that suits an in-process job worker. SvelteKit is served with a Bun adapter. Node LTS was the safe fallback for maximum library compatibility; chosen against because Bun's SQLite + speed simplify the self-hosted deployment and no dependency in scope requires Node-only APIs. Risk is mitigated by keeping framework-agnostic server code so a swap to `adapter-node` is cheap if a library forces it.

### Persistence: SQLite + Drizzle ORM

A single SQLite file on a mounted volume is the right fit for a single-user self-hosted tool: no extra service, trivial backup, works the same on Mac and Unraid. Drizzle gives typed schema + migrations in TS. Postgres (as the legacy backend attempted) was rejected as operational overhead with no benefit at this scale.

### Background jobs: in-process queue + SSE (vs. Redis/Celery/BullMQ)

Single-user concurrency does not justify an external broker. An in-process async queue with bounded concurrency plus a Server-Sent Events stream for progress keeps the whole app in one container. The trade-off — jobs do not survive a crash mid-run — is handled by marking interrupted jobs failed on startup. BullMQ/Redis was rejected as a second service to run on Unraid for no real gain; it remains an option if multi-instance scaling is ever needed.

### MediaUX scraping: port the legacy extraction, harden the brittle parts

Reimplement the legacy flow in TS: fetch the mediux.pro movie/show page, extract set links (newest-first), load each set, and parse the embedded Next.js payload to enumerate assets. The legacy code assumes a fixed payload index and double-`json.loads`; the port isolates parsing behind a single function with explicit failure handling (skip-and-continue per set) so a frontend change on mediux.pro degrades gracefully instead of aborting an item. Concurrency via a small `p-limit`-style limiter; retries with backoff; HTTP responses cached in SQLite with a TTL.

### Poster application: two independent methods behind one interface

`poster-application` orchestrates selection and delegates: direct apply calls the Plex integration's `uploadPoster` (URL-based) and locks the field; Kometa export writes `url_poster`/`url_background` YAML into a mounted directory, matching the legacy YAML shape so the user's existing Kometa consumes it unchanged. Both can run in one action and each outcome is recorded independently so partial failures are visible.

### Configuration & secrets

Effective config = environment variables overriding persisted settings. Secrets (Plex token, TMDB credential) are never returned to the client after save (the UI shows "set/not set") and are redacted from logs. For a LAN tool this is sufficient; OS-keyring storage (as the legacy CLI used) is unnecessary in a container.

## Risks / Trade-offs

- **mediux.pro frontend changes break extraction** → Isolate parsing in one module with per-set skip-and-continue and a clear parse-failure signal in the UI; cover the parser with fixture-based tests so breakage is caught fast.
- **Plex fetches the poster by URL, so the MediaUX asset URL must be reachable from the Plex server** → Document the network requirement; if it proves unreliable, add a fallback that downloads the asset and uploads bytes to Plex (kept out of v1 scope).
- **In-process jobs lost on crash** → Mark interrupted jobs failed on startup; jobs are idempotent (re-running discovery/apply is safe) so the user can simply restart them.
- **Bun ecosystem maturity** → Keep server code framework-agnostic to allow a low-cost switch to `adapter-node` if a required library is incompatible.
- **Rate-limiting/scraping etiquette** → Conservative defaults (bounded concurrency + per-request delay) ported from the legacy tool to avoid overloading mediux.pro.

## Migration Plan

Greenfield — no data migration. The legacy Python repo stays intact as a reference. Rollout is: scaffold repo → implement capabilities behind the specs → ship the Docker image and compose file → user points it at their existing Plex/TMDB/Kometa. Rollback is trivial (stop the container; the legacy CLI still works).

## Open Questions

- Exact Kometa consumption mode to target first: a single metadata YAML keyed by TMDB ID vs. per-item asset files. Default to the metadata-YAML shape the legacy tool already produces; revisit if the user's Kometa setup expects the assets-folder convention.
- Whether the optional simple password gate is wanted for v1 or deferred.
