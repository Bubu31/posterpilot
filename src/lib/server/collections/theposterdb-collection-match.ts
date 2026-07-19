import type { ThePosterDbSetPoster } from '$lib/server/posters/providers/parse';

export interface CollectionMemberRef {
	mediaItemId: number;
	title: string;
	year: number | null;
}

export interface SetMemberMatch {
	mediaItemId: number;
	posterId: string;
	url: string;
}

export interface ThePosterDbCollectionSet {
	setId: string;
	/** Poster for the collection entity itself (type=collection), when the set has one. */
	collectionPosterUrl: string | null;
	/** One set poster mapped onto each matched collection member film. */
	matches: SetMemberMatch[];
}

/** Fold accents, drop punctuation, collapse spaces — so "Cash Out" == "cash out". */
export function normalizeTitle(value: string): string {
	return value
		.toLocaleLowerCase('en-US')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Map a set's `movie` posters onto collection members by normalized title, using the
 * year only to disambiguate when several members share a title. Each member is matched
 * at most once; the collection-type poster (if any) is returned separately for the
 * collection entity's own artwork. Pure — no IO — so it is unit-tested directly.
 */
export function matchThePosterDbSetToMembers(
	posters: ThePosterDbSetPoster[],
	members: CollectionMemberRef[]
): Omit<ThePosterDbCollectionSet, 'setId'> {
	const collectionPoster = posters.find((p) => p.type === 'collection') ?? null;
	const byTitle = new Map<string, CollectionMemberRef[]>();
	for (const member of members) {
		const key = normalizeTitle(member.title);
		if (!key) continue;
		(byTitle.get(key) ?? byTitle.set(key, []).get(key)!).push(member);
	}

	const usedMembers = new Set<number>();
	const matches: SetMemberMatch[] = [];
	for (const poster of posters) {
		if (poster.type !== 'movie') continue;
		const group = byTitle.get(normalizeTitle(poster.title));
		if (!group) continue;
		// Prefer an exact-year member, else the first title match, skipping members already
		// claimed by an earlier poster.
		const pick =
			(poster.year !== null
				? group.find((m) => m.year === poster.year && !usedMembers.has(m.mediaItemId))
				: undefined) ?? group.find((m) => !usedMembers.has(m.mediaItemId));
		if (!pick) continue;
		usedMembers.add(pick.mediaItemId);
		matches.push({ mediaItemId: pick.mediaItemId, posterId: poster.posterId, url: poster.url });
	}

	return { collectionPosterUrl: collectionPoster?.url ?? null, matches };
}
