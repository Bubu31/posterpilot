## 1. Capture

- [ ] 1.1 Shot list + conventions (defined here): **dark theme**, ~1280px viewport, a representative populated library. Shots: dashboard, library grid, item detail / apply, Settings (incl. Security), Kometa manager, first-run wizard.
- [ ] 1.2 **Blocked in this environment** — capturing real screenshots needs the app running against a configured media server with a synced library (and browser automation). This session has no populated instance, so captures would show empty setup screens. Deferred to a manual/CI pass on a real instance rather than shipping empty or broken images.

## 2. Embed

- [ ] 2.1 Once captured: store optimized PNG/WebP under the docs assets path and embed at the relevant points in `installation.md`, `configuration.md`, `usage.md` with descriptive alt text. (Not added yet — broken image refs would fail the Starlight build.)
- [ ] 2.2 Confirm Starlight bundles the assets and links resolve.

## 3. Verification

- [ ] 3.1 Build the docs site; verify images render.

---

**Status:** the only follow-up not implemented in the combined PR. It is apply-ready
(proposal + spec + this task list) but requires a populated running instance to
capture meaningful screenshots — a manual step for the maintainer.
