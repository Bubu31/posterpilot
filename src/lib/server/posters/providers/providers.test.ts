import { describe, expect, it } from 'vitest';
import {
	parseTmdbImages,
	parseFanart,
	parseThePosterDbAssets,
	parseThePosterDbSearchResults
} from './parse';

describe('parseTmdbImages', () => {
	it('builds poster + backdrop candidates in one set', () => {
		const sets = parseTmdbImages({
			posters: [{ file_path: '/p.jpg' }],
			backdrops: [{ file_path: '/b.jpg' }]
		});
		expect(sets).toHaveLength(1);
		const c = sets[0].candidates;
		expect(c.find((x) => x.kind === 'poster')?.url).toBe('https://image.tmdb.org/t/p/w500/p.jpg');
		expect(c.find((x) => x.kind === 'background')?.url).toBe(
			'https://image.tmdb.org/t/p/w1280/b.jpg'
		);
		expect(c.every((x) => x.setId === 'tmdb')).toBe(true);
	});

	it('returns [] when there are no images', () => {
		expect(parseTmdbImages({})).toEqual([]);
		expect(parseTmdbImages({ posters: [], backdrops: [] })).toEqual([]);
	});
});

describe('parseFanart', () => {
	it('maps movie posters and backgrounds', () => {
		const sets = parseFanart(
			{ movieposter: [{ url: 'http://f/p.png' }], moviebackground: [{ url: 'http://f/b.png' }] },
			'movie'
		);
		const c = sets[0].candidates;
		expect(c.find((x) => x.kind === 'poster')?.url).toBe('http://f/p.png');
		expect(c.find((x) => x.kind === 'background')?.url).toBe('http://f/b.png');
	});

	it('maps tv posters, backgrounds, and season posters', () => {
		const sets = parseFanart(
			{
				tvposter: [{ url: 'http://f/tp.png' }],
				showbackground: [{ url: 'http://f/sb.png' }],
				seasonposter: [
					{ url: 'http://f/s1.png', season: '1' },
					{ url: 'http://f/all.png', season: 'all' }
				]
			},
			'tv'
		);
		const c = sets[0].candidates;
		expect(c.find((x) => x.kind === 'poster')?.url).toBe('http://f/tp.png');
		const seasons = c.filter((x) => x.kind === 'season');
		expect(seasons.find((x) => x.url.endsWith('s1.png'))?.season).toBe(1);
		expect(seasons.find((x) => x.url.endsWith('all.png'))?.season).toBeNull();
	});

	it('ignores movie keys for tv and vice versa', () => {
		expect(parseFanart({ movieposter: [{ url: 'x' }] }, 'tv')).toEqual([]);
	});

	it('returns [] for an empty response', () => {
		expect(parseFanart({}, 'movie')).toEqual([]);
	});
});

describe('parseThePosterDbAssets', () => {
	const assetA =
		'https://images.theposterdb.com/prod/public/images/posters/optimized/movies/2578/psOBkRYwJVfMjLXtMQ9YJ36aOekJPMWs9Vv7PL0P.webp';
	const assetB =
		'https://images.theposterdb.com/prod/public/images/posters/optimized/movies/2578/anotherFileNameHere1234.jpg';

	// Two genuine cards taken from a real (authenticated) ThePosterDB title page — a
	// <picture> with webp + jpeg <source> variants of the same poster, a numeric
	// data-poster-id, an "uploaded by <user>" byline, and a link to that user's set.
	function realCard(posterId: string, fileName: string, author: string, setId: string): string {
		return `
			<div class="col-6 col-lg-2 p-1">
			<div class="hovereffect rounded-poster">
				<picture>
					<source class="w-100 rounded-poster" type="image/webp" srcset="https://images.theposterdb.com/prod/public/images/posters/optimized/movies/3624/${fileName}.webp">
					<source class="w-100 rounded-poster" type="image/jpeg" srcset="https://images.theposterdb.com/prod/public/images/posters/optimized/movies/3624/${fileName}.jpg">
					<img class="w-100 rounded-poster tpdb-poster" loading="lazy" src="/images/defaults/missing_poster.jpg">
				</picture>
				<div class="overlay rounded-poster" data-poster-id='${posterId}' data-poster-type='movie'>
					<div class="row m-0 h-100 p-3">
						<div class="col-11 p-0 pr-1 poster-title-correction">
							<p class="p-0 mb-1 text-break">Final Destination (2000)</p>
							<p class="uploaded-by text-white d-inline-block text-truncate w-100">by <a href="https://theposterdb.com/user/${author}">${author}</a></p>
						</div>
						<div class="col-1 p-0 d-flex flex-column align-items-center">
							<a href="https://theposterdb.com/set/${setId}" class="badge badge-pill badge-primary mt-2 set_poster_count" title="Posters in Set">7</a>
						</div>
					</div>
				</div>
			</div>
			</div>`;
	}

	it('groups real cards by contributor set and takes only the webp variant', () => {
		const html =
			realCard('883', 'lbzoHxi7bDQ3b6Ly3XK9wolkosbPhx2CPHQEj6Fg', 'cinemoire', '254') +
			realCard('165947', '5zbUrqku3HOP6KCrXStZsgiV240EMAbnpMHRfIcV', 'XDM', '101438');
		const sets = parseThePosterDbAssets(html);
		expect(sets).toHaveLength(2);
		expect(sets.map((s) => s.author)).toEqual(['cinemoire', 'XDM']);
		// One candidate per set (the webp source only — not also the jpeg variant of the
		// same poster, which is what previously showed up as a visual duplicate).
		expect(sets.every((s) => s.candidates.length === 1)).toBe(true);
		expect(sets[0].candidates[0].url).toBe(
			'https://images.theposterdb.com/prod/public/images/posters/optimized/movies/3624/lbzoHxi7bDQ3b6Ly3XK9wolkosbPhx2CPHQEj6Fg.webp'
		);
		expect(sets[0].candidates[0].setAuthor).toBe('cinemoire');
	});

	it('falls back to a flat unattributed scrape when the card structure does not match', () => {
		const html = `<img class="tpdb-poster" src="${assetA}">
			<img class="tpdb-poster" src="${assetB}">
			<a href="${assetA}">dup</a>`;
		const sets = parseThePosterDbAssets(html);
		expect(sets[0].candidates.map((c) => c.url)).toEqual([assetA, assetB]);
		expect(sets[0].candidates.every((c) => c.kind === 'poster')).toBe(true);
		expect(sets[0].author).toBeNull();
	});

	it('ignores the anonymous placeholder image', () => {
		const html = `<img class="tpdb-poster" src="/images/defaults/missing_poster.jpg">`;
		expect(parseThePosterDbAssets(html)).toEqual([]);
	});

	it('returns [] when no assets are present', () => {
		expect(parseThePosterDbAssets('<html>nothing</html>')).toEqual([]);
	});
});

describe('parseThePosterDbSearchResults', () => {
	it('extracts title, year and the poster-collection page URL, de-duplicated', () => {
		const html = `
			<div class="col-12 col-md-4 p-1">
				<div class="btn-group d-flex flex-row">
					<a class="btn btn-dark-lighter" href="https://theposterdb.com/posters/2578">
						<strong>Batman Begins</strong> (2005)
					</a>
				</div>
			</div>
			<div class="col-12 col-md-4 p-1">
				<div class="btn-group d-flex flex-row">
					<a class="btn btn-dark-lighter" href="https://theposterdb.com/posters/2168448">
						<strong>Batman: Operation Hamlet</strong> (2024)
					</a>
				</div>
			</div>
			<div class="col-12 col-md-4 p-1">
				<div class="btn-group d-flex flex-row">
					<a class="btn btn-dark-lighter" href="https://theposterdb.com/posters/2578">
						<strong>Batman Begins</strong> (2005)
					</a>
				</div>
			</div>`;
		expect(parseThePosterDbSearchResults(html)).toEqual([
			{ url: 'https://theposterdb.com/posters/2578', title: 'Batman Begins', year: 2005 },
			{
				url: 'https://theposterdb.com/posters/2168448',
				title: 'Batman: Operation Hamlet',
				year: 2024
			}
		]);
	});

	it('returns [] when no results are present', () => {
		expect(parseThePosterDbSearchResults('<html>no results</html>')).toEqual([]);
	});
});
