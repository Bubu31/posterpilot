// Registers the server-side "custom-setting" Paraglide strategy: the highest-
// precedence input to locale resolution, reading the persisted `language` app
// setting (which env `APP_LANGUAGE` can lock). When unset/invalid it returns
// undefined so Paraglide falls through to `preferredLanguage` (Accept-Language)
// and then `baseLocale` (English).
import { defineCustomServerStrategy } from '$lib/paraglide/runtime';
import { resolveConfig } from '$lib/server/config';
import { normalizeLocale } from '$lib/i18n/resolve';

let registered = false;

/** Idempotently register the server custom-setting strategy. */
export function registerServerLocaleStrategy(): void {
	if (registered) return;
	registered = true;
	defineCustomServerStrategy('custom-setting', {
		getLocale: async () => {
			try {
				const config = await resolveConfig();
				return normalizeLocale(config.language) ?? undefined;
			} catch {
				return undefined;
			}
		}
	});
}
