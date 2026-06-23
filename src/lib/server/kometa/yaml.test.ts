import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
	buildMetadataObject,
	mergeMetadata,
	toYaml,
	type KometaItemInput
} from './yaml';

describe('buildMetadataObject', () => {
	it('encodes poster-only items under metadata keyed by tmdb id', () => {
		const items: KometaItemInput[] = [
			{ tmdbId: '550', title: 'Fight Club', posterUrl: 'https://example.test/p/550.jpg' }
		];

		const obj = buildMetadataObject(items) as { metadata: Record<string, unknown> };

		expect(obj.metadata['550']).toEqual({ url_poster: 'https://example.test/p/550.jpg' });
		// No background key when none is provided.
		expect(obj.metadata['550']).not.toHaveProperty('url_background');
	});

	it('encodes poster + background', () => {
		const items: KometaItemInput[] = [
			{
				tmdbId: '603',
				title: 'The Matrix',
				posterUrl: 'https://example.test/p/603.jpg',
				backgroundUrl: 'https://example.test/b/603.jpg'
			}
		];

		const obj = buildMetadataObject(items) as { metadata: Record<string, unknown> };

		expect(obj.metadata['603']).toEqual({
			url_poster: 'https://example.test/p/603.jpg',
			url_background: 'https://example.test/b/603.jpg'
		});
	});

	it('omits urls that are null/undefined', () => {
		const items: KometaItemInput[] = [
			{ tmdbId: '1', title: 'No URLs', posterUrl: null, backgroundUrl: undefined }
		];

		const obj = buildMetadataObject(items) as { metadata: Record<string, unknown> };

		expect(obj.metadata['1']).toEqual({});
	});
});

describe('mergeMetadata', () => {
	it('updates an existing tmdb key in place rather than duplicating', () => {
		const existing = {
			metadata: {
				'550': { url_poster: 'https://old.test/550.jpg' }
			}
		};

		const merged = mergeMetadata(existing, [
			{ tmdbId: '550', title: 'Fight Club', posterUrl: 'https://new.test/550.jpg' }
		]) as { metadata: Record<string, unknown> };

		// Exactly one entry for that id, with the new URL.
		expect(Object.keys(merged.metadata)).toEqual(['550']);
		expect(merged.metadata['550']).toEqual({ url_poster: 'https://new.test/550.jpg' });
	});

	it('adds new entries while keeping existing ones', () => {
		const existing = {
			metadata: {
				'550': { url_poster: 'https://example.test/550.jpg' }
			}
		};

		const merged = mergeMetadata(existing, [
			{
				tmdbId: '603',
				title: 'The Matrix',
				posterUrl: 'https://example.test/603.jpg',
				backgroundUrl: 'https://example.test/603-bg.jpg'
			}
		]) as { metadata: Record<string, unknown> };

		expect(Object.keys(merged.metadata).sort()).toEqual(['550', '603']);
		expect(merged.metadata['550']).toEqual({ url_poster: 'https://example.test/550.jpg' });
		expect(merged.metadata['603']).toEqual({
			url_poster: 'https://example.test/603.jpg',
			url_background: 'https://example.test/603-bg.jpg'
		});
	});

	it('does not mutate the existing object', () => {
		const existing = {
			metadata: {
				'550': { url_poster: 'https://old.test/550.jpg' }
			}
		};

		mergeMetadata(existing, [
			{ tmdbId: '550', title: 'Fight Club', posterUrl: 'https://new.test/550.jpg' }
		]);

		expect(existing.metadata['550']).toEqual({ url_poster: 'https://old.test/550.jpg' });
	});

	it('initializes metadata when existing has none', () => {
		const merged = mergeMetadata({}, [
			{ tmdbId: '1', title: 'Solo', posterUrl: 'https://example.test/1.jpg' }
		]) as { metadata: Record<string, unknown> };

		expect(merged.metadata['1']).toEqual({ url_poster: 'https://example.test/1.jpg' });
	});

	it('preserves unrelated top-level keys', () => {
		const existing = { libraries: { Movies: {} }, metadata: {} };

		const merged = mergeMetadata(existing, [
			{ tmdbId: '1', title: 'Solo', posterUrl: 'https://example.test/1.jpg' }
		]) as { libraries: unknown; metadata: Record<string, unknown> };

		expect(merged.libraries).toEqual({ Movies: {} });
		expect(merged.metadata['1']).toEqual({ url_poster: 'https://example.test/1.jpg' });
	});
});

describe('toYaml', () => {
	it('round-trips buildMetadataObject output through the yaml parser', () => {
		const items: KometaItemInput[] = [
			{
				tmdbId: '603',
				title: 'The Matrix',
				posterUrl: 'https://example.test/p/603.jpg',
				backgroundUrl: 'https://example.test/b/603.jpg'
			},
			{ tmdbId: '550', title: 'Fight Club', posterUrl: 'https://example.test/p/550.jpg' }
		];

		const obj = buildMetadataObject(items);
		const yaml = toYaml(obj);
		const parsed = parse(yaml);

		expect(parsed).toEqual(obj);
	});
});
