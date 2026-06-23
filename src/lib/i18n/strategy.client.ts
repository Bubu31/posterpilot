// Registers the client-side "custom-setting" Paraglide strategy. `getLocale`
// returns the locale that the server already resolved for this page (seeded from
// the root layout's `locale`), so client hydration matches SSR. `setLocale`
// persists the chosen language through the existing settings API; Paraglide then
// reloads (its default) so the next SSR pass renders in the new locale.
import { defineCustomClientStrategy, isLocale } from '$lib/paraglide/runtime';

let activeLocale: string | undefined;
let registered = false;

/** Seed the active locale resolved by the server for the current page. */
export function seedClientLocale(locale: string): void {
	if (isLocale(locale)) activeLocale = locale;
}

/** Idempotently register the client custom-setting strategy. */
export function registerClientLocaleStrategy(): void {
	if (registered) return;
	registered = true;
	defineCustomClientStrategy('custom-setting', {
		getLocale: () => activeLocale,
		setLocale: async (locale) => {
			activeLocale = locale;
			// Persist as the `language` app setting (same write the Settings page uses)
			// so the choice is sticky across reloads and SSR.
			await fetch('/api/settings', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ language: locale })
			});
		}
	});
}
