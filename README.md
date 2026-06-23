# posterpilot

Self-hosted web app to browse a Plex library, find artwork covers on
[mediux.pro](https://mediux.pro), and apply the chosen cover to Plex — directly
via the Plex API and/or by exporting Kometa/PMM-compatible YAML. Runs as a single
Docker container on a Mac and on an Unraid server.

> Status: **in development.** Spec-driven via [OpenSpec](https://github.com/Fission-AI/OpenSpec).
> See `openspec/changes/add-poster-manager/` for the proposal, design, specs, and tasks.

## Stack

- **SvelteKit** (TypeScript) on the **Bun** runtime — UI + API + background worker in one app
- **SQLite + Drizzle ORM** for state (library cache, candidates, history, jobs, settings)
- **Tailwind CSS** + a Svelte component library for a dark, image-forward UI
- In-process job queue with **Server-Sent Events** for live progress

## Reference

The scraping behavior is ported from the legacy Python tool `mediux-scraper-monorepo`
(reference only — no Python code is reused).
