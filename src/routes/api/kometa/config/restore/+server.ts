import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { restoreConfig } from '$lib/server/kometa/sync';

/** Restore a named backup over the current config.yml (backs up current first). */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as { name?: unknown };
	const name = typeof body.name === 'string' ? body.name : '';
	return json(await restoreConfig(name));
};
