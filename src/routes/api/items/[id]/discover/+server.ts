import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveConfig } from '$lib/server/config';
import { discoverForItem } from '$lib/server/posters/service';
import { getItemDetail, getMediaItem } from '$lib/server/queries';
import { getActiveServerInstance } from '$lib/server/server-instances';
import { logEvent } from '$lib/server/events';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'invalid id');
	const active = await getActiveServerInstance();
	if (!active) throw error(404, 'server instance not found');
	const item = await getMediaItem(id, active.id);
	if (!item) throw error(404, 'item not found');

	const body = (await request.json().catch(() => ({}))) as { forceRefresh?: boolean };
	const config = await resolveConfig();
	try {
		const count = await discoverForItem(item, config, { forceRefresh: body.forceRefresh });
		const detail = await getItemDetail(id, active.id);
		return json({ count, candidates: detail?.candidates ?? [] });
	} catch (err) {
		// Provider fetch/parse failure — report it without 500-ing the request. The UI
		// shows its own generic message, so no exception text crosses the API boundary.
		// Still log server-side so failures above the per-provider try/catch (e.g. a run-level
		// DB write) aren't completely silent.
		await logEvent('warn', 'discover', `Discovery request failed for item ${id}`, {
			mediaItemId: id,
			error: err instanceof Error ? err.message : String(err)
		});
		return json({ count: 0, candidates: [], error: 'discovery_failed' });
	}
};
