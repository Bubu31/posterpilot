import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { selectCandidate } from '$lib/server/posters/service';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'invalid id');
	const body = (await request.json().catch(() => ({}))) as {
		posterUrl?: string | null;
		backgroundUrl?: string | null;
	};
	await selectCandidate(id, body.posterUrl ?? null, body.backgroundUrl ?? null);
	return json({ ok: true });
};
