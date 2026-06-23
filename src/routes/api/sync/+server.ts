import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enqueueJob } from '$lib/server/jobs/runner';

export const POST: RequestHandler = async () => {
	const jobId = await enqueueJob({ kind: 'sync' });
	return json({ jobId });
};
