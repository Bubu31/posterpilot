# PosterPilot browser E2E suite

This is a real Playwright suite against PosterPilot, not a component mock. Its web-server harness:

- starts the SvelteKit application on an isolated port;
- creates a run-specific SQLite database and data directory under the operating-system temp folder;
- starts local Jellyfin- and Plex-compatible HTTP fakes that implement the provider contracts used by setup, sync, artwork reads/writes, verification, undo, native collections, and Kometa binding;
- removes the database, application data, one-time runtime metadata, and fake servers when Playwright stops.

The tests deliberately use the public UI and production API surface. The only direct database fixture runs **after** setup, sync, and full rescan have imported real fake-server records. It adds deterministic TMDB metadata, candidate evidence, and collection membership to that throwaway database because TMDB/provider internet calls must not be part of a repeatable browser test. No test-only route or production backdoor is added.

## Coverage and ordering

The Playwright projects form a dependency chain so mutable workflows stay deterministic:

1. `bootstrap`: setup, Jellyfin login, first sync, incremental sync, full rescan;
2. `product-flows`: review/navigation, manual-match validation plus real pin clearing/audit, exact apply/verification/undo, all FUN experiments, review-only automation/webhook, backup lifecycle, and coordinated collection apply/undo with unavailable-member context;
3. `multi-server-kometa`: named Plex connection, active-server isolation in both directions, structured Kometa preview/confirm, raw preview/confirm and backup;
4. `authentication`: enable, API/page guard, invalid and valid login, redirect preservation, safe disable.

## Run

Once `@playwright/test` is installed in the workspace and Chromium is available:

```sh
bunx playwright test --config playwright.e2e.config.mjs
```

Useful focused commands:

```sh
bunx playwright test --config playwright.e2e.config.mjs --project product-flows
bunx playwright test --config playwright.e2e.config.mjs --ui
```

Dependent projects automatically run their prerequisites. Reports and traces are written only to ignored `playwright-report/` and `test-results/` directories.
