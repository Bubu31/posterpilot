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

	it('extracts and de-duplicates real asset URLs', () => {
		const html = `<img class="tpdb-poster" src="${assetA}">
			<img class="tpdb-poster" src="${assetB}">
			<a href="${assetA}">dup</a>`;
		const sets = parseThePosterDbAssets(html);
		expect(sets[0].candidates.map((c) => c.url)).toEqual([assetA, assetB]);
		expect(sets[0].candidates.every((c) => c.kind === 'poster')).toBe(true);
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
