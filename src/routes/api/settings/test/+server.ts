import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { testConnection } from '$lib/server/plex/client';
import { resolveTmdb } from '$lib/server/tmdb/client';

/** Test connectivity to Plex and TMDB using the effective configuration. */
export const POST: RequestHandler = async () => {
	const config = await resolveConfig();

	const plex = config.plexUrl && config.plexToken
		? await testConnection(config.plexUrl, config.plexToken)
		: { ok: false, error: 'Plex URL/token not configured' };

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

	return json({ plex, tmdb });
};
