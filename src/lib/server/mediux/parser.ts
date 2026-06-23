/**
 * Pure extraction helpers for MediaUX (mediux.pro) pages.
 *
 * These functions parse the embedded Next.js streaming payload found in the HTML
 * of mediux.pro listing and set pages. They are intentionally free of any
 * network / environment / database dependencies so they can be unit-tested in
 * isolation and reused by the network orchestration layer in `scraper.ts`.
 *
 * The extraction mirrors the legacy Python scraper (`find_mediux_sets`,
 * `extract_json_segment`, `generate_yaml_from_set_data`): mediux.pro embeds its
 * data as `<script>self.__next_f.push([...])</script>` chunks, each of which is
 * a JSON-encoded string of the form `"<index>:<json-array>"`. Asset files are
 * referenced by id and served from `https://api.mediux.pro/assets/<file_id>`.
 */

import type { MediuxCandidate } from '$lib/server/types';

const ASSET_BASE = 'https://api.mediux.pro/assets';

/** Matches `<a ... href="/sets/<id>" ...>` anchors, capturing the numeric id. */
const SET_LINK_RE = /<a\b[^>]*\bhref="\/sets\/(\d+)"[^>]*>/g;

/** Matches each `<script>self.__next_f.push(<payload>)</script>` chunk. */
const NEXT_PUSH_RE = /<script>self\.__next_f\.push\((.*?)\)<\/script>/gs;

/**
 * Extract MediaUX set ids from a listing page's HTML.
 *
 * Scans for `<a href="/sets/<id>">` anchors. Results are de-duplicated and
 * returned newest-first (the reverse of document order), matching the legacy
 * behavior where the list is inverted before use.
 *
 * @param html Raw HTML of a mediux.pro movie or show page.
 * @returns Set ids, newest-first and de-duplicated.
 */
export function extractSetLinks(html: string): string[] {
	const ordered: string[] = [];
	const seen = new Set<string>();
	for (const match of html.matchAll(SET_LINK_RE)) {
		const id = match[1];
		if (!seen.has(id)) {
			seen.add(id);
			ordered.push(id);
		}
	}
	// Newest-first: reverse document order.
	return ordered.reverse();
}

/** Heuristic: a payload chunk worth parsing references set/show/file data. */
function isDataChunk(chunk: string): boolean {
	return (
		chunk.includes('set_description') ||
		chunk.includes('original_name') ||
		chunk.includes('show') ||
		chunk.includes('files')
	);
}

/**
 * Decode a single `__next_f.push(...)` chunk into its inner JSON value.
 *
 * Each chunk is a JS argument list whose first string literal encodes
 * `"<index>:<json>"`. We isolate that string literal (first quote to last
 * quote), JSON-parse it once to unescape, split off the leading `<index>:`,
 * then JSON-parse the remainder into the streaming array. The meaningful data
 * sits at index 3 of that array (mirroring the legacy `json_data[3]`).
 *
 * @returns The decoded value at array index 3, or null when the chunk does not
 *   match the expected shape.
 */
function decodeChunk(chunk: string): unknown {
	const begin = chunk.indexOf('"');
	const end = chunk.lastIndexOf('"');
	if (begin === -1 || end === -1 || begin >= end) return null;

	let outer: unknown;
	try {
		outer = JSON.parse(chunk.slice(begin, end + 1));
	} catch {
		return null;
	}
	if (typeof outer !== 'string') return null;

	const colon = outer.indexOf(':');
	if (colon === -1) return null;

	let inner: unknown;
	try {
		inner = JSON.parse(outer.slice(colon + 1));
	} catch {
		return null;
	}
	if (!Array.isArray(inner) || inner.length < 4) return null;
	return inner[3];
}

/** Type guard: a plain (non-array) object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when a decoded payload carries the set/files data we care about. */
function hasSetData(value: unknown): boolean {
	return isRecord(value) && ('set' in value || 'files' in value);
}

/**
 * Extract and JSON-parse the embedded Next.js data payload from a set page.
 *
 * Replicates the legacy `extract_json_segment`: scan every `__next_f.push(...)`
 * chunk, keep the data-bearing ones, decode each (double JSON-parse + index-3
 * selection), and return the first decoded value that contains `set`/`files`.
 *
 * @param html Raw HTML of a mediux.pro set page.
 * @returns The decoded payload object (typically `{ set: {...} }`).
 * @throws Error when no parseable data payload is present.
 */
export function extractNextPayload(html: string): unknown {
	for (const match of html.matchAll(NEXT_PUSH_RE)) {
		const chunk = match[1];
		if (!isDataChunk(chunk)) continue;
		const decoded = decodeChunk(chunk);
		if (hasSetData(decoded)) return decoded;
	}
	throw new Error('No parseable MediaUX data payload found in HTML');
}

/** Build an absolute asset URL from a file id. */
function assetUrl(fileId: string): string {
	return `${ASSET_BASE}/${fileId}`;
}

/**
 * Normalize a `show_id` / `movie_id` field, which may be a bare id (string or
 * number) or an object `{ id }`. Returns the id as a string, or null when the
 * value is absent / a known sentinel ("None", "0").
 */
function normalizeRefId(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (isRecord(value)) {
		const inner = value['id'];
		if (inner === null || inner === undefined) return null;
		const s = String(inner);
		return s === '' || s === 'None' || s === '0' ? null : s;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		const s = String(value);
		return s === '' || s === 'None' || s === '0' ? null : s;
	}
	return null;
}

/** Pull the numeric season out of a title like "... Season 3". */
function parseSeason(title: string): number | null {
	const m = /Season (\d+)/.exec(title);
	return m ? Number.parseInt(m[1], 10) : null;
}

/** Pull season/episode out of a title-card title like "... S02 E05". */
function parseEpisode(title: string): { season: number; episode: number } | null {
	const m = /S(\d+) E(\d+)/.exec(title);
	if (!m) return null;
	return { season: Number.parseInt(m[1], 10), episode: Number.parseInt(m[2], 10) };
}

/**
 * Walk a decoded set payload and collect its artwork as candidates.
 *
 * Reads `payload.set.files[]` and classifies each file by `fileType` and the
 * presence of show/movie/season identifiers, mirroring the legacy
 * `generate_yaml_from_set_data` mapping:
 *
 * - `poster` attached to a show/movie -> `poster`
 * - `backdrop` -> `background`
 * - `poster` with a `season_id` (and a "Season N" title) -> `season`
 * - `title_card` (with an "Sxx Eyy" title) -> `title_card`
 *
 * Files without a valid id, or without any show/movie reference, are skipped.
 * The walk is defensive: malformed entries are ignored rather than thrown.
 *
 * @param payload Decoded payload from `extractNextPayload`.
 * @param setId The set id to stamp onto each produced candidate.
 * @returns Candidates with absolute asset URLs and season/episode where present.
 */
export function parseSetCandidates(payload: unknown, setId: string): MediuxCandidate[] {
	if (!isRecord(payload)) return [];
	const set = payload['set'];
	if (!isRecord(set)) return [];
	const files = set['files'];
	if (!Array.isArray(files)) return [];

	const candidates: MediuxCandidate[] = [];

	for (const raw of files) {
		if (!isRecord(raw)) continue;

		const fileId = raw['id'];
		if (fileId === null || fileId === undefined || String(fileId) === '') continue;
		const url = assetUrl(String(fileId));

		const fileType = typeof raw['fileType'] === 'string' ? raw['fileType'] : '';
		const title = typeof raw['title'] === 'string' ? raw['title'] : '';
		const showId = normalizeRefId(raw['show_id']);
		const movieId = normalizeRefId(raw['movie_id']);
		const hasSeason = raw['season_id'] !== null && raw['season_id'] !== undefined;

		// Skip files with no media association (parity with legacy skip).
		if (showId === null && movieId === null) continue;

		if (fileType === 'poster' && hasSeason) {
			const season = parseSeason(title);
			if (season !== null) {
				candidates.push({ setId, url, kind: 'season', season, episode: null });
			}
		} else if (fileType === 'poster') {
			candidates.push({ setId, url, kind: 'poster', season: null, episode: null });
		} else if (fileType === 'backdrop') {
			candidates.push({ setId, url, kind: 'background', season: null, episode: null });
		} else if (fileType === 'title_card') {
			const se = parseEpisode(title);
			if (se !== null) {
				candidates.push({
					setId,
					url,
					kind: 'title_card',
					season: se.season,
					episode: se.episode
				});
			}
		}
	}

	return candidates;
}
