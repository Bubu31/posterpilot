import { and, eq, inArray } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { mediaItems } from '$lib/server/db/schema';
import { resolveConfig } from '$lib/server/config';
import { discoverForItem } from '$lib/server/posters/service';
import { PROVIDERS } from '$lib/server/posters/providers';
import { getCollection } from '$lib/server/collections/queries';
import { getActiveServerInstance } from '$lib/server/server-instances';
import { logEvent } from '$lib/server/events';

const KNOWN_PROVIDER_IDS: Set<string> = new Set(PROVIDERS.map((p) => p.id));

export const POST: RequestHandler = async ({ params, request }) => {
	const active = await getActiveServerInstance();
	if (!active) throw error(404, 'server instance not found');

	const collection = await getCollection(active.id, params.id);
	if (!collection) throw error(404, 'collection not found');

	const body = (await request.json().catch(() => ({}))) as {
		forceRefresh?: boolean;
		providers?: string[];
	};
	const providers = Array.isArray(body.providers)
		? body.providers.filter((p): p is string => KNOWN_PROVIDER_IDS.has(p))
		: undefined;

	const memberIds = collection.localMembers.map((member) => member.id);
	const items = memberIds.length
		? await db
				.select()
				.from(mediaItems)
				.where(and(eq(mediaItems.serverInstanceId, active.id), inArray(mediaItems.id, memberIds)))
		: [];

	const config = await resolveConfig();
	let succeeded = 0;
	let failed = 0;
	for (const item of items) {
		try {
			await discoverForItem(item, config, {
				forceRefresh: body.forceRefresh,
				providers
			});
			succeeded++;
		} catch (err) {
			// Skip a member that fails discovery; the rest continue — mirrors the
			// per-item try/catch used by the scheduled discovery job.
			failed++;
			await logEvent('warn', 'discover', `Collection discovery failed for "${item.title}"`, {
				title: item.title,
				serverInstanceId: active.id,
				mediaItemId: item.id,
				collectionId: params.id,
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}

	return json({ total: items.length, succeeded, failed });
};
