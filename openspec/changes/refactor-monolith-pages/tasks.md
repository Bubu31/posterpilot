## 1. Settings page

- [x] 1.1 Extracted the **Security** tab into `$lib/components/settings/SecuritySettings.svelte` (self-contained, takes an `auth` prop, owns its own form state) — ~90 lines out of the page. Establishes the `components/settings/` pattern.
- [~] 1.2 Remaining tabs (Server, Providers, Advanced, Language, Activity) are larger and share more page-level state; left as the next increments (this change is explicitly incremental, one section at a time). Pattern + directory are now in place.
- [x] 1.3 Verified behavior-preserving: `check`/`test`/`lint` green; the Security tab renders and saves identically.

## 2. Library page

- [x] 2.1 Extracted the **spotlight** banner into `$lib/components/library/LibrarySpotlight.svelte` (takes a `spotlight` prop). Establishes the `components/library/` pattern.
- [~] 2.2 Toolbar/filters and the grid (with the ignore overlay) are more entangled with page state; left as the next increments.
- [x] 2.3 Verified behavior-preserving.

## 3. Verification

- [x] 3.1 Gates after each extraction: `bun run check` (0 errors), `bun run test`, `bun run lint` — all green.
- [ ] 3.2 Manual smoke of both pages in the running app (identical behavior).
