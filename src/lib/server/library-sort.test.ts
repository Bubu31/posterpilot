import { describe, expect, it } from 'vitest';
import { LIBRARY_SORTS, defaultSortDir, parseLibrarySort } from './library-sort';

describe('parseLibrarySort', () => {
	it('accepts every known sort value', () => {
		for (const sort of LIBRARY_SORTS) {
			expect(parseLibrarySort(sort)).toBe(sort);
		}
	});

	it('normalizes case and whitespace', () => {
		expect(parseLibrarySort(' Added ')).toBe('added');
		expect(parseLibrarySort('RATING')).toBe('rating');
	});

	it('falls back to title for unknown, empty, or absent values', () => {
		expect(parseLibrarySort('popularity')).toBe('title');
		expect(parseLibrarySort('')).toBe('title');
		expect(parseLibrarySort(undefined)).toBe('title');
		expect(parseLibrarySort(null)).toBe('title');
	});
});

describe('defaultSortDir', () => {
	it('ascends for title and unset, descends for the rest', () => {
		expect(defaultSortDir('title')).toBe('asc');
		expect(defaultSortDir(undefined)).toBe('asc');
		expect(defaultSortDir('year')).toBe('desc');
		expect(defaultSortDir('rating')).toBe('desc');
		expect(defaultSortDir('runtime')).toBe('desc');
		expect(defaultSortDir('recent')).toBe('desc');
		expect(defaultSortDir('added')).toBe('desc');
	});
});
