import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enqueueJob } from '$lib/server/jobs/runner';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as {
		itemIds?: number[];
		forceRefresh?: boolean;
	};
	const jobId = await enqueueJob({
		kind: 'discover',
		itemIds: body.itemIds,
		forceRefresh: body.forceRefresh
	});
	return json({ jobId });
};
