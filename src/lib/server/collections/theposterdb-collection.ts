import { fetchText } from '$lib/server/http';
import type { AppConfig } from '$lib/server/config';
import { BROWSER_USER_AGENT } from '$lib/server/ua';
import {
	parseThePosterDbSearchResults,
	parseThePosterDbSet
} from '$lib/server/posters/providers/parse';
import {
	getThePosterDbSession,
	invalidateThePosterDbSession
} from '$lib/server/posters/providers/theposterdb-session';
import {
	matchThePosterDbSetToMembers,
	normalizeTitle,
	type CollectionMemberRef,
	type ThePosterDbCollectionSet
} from './theposterdb-collection-match';

export type {
	CollectionMemberRef,
	SetMemberMatch,
	ThePosterDbCollectionSet
} from './theposterdb-collection-match';

const BASE_URL = 'https://theposterdb.com';

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

function pickBestCollectionMatch(
	results: Array<{ url: string; title: string }>,
	collectionName: string
): { url: string; title: string } | null {
	if (!results.length) return null;
	const normalized = normalizeTitle(collectionName);
	return results.find((r) => normalizeTitle(r.title) === normalized) ?? results[0];
}

/**
 * Best-effort: search ThePosterDB's Collections section for the collection name, open the
 * best match's set page, parse its per-film posters, and map them onto the members. Any
 * miss, auth failure, or markup change returns null/empty so this never breaks the rest
 * of collection discovery. One re-auth retry mirrors the per-item provider.
 */
export async function fetchThePosterDbCollectionSet(
	collectionName: string,
	members: CollectionMemberRef[],
	config: AppConfig
): Promise<ThePosterDbCollectionSet | null> {
	let cookie = await getThePosterDbSession(config.thePosterDbUsername, config.thePosterDbPassword);
	if (!cookie) return null;

	const searchUrl = `${BASE_URL}/search?term=${encodeURIComponent(
		collectionName.trim()
	)}&section=collections`;
	let match = pickBestCollectionMatch(
		parseThePosterDbSearchResults(await fetchAuthenticated(searchUrl, cookie, config)),
		collectionName
	);
	if (!match) {
		invalidateThePosterDbSession();
		cookie = await getThePosterDbSession(config.thePosterDbUsername, config.thePosterDbPassword);
		if (!cookie) return null;
		match = pickBestCollectionMatch(
			parseThePosterDbSearchResults(
				await fetchAuthenticated(searchUrl, cookie, config, { forceRefresh: true })
			),
			collectionName
		);
		if (!match) return null;
	}

	let posters = parseThePosterDbSet(await fetchAuthenticated(match.url, cookie, config));
	if (!posters.length) {
		invalidateThePosterDbSession();
		cookie = await getThePosterDbSession(config.thePosterDbUsername, config.thePosterDbPassword);
		if (!cookie) return null;
		posters = parseThePosterDbSet(
			await fetchAuthenticated(match.url, cookie, config, { forceRefresh: true })
		);
		if (!posters.length) return null;
	}

	const mapped = matchThePosterDbSetToMembers(posters, members);
	return { setId: posters[0].setId, ...mapped };
}
