import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemDetail } from '$lib/server/queries';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getItemDetail(Number(params.id));
	if (!detail) throw error(404, 'Item not found');
	return detail;
};
