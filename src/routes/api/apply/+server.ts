import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enqueueJob } from '$lib/server/jobs/runner';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as {
		itemIds?: number[];
		method?: 'plex' | 'kometa' | 'both';
		selection?: 'auto' | 'stored';
	};
	if (!body.itemIds?.length) throw error(400, 'itemIds is required');
	const jobId = await enqueueJob({
		kind: 'apply',
		itemIds: body.itemIds,
		method: body.method ?? 'both',
		selection: body.selection ?? 'auto'
	});
	return json({ jobId });
};
