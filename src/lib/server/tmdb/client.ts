import { fetchJson } from '$lib/server/http';
import type { PlexGuids, TmdbMediaType, TmdbResolution } from '$lib/server/types';
import { parseFindResult, pickExternalId, tmdbAuth, type TmdbAuth } from './auth';

export {
	tmdbAuth,
	pickExternalId,
	parseFindResult,
	type TmdbAuth,
	type ExternalIdSelection
} from './auth';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_CACHE_TTL_DAYS = 30;

/** Append an auth query fragment to a URL that may already carry a query string. */
function withAuthQuery(url: string, query: string): string {
	if (!query) return url;
	return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}

/** True only when the JSON payload looks like a successful TMDB entity (has an `id`). */
function isTmdbEntity(json: unknown): boolean {
	return typeof json === 'object' && json !== null && 'id' in (json as Record<string, unknown>);
}

/**
 * Classify a known TMDB id as a movie or TV show by probing the movie endpoint first
 * and falling back to the TV endpoint.
 */
async function classifyTmdbId(
	tmdbId: string,
	auth: TmdbAuth,
	cacheTtlDays: number,
	forceRefresh: boolean
): Promise<TmdbMediaType | null> {
	const probe = async (mediaType: TmdbMediaType): Promise<boolean> => {
		const url = withAuthQuery(`${TMDB_BASE}/${mediaType}/${tmdbId}`, auth.query);
		try {
			const json = await fetchJson<unknown>(url, {
				headers: auth.headers,
				cacheTtlDays,
				forceRefresh
			});
			return isTmdbEntity(json);
		} catch {
			// A 4xx (e.g. 404 "not found as a movie") is a permanent failure in the
			// underlying fetch; treat it as "no match for this media type".
			return false;
		}
	};

	if (await probe('movie')) return 'movie';
	if (await probe('tv')) return 'tv';
	return null;
}

/**
 * Resolve a Plex/external GUID set to a canonical TMDB id and media type.
 *
 * Precedence is tmdb > imdb > tvdb. A direct TMDB id is classified by probing the
 * movie endpoint then the TV endpoint; an imdb/tvdb id is resolved through the TMDB
 * `find` endpoint. Results are cached via the shared HTTP cache.
 *
 * @param guids The GUIDs carried by a Plex item.
 * @param key The TMDB credential (v3 API key or v4 bearer/JWT).
 * @param opts Optional cache controls.
 * @returns The resolved TMDB id and media type, or null when nothing resolves.
 */
export async function resolveTmdb(
	guids: PlexGuids,
	key: string,
	opts: { forceRefresh?: boolean; cacheTtlDays?: number } = {}
): Promise<TmdbResolution | null> {
	const selected = pickExternalId(guids);
	if (!selected) return null;

	const { forceRefresh = false, cacheTtlDays = DEFAULT_CACHE_TTL_DAYS } = opts;
	const auth = tmdbAuth(key);

	if (selected.source === 'tmdb') {
		const mediaType = await classifyTmdbId(selected.id, auth, cacheTtlDays, forceRefresh);
		return mediaType ? { tmdbId: selected.id, mediaType } : null;
	}

	const url = withAuthQuery(
		`${TMDB_BASE}/find/${selected.id}?external_source=${selected.source}`,
		auth.query
	);
	try {
		const json = await fetchJson<unknown>(url, {
			headers: auth.headers,
			cacheTtlDays,
			forceRefresh
		});
		return parseFindResult(json);
	} catch {
		return null;
	}
}
