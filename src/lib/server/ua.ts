import { version } from '$lib/version';

/**
 * Outbound User-Agent strings, identifying PosterPilot to upstreams.
 *
 * API calls use the clean identifier. Scrape-protected sources (MediUX,
 * ThePosterDB) keep a browser-like prefix so they still pass bot filtering, with
 * our identifier appended so the source can see the traffic is from this tool.
 */

const REPO = 'https://github.com/diegopeixoto/posterpilot';

/** Clean identifying UA for API requests (Fanart.tv, GitHub, …). */
export const USER_AGENT = `PosterPilot/${version} (+${REPO})`;

/** Browser-like UA with the PosterPilot identifier appended, for scraping. */
export const BROWSER_USER_AGENT =
	`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ` +
	`(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 ${USER_AGENT}`;
