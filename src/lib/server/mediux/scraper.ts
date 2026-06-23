/**
 * Network orchestration for MediaUX (mediux.pro) scraping.
 *
 * Fetches listing and set pages via the shared HTTP layer (which provides
 * retry-with-backoff and response caching), then delegates extraction to the
 * pure parser. Discovery fans out over a bounded concurrency limiter and spaces
 * requests with a polite delay so the source is not overloaded. Per-set parse
 * failures are isolated: a bad set is skipped, never aborting the whole item.
 */

import { fetchText, createLimiter, delay } from '$lib/server/http';
import type { MediuxCandidate, MediuxSet, TmdbMediaType } from '$lib/server/types';
import { extractSetLinks, extractNextPayload, parseSetCandidates } from './parser';

const BASE_URL = 'https://mediux.pro';

/**
 * Browser-like User-Agent. mediux.pro is a Next.js app; a realistic UA matches
 * the legacy scraper and avoids trivial bot filtering.
 */
const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

const HEADERS: Record<string, string> = { 'User-Agent': USER_AGENT };

/** Per-request fetch tuning shared by the listing and set fetchers. */
export interface FetchTuning {
	cacheTtlDays?: number;
	forceRefresh?: boolean;
}

/** Build the listing-page URL for a TMDB id (movies vs shows path). */
function listingUrl(tmdbId: string, mediaType: TmdbMediaType): string {
	const segment = mediaType === 'movie' ? 'movies' : 'shows';
	return `${BASE_URL}/${segment}/${tmdbId}`;
}

/** Build the set-page URL for a set id. */
function setUrl(setId: string): string {
	return `${BASE_URL}/sets/${setId}`;
}

/**
 * Discover the set ids published for a TMDB id, newest-first.
 *
 * @param tmdbId Resolved TMDB id.
 * @param mediaType Whether the id is a movie or a show.
 * @param opts Optional fetch tuning (cache TTL / force refresh).
 * @returns De-duplicated set ids, newest-first. Empty when none are found.
 */
export async function findSets(
	tmdbId: string,
	mediaType: TmdbMediaType,
	opts: FetchTuning = {}
): Promise<string[]> {
	const html = await fetchText(listingUrl(tmdbId, mediaType), {
		headers: HEADERS,
		cacheTtlDays: opts.cacheTtlDays,
		forceRefresh: opts.forceRefresh
	});
	return extractSetLinks(html);
}

/**
 * Load a single set and extract its candidate artwork.
 *
 * On any parse failure (missing payload, unexpected shape) this returns an empty
 * array rather than throwing, so the orchestrator can skip-and-continue. Network
 * errors from the HTTP layer (after its own retries) still propagate.
 *
 * @param setId The MediaUX set id.
 * @param opts Optional fetch tuning (cache TTL / force refresh).
 * @returns Candidates for the set, or `[]` when the page could not be parsed.
 */
export async function loadSet(setId: string, opts: FetchTuning = {}): Promise<MediuxCandidate[]> {
	const html = await fetchText(setUrl(setId), {
		headers: HEADERS,
		cacheTtlDays: opts.cacheTtlDays,
		forceRefresh: opts.forceRefresh
	});
	try {
		const payload = extractNextPayload(html);
		return parseSetCandidates(payload, setId);
	} catch {
		// Page structure changed / unparseable: record nothing and move on.
		return [];
	}
}

/** Options for a full candidate-discovery run. */
export interface DiscoverOptions {
	/** Delay applied before each set request, in milliseconds. */
	delayMs: number;
	/** Maximum number of concurrent set requests. */
	concurrency: number;
	/** HTTP cache TTL in days for both listing and set fetches. */
	cacheTtlDays: number;
	/** Bypass cache reads (responses are still written back). */
	forceRefresh?: boolean;
}

/**
 * Discover all MediaUX sets and their candidates for a TMDB id.
 *
 * Finds the sets, then loads each one through a bounded concurrency limiter,
 * pausing `delayMs` before every set request for polite rate-limiting. Sets that
 * fail to parse (empty candidate list) are dropped from the result. The original
 * newest-first set ordering is preserved.
 *
 * @param tmdbId Resolved TMDB id.
 * @param mediaType Whether the id is a movie or a show.
 * @param opts Throttling, concurrency, and cache settings.
 * @returns One `MediuxSet` per set that yielded at least one candidate.
 */
export async function discoverCandidates(
	tmdbId: string,
	mediaType: TmdbMediaType,
	opts: DiscoverOptions
): Promise<MediuxSet[]> {
	const setIds = await findSets(tmdbId, mediaType, {
		cacheTtlDays: opts.cacheTtlDays,
		forceRefresh: opts.forceRefresh
	});
	if (setIds.length === 0) return [];

	const limit = createLimiter(opts.concurrency);

	const results = await Promise.all(
		setIds.map((setId) =>
			limit(async () => {
				if (opts.delayMs > 0) await delay(opts.delayMs);
				const candidates = await loadSet(setId, {
					cacheTtlDays: opts.cacheTtlDays,
					forceRefresh: opts.forceRefresh
				});
				return { setId, candidates } satisfies MediuxSet;
			})
		)
	);

	// Drop sets that produced no usable candidates (parse failures / empties).
	return results.filter((set) => set.candidates.length > 0);
}
