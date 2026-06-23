import { describe, it, expect } from 'vitest';
import { extractSetLinks, extractNextPayload, parseSetCandidates } from './parser';
import type { MediuxCandidate } from '$lib/server/types';

/**
 * Build a `<script>self.__next_f.push(...)</script>` chunk the way mediux.pro
 * (Next.js streaming) emits it: the push argument's string literal encodes
 * `"<index>:<json-array>"`, where the meaningful data sits at array index 3.
 *
 * We construct it by JSON-encoding twice so escaping matches the real payload,
 * which `extractNextPayload` must reverse via its double-parse.
 */
function makePushScript(streamIndex: string, dataAtIndex3: unknown): string {
	const innerArray = [streamIndex, null, null, dataAtIndex3];
	// First encode the inner streaming array, then prefix the stream index and
	// encode the whole thing as a single string literal (the push argument).
	const literal = JSON.stringify(`${streamIndex}:${JSON.stringify(innerArray)}`);
	return `<script>self.__next_f.push([1,${literal}])</script>`;
}

/** A set payload exercising poster / backdrop / season / title_card files. */
const SET_PAYLOAD = {
	set: {
		id: '777',
		user_created: { username: 'creator' },
		files: [
			{ id: 'poster-file', fileType: 'poster', show_id: { id: '42' }, title: 'Main Poster' },
			{ id: 'backdrop-file', fileType: 'backdrop', show_id: '42', title: 'Backdrop' },
			{
				id: 'season-file',
				fileType: 'poster',
				show_id: { id: '42' },
				season_id: { id: '9001' },
				title: 'Season 2'
			},
			{
				id: 'titlecard-file',
				fileType: 'title_card',
				show_id: { id: '42' },
				title: 'S02 E05 — The One'
			},
			// No show/movie ref -> must be skipped.
			{ id: 'orphan-file', fileType: 'poster', title: 'Orphan' },
			// Sentinel ref id -> must be skipped.
			{ id: 'sentinel-file', fileType: 'poster', show_id: '0', title: 'Sentinel' }
		]
	}
};

const SET_PAGE_HTML = `<!doctype html><html><head></head><body>
<script>self.__next_f.push([0,"some bootstrap noise"])</script>
${makePushScript('a', SET_PAYLOAD)}
</body></html>`;

describe('extractSetLinks', () => {
	it('returns set ids newest-first (reverse of document order), de-duplicated', () => {
		const html = `
			<a href="/sets/100" class="x">First</a>
			<a href="/sets/200">Second</a>
			<a data-y href="/sets/300">Third</a>
			<a href="/sets/200">Duplicate of second</a>
		`;
		expect(extractSetLinks(html)).toEqual(['300', '200', '100']);
	});

	it('returns an empty array when there are no set links', () => {
		expect(extractSetLinks('<div>nothing here</div>')).toEqual([]);
	});
});

describe('extractNextPayload', () => {
	it('decodes the embedded Next.js payload (double-parse + index-3 selection)', () => {
		const payload = extractNextPayload(SET_PAGE_HTML);
		expect(payload).toEqual(SET_PAYLOAD);
	});

	it('throws when no parseable data payload is present', () => {
		const html = '<html><body><script>self.__next_f.push([0,"no data"])</script></body></html>';
		expect(() => extractNextPayload(html)).toThrow();
	});

	it('throws on malformed (truncated) push payloads', () => {
		const html = '<html><body><script>self.__next_f.push(["files broken</body></html>';
		expect(() => extractNextPayload(html)).toThrow();
	});
});

describe('parseSetCandidates', () => {
	it('maps poster/background/season/title_card files to candidates with absolute urls', () => {
		const payload = extractNextPayload(SET_PAGE_HTML);
		const candidates = parseSetCandidates(payload, '777');

		const expected: MediuxCandidate[] = [
			{
				setId: '777',
				url: 'https://api.mediux.pro/assets/poster-file',
				kind: 'poster',
				season: null,
				episode: null
			},
			{
				setId: '777',
				url: 'https://api.mediux.pro/assets/backdrop-file',
				kind: 'background',
				season: null,
				episode: null
			},
			{
				setId: '777',
				url: 'https://api.mediux.pro/assets/season-file',
				kind: 'season',
				season: 2,
				episode: null
			},
			{
				setId: '777',
				url: 'https://api.mediux.pro/assets/titlecard-file',
				kind: 'title_card',
				season: 2,
				episode: 5
			}
		];
		expect(candidates).toEqual(expected);
	});

	it('skips files lacking any show/movie reference and sentinel ids', () => {
		const payload = extractNextPayload(SET_PAGE_HTML);
		const urls = parseSetCandidates(payload, '777').map((c) => c.url);
		expect(urls).not.toContain('https://api.mediux.pro/assets/orphan-file');
		expect(urls).not.toContain('https://api.mediux.pro/assets/sentinel-file');
	});

	it('returns [] for a payload with the wrong shape (no crash)', () => {
		expect(parseSetCandidates({ nope: true }, 's')).toEqual([]);
		expect(parseSetCandidates(null, 's')).toEqual([]);
		expect(parseSetCandidates({ set: { files: 'not-an-array' } }, 's')).toEqual([]);
	});

	it('end-to-end: malformed page parses to nothing without throwing through parseSetCandidates', () => {
		// Mirrors the scraper's skip-and-continue: extractNextPayload throws, the
		// caller swallows it, and the effective result is an empty candidate list.
		const html = '<html><body>no next payload at all</body></html>';
		let candidates: MediuxCandidate[];
		try {
			candidates = parseSetCandidates(extractNextPayload(html), 's');
		} catch {
			candidates = [];
		}
		expect(candidates).toEqual([]);
	});
});
