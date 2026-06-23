import type { PageServerLoad } from './$types';
import { publicConfig } from '$lib/server/config';
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '$lib/i18n/resolve';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		config: await publicConfig(),
		locale: locals.locale,
		availableLocales: SUPPORTED_LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] }))
	};
};
