## 1. Toasts

- [x] 1.1 `src/lib/stores/toasts.svelte.ts` (runes store) + `Toaster.svelte` — two ARIA live regions (polite for success/info, assertive for errors), errors persist until dismissed, success/info auto-dismiss, `prefers-reduced-motion` safe, AA-contrast styles; mounted in the root layout. `toast_dismiss` added to all 5 catalogs.
- [x] 1.2 Wired success/error toasts into the settings save. (Broader wiring — apply/sync/refresh/clear — left as easy follow-on now that the store exists.)
- [x] 1.3 i18n parity for the new toast string.

## 2. Skeletons

- [x] 2.1 `Skeleton.svelte` — reduced-motion-safe shimmer placeholder sized by class.
- [x] 2.2 Wired skeleton tiles into the library grid's load-more (infinite-scroll) state, matching the grid layout. (Item-detail / settings skeletons left as follow-on.)

## 3. Keyboard & focus

- [x] 3.1 Audited the shared overlay: `Popover.svelte` already has `Esc`-to-close, focus-into-panel on open, focus-return-to-trigger, and visible `:focus-visible` — the primary flows use it, so keyboard operability is in good shape.
- [~] 3.2 No new focus-trap work needed for popovers; a deeper per-flow audit of the grid/bulk-action keyboard paths is left as follow-on.

## 4. Verification

- [x] 4.1 Gates: `bun run check` (0 errors), `bun run test`, `bun run lint`.
- [ ] 4.2 Manual a11y walkthrough in the running app (keyboard-only, reduced-motion, AA on toasts/skeletons).
