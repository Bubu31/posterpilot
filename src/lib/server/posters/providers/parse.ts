import { tmdbImageUrl } from '$lib/server/tmdb/metadata';
import type { TmdbMediaType } from '$lib/server/types';
import type { ArtworkSet } from './types';

/**
 * Pure response parsers for the artwork providers. Kept free of HTTP/config/$env
 * imports so they can be unit-tested in isolation; the provider objects own the
 * network calls and pass raw responses here.
 */

const MAX_PER_KIND = 20;

interface TmdbImage {
	file_path?: string;
	width?: number;
	height?: number;
}
interface TmdbImagesResponse {
	posters?: TmdbImage[];
	backdrops?: TmdbImage[];
}

/** Build a single TMDB set (posters + backdrops) from an images response. */
export function parseTmdbImages(json: unknown): ArtworkSet[] {
	const data = (json ?? {}) as TmdbImagesResponse;
	const posters = (data.posters ?? [])
		.slice(0, MAX_PER_KIND)
		.map((p) => ({
			url: tmdbImageUrl(p.file_path, 'w500'),
			width: p.width ?? null,
			height: p.height ?? null
		}))
		.filter(
			(p): p is { url: string; width: number | null; height: number | null } => p.url !== null
		)
		.map((p) => ({
			setId: 'tmdb',
			setAuthor: null,
			url: p.url,
			kind: 'poster' as const,
			season: null,
			episode: null,
			width: p.width,
			height: p.height
		}));
	const backdrops = (data.backdrops ?? [])
		.slice(0, MAX_PER_KIND)
		.map((b) => ({
			url: tmdbImageUrl(b.file_path, 'w1280'),
			width: b.width ?? null,
			height: b.height ?? null
		}))
		.filter(
			(b): b is { url: string; width: number | null; height: number | null } => b.url !== null
		)
		.map((b) => ({
			setId: 'tmdb',
			setAuthor: null,
			url: b.url,
			kind: 'background' as const,
			season: null,
			episode: null,
			width: b.width,
			height: b.height
		}));
	const candidates = [...posters, ...backdrops];
	return candidates.length ? [{ setId: 'tmdb', author: null, candidates }] : [];
}

interface FanartImage {
	url?: string;
	season?: string;
}
interface FanartResponse {
	movieposter?: FanartImage[];
	tvposter?: FanartImage[];
	moviebackground?: FanartImage[];
	showbackground?: FanartImage[];
	seasonposter?: FanartImage[];
}

/** Build a Fanart.tv set from the API response for the given media type. */
export function parseFanart(json: unknown, mediaType: TmdbMediaType): ArtworkSet[] {
	const d = (json ?? {}) as FanartResponse;
	const posterSrc = mediaType === 'tv' ? d.tvposter : d.movieposter;
	const bgSrc = mediaType === 'tv' ? d.showbackground : d.moviebackground;

	const mk = (imgs: FanartImage[] | undefined, kind: 'poster' | 'background' | 'season') =>
		(imgs ?? [])
			.filter((i) => Boolean(i.url))
			.map((i) => ({
				setId: 'fanarttv',
				setAuthor: null,
				url: i.url!,
				kind,
				season: kind === 'season' && i.season && /^\d+$/.test(i.season) ? Number(i.season) : null,
				episode: null
			}));

	const candidates = [
		...mk(posterSrc, 'poster'),
		...mk(bgSrc, 'background'),
		...(mediaType === 'tv' ? mk(d.seasonposter, 'season') : [])
	];
	return candidates.length ? [{ setId: 'fanarttv', author: null, candidates }] : [];
}

/** A matching title found on a ThePosterDB search-results page. */
export interface ThePosterDbSearchResult {
	/** The title's poster-collection page, e.g. https://theposterdb.com/posters/2578 */
	url: string;
	title: string;
	year: number | null;
}

// Search results link to each matching title's poster-collection page
// (theposterdb.com/posters/<id>) with the title/year as the link text; they no longer
// embed poster images directly (see parseThePosterDbAssets below).
const SEARCH_RESULT_RE =
	/href="(https:\/\/theposterdb\.com\/posters\/\d+)"[\s\S]{0,300}?<strong>([^<]+)<\/strong>\s*(?:\((\d{4})\))?/g;

/** Extract matching titles (with their poster-collection page URL) from a search page. */
export function parseThePosterDbSearchResults(html: string): ThePosterDbSearchResult[] {
	const results: ThePosterDbSearchResult[] = [];
	const seen = new Set<string>();
	for (const match of html.matchAll(SEARCH_RESULT_RE)) {
		const [, url, rawTitle, rawYear] = match;
		if (seen.has(url)) continue;
		seen.add(url);
		results.push({
			url,
			title: rawTitle.trim(),
			year: rawYear ? Number(rawYear) : null
		});
	}
	return results;
}

// A title's poster-collection page serves real images from this CDN path once
// authenticated; anonymous requests get a `missing_poster.jpg` placeholder instead. Used
// as a fallback below if the per-card structure changes shape and CARD_RE stops matching.
const ASSET_RE =
	/https:\/\/images\.theposterdb\.com\/prod\/public\/images\/posters\/optimized\/(?:movies|shows)\/\d+\/[A-Za-z0-9_-]+\.(?:webp|jpe?g|png)/g;

// Each card on a title's poster-collection page is one contributor's poster for that
// title: a <picture> with webp + jpeg <source> variants of the same image (only the webp
// is captured here — matching both would report the same poster twice, which is exactly
// the "duplicate" images this used to produce), a numeric poster id, an "uploaded by
// <user>" byline, and a link to that contributor's set. The setId is that contributor's
// real ThePosterDB set id (theposterdb.com/set/<id>), not the individual poster id: a
// creator's set is often one consistent design spanning a whole franchise (e.g. one set
// covering Batman Begins + The Dark Knight + The Dark Knight Rises), and reusing the real
// set id — instead of a per-poster one — is what lets the app's cross-title "suggested
// visual family" grouping (see collections/suggestions.ts, exact_set identity) recognize
// that same set across multiple collection members, the same way it already does for
// MediUX sets. Bounded lookaheads (rather than unbounded `[\s\S]*?`) keep a malformed or
// missing field on one card from binding to the next card's data instead of just failing
// to match.
const CARD_RE =
	/<source class="w-100 rounded-poster" type="image\/webp" srcset="(https:\/\/images\.theposterdb\.com\/prod\/public\/images\/posters\/optimized\/(?:movies|shows)\/\d+\/[A-Za-z0-9_-]+\.webp)">[\s\S]{0,1500}?data-poster-id='(\d+)'[\s\S]{0,600}?uploaded-by[^>]*>by <a href="https:\/\/theposterdb\.com\/user\/[^"]+">([^<]+)<\/a>[\s\S]{0,600}?href="https:\/\/theposterdb\.com\/set\/(\d+)"/g;

/** One poster on a ThePosterDB collection-set page ("More Posters From This Set"). */
export interface ThePosterDbSetPoster {
	/** Numeric poster id (data-poster-id / the download-asset id). */
	posterId: string;
	/** movie → a franchise member; collection → the collection entity's own poster. */
	type: 'movie' | 'collection' | 'show';
	url: string;
	/** Title text on the card, minus the trailing "(YYYY)" when present. */
	title: string;
	year: number | null;
	/** The contributor set id (theposterdb.com/set/<id>), shared by every card. */
	setId: string;
}

// A collection-set page lists one poster per franchise film plus (usually) one
// collection-type poster for the collection entity. Each card carries the film title +
// year, the poster type, the asset URL, and the shared set id — everything needed to map
// a set poster onto the matching collection member. Note this markup differs from a
// title page's cards (double-quoted data-poster-id, a data-poster-type attribute), which
// is why CARD_RE above does not match here and a dedicated parser is required. Bounded
// lookaheads keep a malformed card from binding to the next card's fields.
// Attribute quoting differs by page: a browser-saved copy normalizes to double quotes,
// but the live server markup uses single quotes on data-poster-id / data-poster-type —
// so match either with ['"].
const SET_CARD_RE =
	/type="image\/webp" srcset="(https:\/\/images\.theposterdb\.com\/prod\/public\/images\/posters\/optimized\/(?:movies|shows|collections)\/\d+\/[A-Za-z0-9_-]+\.webp)">[\s\S]{0,800}?data-poster-id=['"](\d+)['"] data-poster-type=['"](movie|collection|show)['"][\s\S]{0,400}?<p class="p-0 mb-1 text-break">([^<]+)<\/p>[\s\S]{0,600}?href="https:\/\/theposterdb\.com\/set\/(\d+)"/g;

/** Split a card title like "Cash Out (2024)" into name + year (year null when absent). */
function splitTitleYear(raw: string): { title: string; year: number | null } {
	const trimmed = raw.trim();
	const m = /^(.*\S)\s*\((\d{4})\)$/.exec(trimmed);
	return m ? { title: m[1].trim(), year: Number(m[2]) } : { title: trimmed, year: null };
}

/** Extract every poster (with its film title/year and type) from a ThePosterDB set page. */
export function parseThePosterDbSet(html: string): ThePosterDbSetPoster[] {
	const posters: ThePosterDbSetPoster[] = [];
	const seen = new Set<string>();
	for (const [, url, posterId, type, rawTitle, setId] of html.matchAll(SET_CARD_RE)) {
		if (seen.has(posterId)) continue;
		seen.add(posterId);
		const { title, year } = splitTitleYear(rawTitle);
		posters.push({ posterId, type: type as ThePosterDbSetPoster['type'], url, title, year, setId });
	}
	return posters;
}

/** Extract real poster asset URLs (grouped by contributor set) from a ThePosterDB title page. */
export function parseThePosterDbAssets(html: string): ArtworkSet[] {
	const seenPosterIds = new Set<string>();
	const sets: ArtworkSet[] = [];
	for (const [, url, posterId, rawAuthor, tpdbSetId] of html.matchAll(CARD_RE)) {
		// The same poster can appear more than once when a card has linked/related sets.
		if (seenPosterIds.has(posterId)) continue;
		seenPosterIds.add(posterId);
		const setId = `theposterdb-${tpdbSetId}`;
		const author = rawAuthor.trim();
		sets.push({
			setId,
			author,
			candidates: [{ setId, setAuthor: author, url, kind: 'poster', season: null, episode: null }]
		});
	}
	if (sets.length) return sets;

	const urls = Array.from(new Set(html.match(ASSET_RE) ?? []));
	if (!urls.length) return [];
	const candidates = urls.map((url) => ({
		setId: 'theposterdb',
		setAuthor: null,
		url,
		kind: 'poster' as const,
		season: null,
		episode: null
	}));
	return [{ setId: 'theposterdb', author: null, candidates }];
}
