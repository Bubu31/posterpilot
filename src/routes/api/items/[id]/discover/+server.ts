import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { discoverForItem } from '$lib/server/posters/service';
import { getItemDetail, getMediaItem } from '$lib/server/queries';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'invalid id');
	const item = await getMediaItem(id);
	if (!item) throw error(404, 'item not found');

	const body = (await request.json().catch(() => ({}))) as { forceRefresh?: boolean };
	const config = await resolveConfig();
	const count = await discoverForItem(item, config, { forceRefresh: body.forceRefresh });
	const detail = await getItemDetail(id);
	return json({ count, candidates: detail?.candidates ?? [] });
};
