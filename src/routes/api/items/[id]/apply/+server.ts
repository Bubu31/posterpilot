import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { applyToItem } from '$lib/server/posters/service';
import { getMediaItem } from '$lib/server/queries';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'invalid id');
	const item = await getMediaItem(id);
	if (!item) throw error(404, 'item not found');

	const body = (await request.json().catch(() => ({}))) as {
		posterUrl?: string;
		backgroundUrl?: string | null;
		method?: 'plex' | 'kometa' | 'both';
	};
	const posterUrl = body.posterUrl ?? item.selectedPosterUrl;
	if (!posterUrl) throw error(400, 'no poster selected');

	const config = await resolveConfig();
	const outcomes = await applyToItem(item, {
		posterUrl,
		backgroundUrl: body.backgroundUrl ?? item.selectedBackgroundUrl,
		method: body.method ?? config.defaultApplyMethod,
		config
	});
	return json({ outcomes });
};
