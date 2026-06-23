import type { LayoutServerLoad } from './$types';
import { resolveConfig } from '$lib/server/config';
import { activeJobCount } from '$lib/server/queries';

export const load: LayoutServerLoad = async () => {
	const config = await resolveConfig();
	return {
		activeJobs: await activeJobCount(),
		configReady: Boolean(config.plexUrl && config.plexToken && config.tmdbKey)
	};
};
