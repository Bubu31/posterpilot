import type { PageServerLoad } from './$types';
import { publicConfig, resolveConfig } from '$lib/server/config';
import { getActiveServer, type ServerLibrary } from '$lib/server/media-server';

export const load: PageServerLoad = async () => {
	const config = await resolveConfig();
	let sections: ServerLibrary[] = [];
	const server = getActiveServer(config);
	if (server) {
		try {
			sections = await server.listLibraries();
		} catch {
			sections = [];
		}
	}
	return { config: await publicConfig(), sections };
};
