import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensurePlexClientId, resolveConfig } from '$lib/server/config';
import { listConnections } from '$lib/server/media-server/plex-auth';

/**
 * Discover the user's Plex servers and their connections (local/remote/relay).
 * Requires a stored Plex token; reports 409 when a login is needed first.
 */
export const GET: RequestHandler = async () => {
	const config = await resolveConfig();
	if (!config.plexToken) {
		return json({ error: 'A Plex login is required first.' }, { status: 409 });
	}
	try {
		const clientId = await ensurePlexClientId();
		const connections = await listConnections(config.plexToken, clientId);
		return json({ connections });
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
	}
};
