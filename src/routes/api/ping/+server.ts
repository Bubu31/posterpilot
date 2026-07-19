import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { fetchText } from '$lib/server/http';
import { BROWSER_USER_AGENT } from '$lib/server/ua';
import { getThePosterDbSession } from '$lib/server/posters/providers/theposterdb-session';
import {
	parseThePosterDbSearchResults,
	parseThePosterDbSet
} from '$lib/server/posters/providers/parse';

// ponytail: temporary TPDb collection-pipeline probe — remove once diagnosed.
export const GET: RequestHandler = async ({ url }) => {
	const rawPath = url.searchParams.get('raw');
	if (rawPath) {
		const cfg = await resolveConfig();
		const ck = await getThePosterDbSession(cfg.thePosterDbUsername, cfg.thePosterDbPassword);
		if (!ck) return json({ step: 'session', ok: false });
		const html = await fetchText(`https://theposterdb.com${rawPath}`, {
			headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html', Cookie: ck },
			retries: 1
		});
		const i = html.indexOf('data-poster-id');
		return json({
			len: html.length,
			hasPosterId: i,
			window: i >= 0 ? html.slice(Math.max(0, i - 400), i + 500) : html.slice(0, 900)
		});
	}
	const term = url.searchParams.get('diag');
	if (!term) return json({ build: '6100ad4-ping' });
	const config = await resolveConfig();
	const cookie = await getThePosterDbSession(
		config.thePosterDbUsername,
		config.thePosterDbPassword
	);
	if (!cookie) return json({ step: 'session', ok: false });
	const get = (path: string) =>
		fetchText(`https://theposterdb.com${path}`, {
			headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html', Cookie: cookie },
			retries: 1
		});

	const searchHtml = await get(`/search?term=${encodeURIComponent(term)}&section=collections`);
	const results = parseThePosterDbSearchResults(searchHtml);
	const match = results[0] ?? null;
	let listingSetIds: string[] = [];
	let firstSet: { setId: string; count: number; sample: unknown } | null = null;
	if (match) {
		const listing = await get(new URL(match.url).pathname);
		listingSetIds = [...new Set(Array.from(listing.matchAll(/\/set\/(\d+)/g)).map((m) => m[1]))];
		if (listingSetIds[0]) {
			const posters = parseThePosterDbSet(await get(`/set/${listingSetIds[0]}`));
			firstSet = {
				setId: listingSetIds[0],
				count: posters.length,
				sample: posters.slice(0, 5).map((p) => ({ t: p.title, y: p.year, ty: p.type }))
			};
		}
	}
	return json({
		searchLen: searchHtml.length,
		results,
		match,
		listingSetIds: listingSetIds.slice(0, 10),
		firstSet
	});
};
