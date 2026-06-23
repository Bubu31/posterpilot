# posterpilot

Self-hosted web app to browse a Plex library, find artwork covers on
[mediux.pro](https://mediux.pro), and apply the chosen cover to Plex — directly
via the Plex API and/or by exporting Kometa/PMM-compatible YAML. Runs as a single
Docker container on a Mac and on an Unraid server.

> Spec-driven via [OpenSpec](https://github.com/Fission-AI/OpenSpec). See
> `openspec/changes/add-poster-manager/` for the proposal, design, specs, and tasks.

## What it does

1. **Sync** your Plex movie/show libraries and resolve each title to a TMDB id.
2. **Find covers** for a title on mediux.pro (poster/background candidates).
3. **Apply** a chosen cover, two ways (selectable):
   - **Plex API** — uploads the poster and locks the field, instantly.
   - **Kometa export** — writes `url_poster`/`url_background` YAML into a mounted
     directory your existing Kometa instance consumes on its next run.

Library-wide work runs as background jobs with live progress (SSE).

## Stack

- **SvelteKit** (TypeScript) on **Bun**, built with `adapter-node` (run under Bun)
- **SQLite + Drizzle ORM** (libsql) — library cache, candidates, history, jobs, settings
- **Tailwind CSS v4**, dark image-forward UI
- In-process job queue + **Server-Sent Events** for live progress

## Develop

```sh
bun install
cp .env.example .env          # fill PLEX_URL / PLEX_TOKEN / TMDB_KEY (or use the Settings UI)
bun run db:generate           # generate SQL migrations from the Drizzle schema (already committed)
bun run dev                   # http://localhost:5173
```

Migrations are applied automatically on server startup. Useful scripts:

| script | purpose |
| --- | --- |
| `bun run dev` | dev server |
| `bun run build` | production build (adapter-node) |
| `bun run start` | run the built server (`node build`) |
| `bun run check` | svelte-check type checking |
| `bun run test` | vitest unit tests |
| `bun run format` / `lint` | prettier write / check |
| `bun run fallow` | Fallow code-intelligence health report |

## Run with Docker (Mac and Unraid)

The same image runs anywhere. Build and start with compose:

```sh
docker compose up -d --build
# UI at http://localhost:3000
```

Configuration is via environment variables (or the in-app **Settings** page):

| var | meaning |
| --- | --- |
| `PLEX_URL` | e.g. `http://192.168.1.10:32400` |
| `PLEX_TOKEN` | your `X-Plex-Token` |
| `TMDB_KEY` | TMDB v3 API key **or** v4 bearer/JWT (auto-detected) |
| `DATABASE_URL` | libsql file URL (default `file:/data/posterpilot.db` in Docker) |
| `KOMETA_ASSETS_DIR` | where exported Kometa YAML is written (default `/kometa`) |
| `PORT` | listen port (default `3000`) |

Two volumes matter:

- **`/data`** — persistent SQLite db, settings, and history. Keep this on a
  mounted volume so state survives container updates.
- **`/kometa`** — mount your Kometa assets/config directory here so the exported
  YAML lands where Kometa reads it.

### Unraid

Point the Kometa volume at your existing Kometa config, e.g. in
`docker-compose.yml`:

```yaml
    volumes:
      - /mnt/user/appdata/posterpilot:/data
      - /mnt/user/appdata/kometa/config:/kometa
```

Set `PLEX_URL`/`PLEX_TOKEN`/`TMDB_KEY` in the container's environment (or leave
them blank and configure via the Settings page), then browse to the container on
port 3000.

## How Kometa consumes the export

posterpilot writes a single metadata file (default `posterpilot.yml`) into
`KOMETA_ASSETS_DIR`, keyed by TMDB id with `url_poster` / `url_background`
entries — the same shape the legacy scraper produced. Add that file to your
Kometa library config (e.g. under `metadata_path`/`metadata_files`) so Kometa
applies the covers on its next run. Re-applying updates entries in place.

## Reference

Scraping behavior is ported from the legacy Python tool `mediux-scraper-monorepo`
(reference only — no Python code is reused).
