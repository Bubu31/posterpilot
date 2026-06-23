import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelJob } from '$lib/server/jobs/runner';

export const POST: RequestHandler = async ({ params }) => {
	cancelJob(Number(params.id));
	return json({ ok: true });
};
