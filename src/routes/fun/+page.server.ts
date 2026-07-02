import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveConfig } from '$lib/server/config';
import { parsePickFilter } from '$lib/server/fun-pick';
import { listGenres, pickRandomItem } from '$lib/server/queries';

export const load: PageServerLoad = async ({ url }) => {
	const config = await resolveConfig();
	// Hiding the nav link is not a gate: direct requests 404 while Fun is off.
	if (!config.funEnabled) throw error(404, 'Not found');

	const filter = parsePickFilter(url.searchParams);
	// A pick only happens when requested (`pick` carries a nonce so re-rolls with
	// identical filters still produce a fresh navigation + draw).
	const picking = url.searchParams.has('pick');
	const [genres, picked] = await Promise.all([
		listGenres(),
		picking ? pickRandomItem(filter) : Promise.resolve(null)
	]);
	return { genres, filter, picked, picking };
};
