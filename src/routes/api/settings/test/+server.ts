import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { resolveActiveServer, serverTypeLabel } from '$lib/server/media-server';
import { resolveTmdb } from '$lib/server/tmdb/client';

/** Test connectivity to the active media server and TMDB using the effective config. */
export const POST: RequestHandler = async () => {
	const config = await resolveConfig();

	const { server, missing } = resolveActiveServer(config);
	const plex = server
		? await server.testConnection()
		: {
				ok: false,
				error: `${serverTypeLabel(config.serverType)} not configured (missing: ${missing.join(', ')})`
			};

	let tmdb: { ok: boolean; error?: string };
	if (!config.tmdbKey) {
		tmdb = { ok: false, error: 'TMDB credential not configured' };
	} else {
		try {
			// A well-known TMDB id (Fight Club) round-trips auth + classification.
			const res = await resolveTmdb({ tmdb: '550' }, config.tmdbKey, { cacheTtlDays: 0 });
			tmdb = res ? { ok: true } : { ok: false, error: 'TMDB request failed' };
		} catch (e) {
			tmdb = { ok: false, error: e instanceof Error ? e.message : String(e) };
		}
	}

	return json({ serverType: config.serverType, plex, tmdb });
};
