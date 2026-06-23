import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { resolveActiveServer, serverTypeLabel } from '$lib/server/media-server';

/** List the active server's movie/show libraries (for choosing which to sync). */
export const GET: RequestHandler = async () => {
	const config = await resolveConfig();
	const { server, missing } = resolveActiveServer(config);
	if (!server) {
		return json({
			sections: [],
			error: `${serverTypeLabel(config.serverType)} not configured (missing: ${missing.join(', ')})`
		});
	}
	try {
		const sections = await server.listLibraries();
		return json({ sections });
	} catch (e) {
		return json({ sections: [], error: e instanceof Error ? e.message : String(e) });
	}
};
