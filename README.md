# posterpilot

Self-hosted web app to browse a Plex library, find artwork covers on
[mediux.pro](https://mediux.pro), and apply the chosen cover to Plex — directly
via the Plex API and/or by exporting Kometa/PMM-compatible YAML. Runs as a single
Docker container on a Mac and on an Unraid server.

> Status: **in development.** Spec-driven via [OpenSpec](https://github.com/Fission-AI/OpenSpec).
> See `openspec/changes/add-poster-manager/` for the proposal, design, specs, and tasks.

## Stack

- **SvelteKit** (TypeScript) on the **Bun** runtime — UI + API + background worker in one app
- **adapter-node** build, run under Bun
- **SQLite + Drizzle ORM** (libsql) for state (library cache, candidates, history, jobs, settings)
- **Tailwind CSS v4** for a dark, image-forward UI
- In-process job queue with **Server-Sent Events** for live progress

## Develop

```sh
bun install
cp .env.example .env   # fill in PLEX_URL/PLEX_TOKEN/TMDB_KEY
bun run db:generate    # generate SQL migrations from the Drizzle schema
bun run dev            # dev server at http://localhost:5173
```

Migrations are applied automatically on server startup.

## Build & run

```sh
bun run build          # adapter-node output in ./build
bun ./build/index.js   # or: bun run start
```

## Scripts

| script | purpose |
| --- | --- |
| `bun run dev` | dev server |
| `bun run build` | production build (adapter-node) |
| `bun run start` | run the built server |
| `bun run db:generate` | generate Drizzle migrations |
| `bun run check` | svelte-check type checking |
| `bun run test` | run vitest |

## Reference

The scraping behavior is ported from the legacy Python tool `mediux-scraper-monorepo`
(reference only — no Python code is reused).
