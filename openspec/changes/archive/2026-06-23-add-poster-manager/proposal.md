## Why

Replacing Plex artwork today means running the legacy `mediux-scraper` Python CLI by hand, hand-editing a `movies.txt`, and either pasting YAML into Kometa or fiddling with files on the server. There is no way to *see* a library, *compare* candidate covers from [mediux.pro](https://mediux.pro), and apply a choice in one place. This change introduces a self-hosted web app that lists a Plex library, finds MediaUX covers per title, and applies the chosen cover — both directly through the Plex API and by exporting Kometa-compatible YAML — from a single dockerized service that runs on both a Mac and an Unraid server.

## What Changes

- **New TypeScript/SvelteKit app** (`posterpilot`) running on Bun, replacing the legacy Python scraper as the primary tool. The Python repo remains a behavioral reference only; no Python code is reused.
- **Browse a Plex library in a web UI**: list movie and show sections, read each item's GUIDs (tmdb/imdb), and display the current poster in a grid with filters (type, missing-poster, has-mediux) and search.
- **Resolve titles to TMDB IDs** from Plex GUIDs, with caching.
- **Scrape MediaUX** for the artwork sets attached to a TMDB ID and surface poster/background candidates, porting the legacy scraping behavior (Next.js JSON extraction, rate limiting, retries, HTTP caching).
- **Apply a chosen cover two ways, selectable**: (1) directly via the Plex API (`uploadPoster` + field lock), and (2) by exporting Kometa-compatible `url_poster`/`url_background` YAML into a mounted directory the user's Kometa instance consumes.
- **Run library-wide work as background jobs** with live progress streamed to the UI (Server-Sent Events) and a job history. Single-user, in-process queue — no Redis/Celery.
- **Persist state in SQLite** (library cache, candidates, applied-poster history, jobs, settings) via Drizzle ORM.
- **Ship as a single Docker image** with a compose file for Unraid (volumes for the SQLite data dir and the Kometa assets dir; env for Plex/TMDB credentials), identical on Mac.

## Capabilities

### New Capabilities

- `plex-integration`: Connect to a Plex server with a token, list library sections and items, read item GUIDs and the current poster, and apply a poster via the Plex API with field locking.
- `tmdb-resolution`: Resolve a Plex/external GUID (tmdb/imdb/tvdb) to a canonical TMDB ID and media type (movie/show), with caching.
- `mediux-scraping`: Discover MediaUX artwork sets for a TMDB ID and extract poster/background candidates, with HTTP caching, rate limiting, and retries.
- `poster-application`: Select a candidate cover for an item and apply it through one or both methods (direct Plex upload, Kometa YAML export), recording what was applied.
- `background-jobs`: Run long-running, library-wide operations as cancellable background jobs with live progress (SSE) and a persisted job history.
- `web-ui`: The SvelteKit web interface — dashboard, library grid with filters/search, item detail with candidate comparison, bulk actions, jobs view, and settings.
- `configuration`: Store and validate runtime configuration (Plex URL/token, TMDB key, Kometa assets path) and handle secrets, sourced from env and the settings UI.
- `deployment`: Run as a single Docker container on Mac and Unraid, persisting data and writing Kometa assets to mounted volumes.

### Modified Capabilities

<!-- None. This is a greenfield repo with no existing specs. -->

## Impact

- **New repository** `posterpilot` (separate from `mediux-scraper-monorepo`). Greenfield — no existing code or specs affected.
- **External systems**: Plex Media Server (HTTP API + token), TMDB API (key/JWT), mediux.pro (HTML scraping), and the user's Kometa/PMM instance (consumes exported YAML/assets).
- **Dependencies (new)**: SvelteKit, Bun runtime, Drizzle ORM + SQLite, Tailwind CSS + a Svelte component library, plus small utilities for HTTP concurrency/retry and YAML generation.
- **Runtime footprint**: one container, two mounted volumes (SQLite data dir, Kometa assets dir), credentials via environment variables.
