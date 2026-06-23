import type { LayoutServerLoad } from './$types';
import { resolveConfig } from '$lib/server/config';
import { getActiveServer } from '$lib/server/media-server';
import { activeJobCount } from '$lib/server/queries';

export const load: LayoutServerLoad = async () => {
	const config = await resolveConfig();
	return {
		activeJobs: await activeJobCount(),
		// Ready when the active media server is configured and TMDB is set.
		configReady: Boolean(getActiveServer(config) && config.tmdbKey)
	};
};
