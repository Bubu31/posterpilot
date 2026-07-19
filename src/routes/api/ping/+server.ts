import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { fetchText } from '$lib/server/http';
import { BROWSER_USER_AGENT } from '$lib/server/ua';
import { getThePosterDbSession } from '$lib/server/posters/providers/theposterdb-session';

// ponytail: temporary build-freshness + TPDb-search probe — remove once diagnosed.
export const GET: RequestHandler = async ({ url }) => {
	const term = url.searchParams.get('tpdb');
	if (!term) return json({ build: '6100ad4-ping' });
	const config = await resolveConfig();
	const cookie = await getThePosterDbSession(
		config.thePosterDbUsername,
		config.thePosterDbPassword
	);
	if (!cookie) return json({ error: 'no_session' });
	const html = await fetchText(
		`https://theposterdb.com/search?term=${encodeURIComponent(term)}&section=collections`,
		{ headers: { 'User-Agent': BROWSER_USER_AGENT, Accept: 'text/html', Cookie: cookie }, retries: 1 }
	);
	// Return only the anchors so we can see how collection results are linked.
	const anchors = Array.from(html.matchAll(/<a[^>]+href="([^"]*(?:poster|collection)[^"]*)"[^>]*>/gi))
		.map((m) => m[1])
		.slice(0, 40)
		.join('\n');
	return text(`len=${html.length}\n---anchors---\n${anchors}`);
};
