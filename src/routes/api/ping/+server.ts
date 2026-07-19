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
	const slices = Array.from(html.matchAll(/posters\/\d+/g))
		.slice(0, 3)
		.map((m) => html.slice(Math.max(0, m.index! - 40), m.index! + 320));
	return text(`len=${html.length}\n---result slices---\n${slices.join('\n\n=====\n\n')}`);
};
