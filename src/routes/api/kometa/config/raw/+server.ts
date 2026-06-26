import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadRaw, saveRaw } from '$lib/server/kometa/sync';

/** Read the current raw config.yml text (for the raw editor). */
export const GET: RequestHandler = async () => json(await loadRaw());

/** Validate + save raw config.yml text (atomic write + backup). */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as { text?: unknown };
	const text = typeof body.text === 'string' ? body.text : '';
	return json(await saveRaw(text));
};
