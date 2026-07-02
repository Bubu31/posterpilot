/**
 * Library sort options as a pure, $env-free module so the config layer and
 * tests can share them without pulling in the DB-backed query module.
 */
export const LIBRARY_SORTS = ['title', 'year', 'rating', 'runtime', 'recent', 'added'] as const;

/** Sort orders offered by the library grid. */
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export type SortDir = 'asc' | 'desc';

/** The natural default direction for a sort field (title ascends; the rest descend). */
export function defaultSortDir(sort: LibrarySort | undefined): SortDir {
	return sort === 'title' || sort === undefined ? 'asc' : 'desc';
}

/** Parse a library sort name, falling back to `title` for absent/unknown values. */
export function parseLibrarySort(value: string | undefined | null): LibrarySort {
	const v = value?.trim().toLowerCase();
	return (LIBRARY_SORTS as readonly string[]).includes(v ?? '') ? (v as LibrarySort) : 'title';
}
