import { fetchText } from '$lib/server/http';
import { BROWSER_USER_AGENT } from '$lib/server/ua';
import type { AppConfig } from '$lib/server/config';
import type { MediaItem } from '$lib/server/db/schema';
import type { PosterProvider } from './types';
import { parseThePosterDbAssets, parseThePosterDbSearchResults } from './parse';
import { getThePosterDbSession, invalidateThePosterDbSession } from './theposterdb-session';

/**
 * ThePosterDB provider (experimental, opt-in, disabled by default).
 *
 * ThePosterDB has no public API and no clean TMDB-id → page mapping, so discovery is a
 * best-effort title search. It also now serves only a placeholder image to anonymous
 * requests, so this signs in with the configured account first (see
 * theposterdb-session.ts) and re-authenticates once if a request comes back looking
 * logged-out. Discovery is two calls: `/search` returns matching titles (no images
 * embedded any more), then the best-matching title's own page is fetched for the real
 * poster asset URLs. Any mismatch/failure returns [] gracefully so enabling this
 * provider can never break discovery of the others.
 */

const BASE_URL = 'https://theposterdb.com';

/** Prefer an exact year match; otherwise fall back to the first (most relevant) result. */
function pickBestMatch<T extends { year: number | null }>(
	results: T[],
	year: number | null
): T | null {
	if (!results.length) return null;
	if (year !== null) {
		const exact = results.find((r) => r.year === year);
		if (exact) return exact;
	}
	return results[0];
}

async function fetchAuthenticated(
	url: string,
	cookie: string,
	config: AppConfig,
	opts?: { forceRefresh?: boolean }
) {
	return fetchText(url, {
		headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html', Cookie: cookie },
		cacheTtlDays: config.httpCacheTtlDays,
		forceRefresh: opts?.forceRefresh,
		retries: 1
	});
}

export const thePosterDbProvider: PosterProvider = {
	id: 'theposterdb',
	label: 'ThePosterDB',
	requiresKey: true,
	isAvailable: (config) =>
		config.providerThePosterDb &&
		Boolean(config.thePosterDbUsername) &&
		Boolean(config.thePosterDbPassword),
	async discover(item: MediaItem, config: AppConfig, opts) {
		let cookie = await getThePosterDbSession(
			config.thePosterDbUsername,
			config.thePosterDbPassword
		);
		if (!cookie) return [];

		const term = encodeURIComponent(`${item.title} ${item.year ?? ''}`.trim());
		const section = item.type === 'show' ? 'shows' : 'movies';
		const searchUrl = `${BASE_URL}/search?term=${term}&section=${section}`;

		const searchHtml = await fetchAuthenticated(searchUrl, cookie, config, opts);
		let results = parseThePosterDbSearchResults(searchHtml);
		let match = pickBestMatch(results, item.year);

		// A stale/expired session still returns HTTP 200 with normal-looking markup, so
		// the only reliable "logged out" signal is getting no matches back at all when
		// a same-title anonymous search would (title links don't require auth, only the
		// asset images do — so an empty result here means the session itself is bad).
		if (!match) {
			invalidateThePosterDbSession();
			cookie = await getThePosterDbSession(config.thePosterDbUsername, config.thePosterDbPassword);
			if (!cookie) return [];
			const retryHtml = await fetchAuthenticated(searchUrl, cookie, config, {
				...opts,
				forceRefresh: true
			});
			results = parseThePosterDbSearchResults(retryHtml);
			match = pickBestMatch(results, item.year);
			if (!match) return [];
		}

		const pageHtml = await fetchAuthenticated(match.url, cookie, config, opts);
		let sets = parseThePosterDbAssets(pageHtml);
		if (!sets.length) {
			// The title page loaded but every image was the anonymous placeholder —
			// the session expired between the search and this fetch. Re-login once.
			invalidateThePosterDbSession();
			cookie = await getThePosterDbSession(config.thePosterDbUsername, config.thePosterDbPassword);
			if (!cookie) return [];
			const retryPageHtml = await fetchAuthenticated(match.url, cookie, config, {
				...opts,
				forceRefresh: true
			});
			sets = parseThePosterDbAssets(retryPageHtml);
		}
		return sets;
	}
};
