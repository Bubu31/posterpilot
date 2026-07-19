import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { fetchText } from '$lib/server/http';
import { BROWSER_USER_AGENT } from '$lib/server/ua';
import { getThePosterDbSession } from '$lib/server/posters/providers/theposterdb-session';

// ponytail: temporary build-freshness + TPDb-search probe — remove once diagnosed.
export const GET: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get('path');
	if (!path) return json({ build: '6100ad4-ping' });
	const config = await resolveConfig();
	const cookie = await getThePosterDbSession(
		config.thePosterDbUsername,
		config.thePosterDbPassword
	);
	if (!cookie) return json({ error: 'no_session' });
	const html = await fetchText(`https://theposterdb.com${path}`, {
		headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html', Cookie: cookie },
		retries: 1
	});
	const setLinks = [
		...new Set(Array.from(html.matchAll(/theposterdb\.com\/set\/(\d+)/g)).map((m) => m[1]))
	];
	const titles = Array.from(html.matchAll(/<p class="p-0 mb-1 text-break">([^<]+)<\/p>/g))
		.map((m) => m[1])
		.slice(0, 30);
	return text(
		`len=${html.length}\n---set ids---\n${setLinks.join(', ')}\n---card titles---\n${titles.join('\n')}`
	);
};
