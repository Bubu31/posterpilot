import { describe, expect, it } from 'vitest';
import { parseFindResult, pickExternalId, tmdbAuth } from './auth';

describe('tmdbAuth', () => {
	it('treats a raw JWT (eyJ...) as a v4 bearer token via header', () => {
		const auth = tmdbAuth('eyJabc.def.ghi');
		expect(auth.headers).toEqual({
			Authorization: 'Bearer eyJabc.def.ghi',
			accept: 'application/json'
		});
		expect(auth.query).toBe('');
	});

	it('passes an already-prefixed "Bearer ..." credential through unchanged', () => {
		const auth = tmdbAuth('Bearer eyJabc.def.ghi');
		expect(auth.headers).toEqual({
			Authorization: 'Bearer eyJabc.def.ghi',
			accept: 'application/json'
		});
		expect(auth.query).toBe('');
	});

	it('treats a v3 API key as an api_key query parameter', () => {
		const auth = tmdbAuth('abc123def456');
		expect(auth.headers).toEqual({ accept: 'application/json' });
		expect(auth.headers.Authorization).toBeUndefined();
		expect(auth.query).toBe('api_key=abc123def456');
	});
});

describe('pickExternalId', () => {
	it('prefers tmdb over imdb and tvdb', () => {
		expect(
			pickExternalId({ tmdb: '603', imdb: 'tt0133093', tvdb: '12345' })
		).toEqual({ id: '603', source: 'tmdb' });
	});

	it('falls back to imdb when tmdb is absent', () => {
		expect(pickExternalId({ imdb: 'tt0133093', tvdb: '12345' })).toEqual({
			id: 'tt0133093',
			source: 'imdb_id'
		});
	});

	it('falls back to tvdb when only tvdb is present', () => {
		expect(pickExternalId({ tvdb: '12345' })).toEqual({
			id: '12345',
			source: 'tvdb_id'
		});
	});

	it('returns null when no GUID is present', () => {
		expect(pickExternalId({})).toBeNull();
	});
});

describe('parseFindResult', () => {
	it('resolves a movie-only result as type movie', () => {
		expect(parseFindResult({ movie_results: [{ id: 603 }], tv_results: [] })).toEqual({
			tmdbId: '603',
			mediaType: 'movie'
		});
	});

	it('resolves a tv-only result as type tv', () => {
		expect(parseFindResult({ movie_results: [], tv_results: [{ id: 1399 }] })).toEqual({
			tmdbId: '1399',
			mediaType: 'tv'
		});
	});

	it('prefers a movie match over a concurrent tv match', () => {
		expect(
			parseFindResult({ movie_results: [{ id: 603 }], tv_results: [{ id: 1399 }] })
		).toEqual({ tmdbId: '603', mediaType: 'movie' });
	});

	it('returns null when there are no results', () => {
		expect(parseFindResult({ movie_results: [], tv_results: [] })).toBeNull();
	});

	it('returns null for an empty / malformed payload', () => {
		expect(parseFindResult({})).toBeNull();
		expect(parseFindResult(null)).toBeNull();
	});

	it('coerces numeric ids to strings', () => {
		const res = parseFindResult({ movie_results: [{ id: 27205 }] });
		expect(res?.tmdbId).toBe('27205');
		expect(typeof res?.tmdbId).toBe('string');
	});
});
