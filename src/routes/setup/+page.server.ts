import type { PageServerLoad } from './$types';
import { publicConfig, getCachedLibraries } from '$lib/server/config';
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '$lib/i18n/resolve';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		config: await publicConfig(),
		// Last-known library list so the "Libraries" step renders the checklist
		// instantly; the step refreshes it live on mount.
		sections: await getCachedLibraries(),
		locale: locals.locale,
		availableLocales: SUPPORTED_LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] }))
	};
};
