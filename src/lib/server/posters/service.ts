import { dirname as posixDirname } from 'node:path/posix';
import { randomUUID } from 'node:crypto';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	appliedPosters,
	childSelections,
	mediaItems,
	posterCandidates,
	providerDiscoveryOutcomes,
	providerDiscoveryRuns,
	type MediaItem
} from '$lib/server/db/schema';
import type { AppConfig, ApplyMethod } from '$lib/server/config';
import { redact } from '$lib/server/config/redact';
import type { MediaServer, ServerChild } from '$lib/server/media-server';
import { resolveMediaServerInstance } from '$lib/server/server-instances';
import { writeKometaYaml, type KometaSeasonInput } from '$lib/server/kometa/yaml';
import { logEvent } from '$lib/server/events';
import { resolveChildOps, seasonsNeedingEpisodes, type StagedChildSlot } from './child-apply';
import { PROVIDERS } from './providers';
import { providerAvailability } from './providers/availability';
import { scorePoster } from './score';
import { getScoreWeights } from './score-weights';
import {
	selectAutomaticArtwork,
	type AutomaticArtworkSelection,
	type AutomaticSelectionInputs
} from './automatic-selection';

/**
 * Where posterpilot.yml is written: co-located with config.yml when Kometa
 * config sync is configured, otherwise the standalone assets directory.
 */
function kometaOutDir(config: AppConfig): string {
	return config.kometaConfigPath ? posixDirname(config.kometaConfigPath) : config.kometaAssetsDir;
}

/** Discover per provider without erasing last-known-good data when one source fails. */
export async function discoverForItem(
	item: MediaItem,
	config: AppConfig,
	opts?: { forceRefresh?: boolean; providers?: readonly string[] }
): Promise<number> {
	const requestedProviders = opts?.providers ? new Set(opts.providers) : null;
	const providers = requestedProviders
		? PROVIDERS.filter((provider) => requestedProviders.has(provider.id))
		: PROVIDERS;
	if (requestedProviders && providers.length !== requestedProviders.size) {
		throw new TypeError('discovery_provider_scope_invalid');
	}
	const runId = randomUUID();
	const startedAt = new Date();
	await db.insert(providerDiscoveryRuns).values({
		id: runId,
		serverInstanceId: item.serverInstanceId,
		mediaItemId: item.id,
		tmdbId: item.tmdbId,
		mediaType: item.mediaType,
		status: 'running',
		startedAt
	});
	await db
		.update(mediaItems)
		.set({ discoveryStatus: 'running', discoveryStartedAt: startedAt, updatedAt: startedAt })
		.where(and(eq(mediaItems.serverInstanceId, item.serverInstanceId), eq(mediaItems.id, item.id)));

	const weights = await getScoreWeights();
	let attempted = 0;
	let succeeded = 0;
	let failures = 0;

	await Promise.all(
		providers.map(async (provider) => {
			const availability = providerAvailability(provider.id, config);
			const providerStarted = new Date();
			const scope = and(
				eq(posterCandidates.serverInstanceId, item.serverInstanceId),
				eq(posterCandidates.mediaItemId, item.id),
				eq(posterCandidates.provider, provider.id)
			);
			if (availability !== 'available') {
				await db.update(posterCandidates).set({ active: false, stale: true }).where(scope);
				await db.insert(providerDiscoveryOutcomes).values({
					runId,
					serverInstanceId: item.serverInstanceId,
					mediaItemId: item.id,
					provider: provider.id,
					status: availability,
					candidateCount: 0,
					startedAt: providerStarted,
					completedAt: new Date()
				});
				return;
			}

			attempted += 1;
			try {
				const sets = await provider.discover(item, config, { forceRefresh: opts?.forceRefresh });
				const candidates = sets.flatMap((set) =>
					set.candidates.map((candidate) => {
						const width = candidate.width ?? null;
						const height = candidate.height ?? null;
						return {
							serverInstanceId: item.serverInstanceId,
							mediaItemId: item.id,
							discoveryRunId: runId,
							provider: provider.id,
							setId: candidate.setId,
							setAuthor: candidate.setAuthor,
							url: candidate.url,
							kind: candidate.kind,
							season: candidate.season,
							episode: candidate.episode,
							resolvedTmdbId: item.tmdbId,
							resolvedMediaType: item.mediaType,
							width,
							height,
							score: scorePoster(
								{ provider: provider.id, width, height, kind: candidate.kind },
								weights
							),
							active: true,
							stale: false,
							lastSeenAt: new Date()
						};
					})
				);
				await db.transaction(async (tx) => {
					const [outcome] = await tx
						.insert(providerDiscoveryOutcomes)
						.values({
							runId,
							serverInstanceId: item.serverInstanceId,
							mediaItemId: item.id,
							provider: provider.id,
							status: candidates.length ? 'succeeded' : 'empty',
							candidateCount: candidates.length,
							latencyMs: Date.now() - providerStarted.getTime(),
							lastSuccessAt: new Date(),
							startedAt: providerStarted,
							completedAt: new Date()
						})
						.returning({ id: providerDiscoveryOutcomes.id });
					await tx.delete(posterCandidates).where(scope);
					if (candidates.length) {
						await tx
							.insert(posterCandidates)
							.values(
								candidates.map((candidate) => ({ ...candidate, providerOutcomeId: outcome.id }))
							);
					}
				});
				succeeded += 1;
			} catch (error) {
				failures += 1;
				const retained = await db
					.select({ id: posterCandidates.id })
					.from(posterCandidates)
					.where(and(scope, eq(posterCandidates.active, true)));
				await db.update(posterCandidates).set({ stale: true }).where(scope);
				const rawError = error instanceof Error ? error.message : String(error);
				const safeError = redact(rawError, config).slice(0, 500);
				const timedOut = /timed?\s*out|abort/i.test(rawError);
				await db.insert(providerDiscoveryOutcomes).values({
					runId,
					serverInstanceId: item.serverInstanceId,
					mediaItemId: item.id,
					provider: provider.id,
					status: timedOut ? 'timed_out' : 'failed',
					candidateCount: retained.length,
					retainedStaleCandidates: retained.length > 0,
					latencyMs: Date.now() - providerStarted.getTime(),
					errorCode: timedOut ? 'provider_timeout' : 'provider_failed',
					error: safeError,
					startedAt: providerStarted,
					completedAt: new Date()
				});
				await logEvent('warn', 'provider', `${provider.id} discovery failed for "${item.title}"`, {
					provider: provider.id,
					title: item.title,
					serverInstanceId: item.serverInstanceId,
					mediaItemId: item.id,
					error: safeError,
					retained: retained.length
				});
			}
		})
	);

	const activeCandidates = await db
		.select({ provider: posterCandidates.provider })
		.from(posterCandidates)
		.where(
			and(
				eq(posterCandidates.serverInstanceId, item.serverInstanceId),
				eq(posterCandidates.mediaItemId, item.id),
				eq(posterCandidates.active, true)
			)
		);
	const runStatus = failures === 0 ? 'succeeded' : succeeded > 0 ? 'partial' : 'failed';
	const discoveryStatus =
		failures > 0
			? succeeded > 0
				? 'partial'
				: 'failed'
			: activeCandidates.length
				? 'succeeded'
				: 'empty';
	const completedAt = new Date();
	await db
		.update(providerDiscoveryRuns)
		.set({ status: runStatus, completedAt })
		.where(eq(providerDiscoveryRuns.id, runId));
	await db
		.update(mediaItems)
		.set({
			hasCandidates: activeCandidates.length > 0,
			hasMediux: activeCandidates.some((candidate) => candidate.provider === 'mediux'),
			discoveryStatus,
			discoveryCompletedAt: completedAt,
			updatedAt: completedAt
		})
		.where(and(eq(mediaItems.serverInstanceId, item.serverInstanceId), eq(mediaItems.id, item.id)));

	if (activeCandidates.length) {
		await logEvent(
			'info',
			'discover',
			`Found ${activeCandidates.length} covers for "${item.title}"`,
			{
				title: item.title,
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				count: activeCandidates.length,
				attempted
			}
		);
	}
	return activeCandidates.length;
}

/** Select poster, background, and every child slot with frozen, explainable provenance. */
export async function autoSelectArtwork(
	itemId: number,
	inputs: Omit<AutomaticSelectionInputs, 'weights'> & {
		weights?: AutomaticSelectionInputs['weights'];
	} = {}
): Promise<AutomaticArtworkSelection> {
	const [rows, weights] = await Promise.all([
		db
			.select()
			.from(posterCandidates)
			.where(and(eq(posterCandidates.mediaItemId, itemId), eq(posterCandidates.active, true))),
		inputs.weights ? Promise.resolve(inputs.weights) : getScoreWeights()
	]);
	return selectAutomaticArtwork(rows, { ...inputs, weights });
}

/** Compatibility helper for callers that only need the selected root poster URL. */
export async function autoSelectPoster(itemId: number): Promise<string | null> {
	return (await autoSelectArtwork(itemId)).poster?.url ?? null;
}

async function requireItemServerInstanceId(itemId: number): Promise<string> {
	const [item] = await db
		.select({ serverInstanceId: mediaItems.serverInstanceId })
		.from(mediaItems)
		.where(eq(mediaItems.id, itemId))
		.limit(1);
	if (!item) throw new Error(`Media item ${itemId} was not found`);
	return item.serverInstanceId;
}

export interface ArtworkSelectionPatch {
	posterUrl?: string | null;
	backgroundUrl?: string | null;
	posterCandidateId?: number | null;
	backgroundCandidateId?: number | null;
}

/** Record only the supplied pending slots, preserving every omitted selection. */
export async function selectCandidate(
	itemId: number,
	selection: ArtworkSelectionPatch
): Promise<void> {
	const patch: Partial<typeof mediaItems.$inferInsert> = {
		selectionUpdatedAt: new Date(),
		updatedAt: new Date()
	};
	if (Object.hasOwn(selection, 'posterUrl')) patch.selectedPosterUrl = selection.posterUrl ?? null;
	if (Object.hasOwn(selection, 'backgroundUrl')) {
		patch.selectedBackgroundUrl = selection.backgroundUrl ?? null;
	}
	if (Object.hasOwn(selection, 'posterCandidateId')) {
		patch.selectedPosterCandidateId = selection.posterCandidateId ?? null;
	}
	if (Object.hasOwn(selection, 'backgroundCandidateId')) {
		patch.selectedBackgroundCandidateId = selection.backgroundCandidateId ?? null;
	}
	await db.update(mediaItems).set(patch).where(eq(mediaItems.id, itemId));
}

/**
 * Upsert or clear a single season/episode artwork slot. A null `url` clears the
 * slot. Season slots pass `episode: null`; episode (title-card) slots pass the
 * episode number. Uniqueness is per-slot, so we delete any existing row for the
 * slot before inserting (libsql has no portable partial-index upsert target).
 */
export async function selectChild(
	itemId: number,
	slot: { kind: 'poster' | 'background' | 'title_card'; season: number; episode: number | null },
	url: string | null
): Promise<void> {
	const serverInstanceId = await requireItemServerInstanceId(itemId);
	const changedAt = new Date();
	const { kind, season, episode } = slot;
	const episodeMatch =
		episode === null ? isNull(childSelections.episode) : eq(childSelections.episode, episode);
	await db
		.delete(childSelections)
		.where(
			and(
				eq(childSelections.serverInstanceId, serverInstanceId),
				eq(childSelections.mediaItemId, itemId),
				eq(childSelections.kind, kind),
				eq(childSelections.season, season),
				episodeMatch
			)
		);
	if (url) {
		await db.insert(childSelections).values({
			serverInstanceId,
			mediaItemId: itemId,
			kind,
			season,
			episode,
			url,
			updatedAt: changedAt
		});
	}
	await db
		.update(mediaItems)
		.set({ selectionUpdatedAt: changedAt, updatedAt: changedAt })
		.where(and(eq(mediaItems.id, itemId), eq(mediaItems.serverInstanceId, serverInstanceId)));
}

/**
 * Stage many child slots in one call (used by "use this set"). Runs every per-slot
 * delete+insert inside a single transaction so the bulk stage commits once and is
 * atomic, rather than issuing two statements per slot across separate commits.
 */
export async function selectChildrenBulk(
	itemId: number,
	slots: {
		kind: 'poster' | 'background' | 'title_card';
		season: number;
		episode: number | null;
		url: string;
	}[]
): Promise<void> {
	if (!slots.length) return;
	const serverInstanceId = await requireItemServerInstanceId(itemId);
	await db.transaction(async (tx) => {
		const changedAt = new Date();
		for (const s of slots) {
			const episodeMatch =
				s.episode === null
					? isNull(childSelections.episode)
					: eq(childSelections.episode, s.episode);
			await tx
				.delete(childSelections)
				.where(
					and(
						eq(childSelections.serverInstanceId, serverInstanceId),
						eq(childSelections.mediaItemId, itemId),
						eq(childSelections.kind, s.kind),
						eq(childSelections.season, s.season),
						episodeMatch
					)
				);
			await tx.insert(childSelections).values({
				serverInstanceId,
				mediaItemId: itemId,
				kind: s.kind,
				season: s.season,
				episode: s.episode,
				url: s.url,
				updatedAt: changedAt
			});
		}
		await tx
			.update(mediaItems)
			.set({ selectionUpdatedAt: changedAt, updatedAt: changedAt })
			.where(and(eq(mediaItems.id, itemId), eq(mediaItems.serverInstanceId, serverInstanceId)));
	});
}

/** Read an item's staged child selections as pure slots for apply/UI hydration. */
export async function getChildSelections(itemId: number): Promise<StagedChildSlot[]> {
	const serverInstanceId = await requireItemServerInstanceId(itemId);
	const rows = await db
		.select()
		.from(childSelections)
		.where(
			and(
				eq(childSelections.serverInstanceId, serverInstanceId),
				eq(childSelections.mediaItemId, itemId)
			)
		);
	return rows.map((r) => ({ kind: r.kind, season: r.season, episode: r.episode, url: r.url }));
}

/** Summary of how many child slots were applied, failed, or skipped in one apply. */
export interface ChildApplySummary {
	applied: number;
	failed: number;
	skipped: number;
}

export interface ApplyOutcome {
	method: 'plex' | 'kometa';
	status: 'success' | 'failed';
	error?: string;
	/** Per-child results when season/episode slots were part of this apply. */
	children?: ChildApplySummary;
	/** True when this outcome is a dry-run plan (nothing was written). */
	dryRun?: boolean;
	/** In a dry-run, what would be written at the show level (and season count for Kometa). */
	planned?: { poster: boolean; background: boolean; seasons?: number };
}

/**
 * Apply a cover to an item via the chosen method(s). Each method runs and is
 * recorded independently so a partial failure is visible.
 */
export async function applyToItem(
	item: MediaItem,
	params: {
		/** Show-level poster URL; null/omitted applies only the background and/or children. */
		posterUrl?: string | null;
		backgroundUrl?: string | null;
		method: ApplyMethod;
		config: AppConfig;
		/** When true, compute and return the plan without writing to the server, files, or DB. */
		dryRun?: boolean;
	}
): Promise<ApplyOutcome[]> {
	const { posterUrl, backgroundUrl, method, config, dryRun } = params;
	const outcomes: ApplyOutcome[] = [];
	const doServer = method === 'plex' || method === 'both';
	const doKometa = method === 'kometa' || method === 'both';
	// Staged season/episode slots are applied alongside the show-level cover.
	const childSlots = item.type === 'show' ? await getChildSelections(item.id) : [];

	// Dry-run: resolve what *would* happen (child matching is a read, allowed) but
	// perform no server upload, Kometa write, applied-record insert, or lock change.
	if (dryRun) {
		const planned = { poster: !!posterUrl, background: !!backgroundUrl };
		if (doServer) {
			let children: ChildApplySummary | undefined;
			if (childSlots.length && item.type === 'show') {
				try {
					const { server } = await requireItemServerOrThrow(item);
					const { ops, skipped } = await resolveChildrenForServer(
						server,
						item.ratingKey,
						childSlots
					);
					children = { applied: ops.length, failed: 0, skipped: skipped.length };
				} catch (e) {
					outcomes.push({
						method: 'plex',
						status: 'failed',
						error: errorMessage(e),
						dryRun: true,
						planned
					});
				}
			}
			if (!outcomes.some((o) => o.method === 'plex')) {
				outcomes.push({ method: 'plex', status: 'success', dryRun: true, planned, children });
			}
		}
		if (doKometa) {
			const seasons = buildKometaSeasons(childSlots);
			outcomes.push({
				method: 'kometa',
				status: 'success',
				dryRun: true,
				planned: { ...planned, seasons: seasons.length }
			});
		}
		return outcomes;
	}

	if (doServer) {
		// Persisted as 'plex' (the direct-server method) for schema compatibility,
		// but routed through whichever provider is active.
		let serverLabel = 'media server';
		let outcome: ApplyOutcome = { method: 'plex', status: 'success' };
		let children: ChildApplySummary = { applied: 0, failed: 0, skipped: 0 };
		try {
			const resolved = await requireItemServerOrThrow(item);
			const server = resolved.server;
			serverLabel = resolved.connection.name;
			if (posterUrl) await server.applyPosterUrl(item.ratingKey, posterUrl);
			if (backgroundUrl && server.applyBackgroundUrl) {
				await server.applyBackgroundUrl(item.ratingKey, backgroundUrl);
			}
			children = await applyChildrenToServer(server, item, childSlots);
		} catch (e) {
			outcome = { method: 'plex', status: 'failed', error: errorMessage(e) };
		}
		if (children.applied || children.failed || children.skipped) outcome.children = children;
		// Record a show-level row only when a show poster was part of this apply.
		if (posterUrl) {
			await db.insert(appliedPosters).values({
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				url: posterUrl,
				method: 'plex',
				status: outcome.status,
				error: outcome.error ?? null
			});
		}
		if (outcome.status === 'success') {
			await logEvent('info', 'apply', `Applied artwork to "${item.title}" via ${serverLabel}`, {
				title: item.title,
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				method: 'plex',
				url: posterUrl ?? undefined,
				children
			});
		} else {
			await logEvent(
				'error',
				'apply',
				`Failed to apply artwork to "${item.title}" via ${serverLabel}`,
				{
					title: item.title,
					serverInstanceId: item.serverInstanceId,
					mediaItemId: item.id,
					method: 'plex',
					error: outcome.error
				}
			);
		}
		outcomes.push(outcome);
	}

	if (doKometa) {
		let outcome: ApplyOutcome = { method: 'kometa', status: 'success' };
		const seasons = buildKometaSeasons(childSlots);
		try {
			if (!item.tmdbId) throw new Error('Cannot export to Kometa without a TMDB id');
			await writeKometaYaml(kometaOutDir(config), [
				{ tmdbId: item.tmdbId, title: item.title, posterUrl, backgroundUrl, seasons }
			]);
		} catch (e) {
			outcome = { method: 'kometa', status: 'failed', error: errorMessage(e) };
		}
		if (outcome.status === 'success' && seasons.length) {
			outcome.children = {
				applied: seasons.reduce((n, s) => n + (s.posterUrl ? 1 : 0) + (s.episodes?.length ?? 0), 0),
				failed: 0,
				skipped: 0
			};
		}
		if (posterUrl) {
			await db.insert(appliedPosters).values({
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				url: posterUrl,
				method: 'kometa',
				status: outcome.status,
				error: outcome.error ?? null
			});
		}
		if (outcome.status === 'success') {
			await logEvent('info', 'apply', `Applied artwork to "${item.title}" via Kometa`, {
				title: item.title,
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				method: 'kometa',
				url: posterUrl ?? undefined
			});
		} else {
			await logEvent('error', 'apply', `Failed to apply artwork to "${item.title}" via Kometa`, {
				title: item.title,
				serverInstanceId: item.serverInstanceId,
				mediaItemId: item.id,
				method: 'kometa',
				error: outcome.error
			});
		}
		outcomes.push(outcome);
	}

	return outcomes;
}

/**
 * Fetch the show's children and resolve staged slots to concrete child apply ops,
 * matched by number. Episodes are fetched only for seasons that have episode slots.
 */
async function resolveChildrenForServer(
	server: MediaServer,
	showId: string,
	slots: StagedChildSlot[]
) {
	const seasons = await server.listSeasons(showId);
	const seasonIdByNumber = new Map(seasons.map((s) => [s.number, s.id]));
	const episodesBySeason: Record<number, ServerChild[]> = {};
	for (const num of seasonsNeedingEpisodes(slots)) {
		const id = seasonIdByNumber.get(num);
		if (id !== undefined) episodesBySeason[num] = await server.listEpisodes(id);
	}
	return resolveChildOps(slots, seasons, episodesBySeason);
}

/**
 * Apply every staged season/episode slot to its server child, isolating per-child
 * failures and reporting slots whose number had no matching child. `applyPosterUrl`
 * / `applyBackgroundUrl` already lock the field, so no extra lock call is needed.
 */
async function applyChildrenToServer(
	server: MediaServer,
	item: MediaItem,
	slots: StagedChildSlot[]
): Promise<ChildApplySummary> {
	if (!slots.length || item.type !== 'show') return { applied: 0, failed: 0, skipped: 0 };

	let resolution: Awaited<ReturnType<typeof resolveChildrenForServer>>;
	try {
		resolution = await resolveChildrenForServer(server, item.ratingKey, slots);
	} catch (e) {
		await logEvent('error', 'apply', `Could not list children for "${item.title}"`, {
			title: item.title,
			serverInstanceId: item.serverInstanceId,
			mediaItemId: item.id,
			error: errorMessage(e)
		});
		return { applied: 0, failed: slots.length, skipped: 0 };
	}

	const { ops, skipped } = resolution;
	let applied = 0;
	let failed = 0;
	for (const op of ops) {
		let status: 'success' | 'failed' = 'success';
		let error: string | undefined;
		try {
			if (op.field === 'background') {
				if (!server.applyBackgroundUrl) throw new Error('Provider does not support backgrounds');
				await server.applyBackgroundUrl(op.childId, op.url);
			} else {
				await server.applyPosterUrl(op.childId, op.url);
			}
			applied++;
		} catch (e) {
			status = 'failed';
			error = errorMessage(e);
			failed++;
		}
		await db.insert(appliedPosters).values({
			serverInstanceId: item.serverInstanceId,
			mediaItemId: item.id,
			url: op.url,
			method: 'plex',
			status,
			error: error ?? null,
			kind: op.slot.kind,
			season: op.slot.season,
			episode: op.slot.episode
		});
	}
	return { applied, failed, skipped: skipped.length };
}

/**
 * Build the per-season Kometa input from staged child slots: season posters become
 * `seasons[].posterUrl` and episode title cards become `seasons[].episodes[]`.
 * Season backgrounds are intentionally omitted (not exported to Kometa YAML).
 */
function buildKometaSeasons(slots: StagedChildSlot[]): KometaSeasonInput[] {
	const bySeason = new Map<number, KometaSeasonInput>();
	const ensure = (n: number): KometaSeasonInput => {
		let s = bySeason.get(n);
		if (!s) {
			s = { season: n };
			bySeason.set(n, s);
		}
		return s;
	};
	for (const slot of slots) {
		if (slot.kind === 'poster' && slot.episode === null) {
			ensure(slot.season).posterUrl = slot.url;
		} else if (slot.kind === 'title_card' && slot.episode !== null) {
			const s = ensure(slot.season);
			(s.episodes ??= []).push({ episode: slot.episode, url: slot.url });
		}
		// season background is not exported to Kometa
	}
	const seasons = [...bySeason.values()].sort((a, b) => a.season - b.season);
	for (const s of seasons) s.episodes?.sort((a, b) => a.episode - b.episode);
	return seasons;
}

function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Resolve the provider that owns this exact item; never fall back to another active server. */
async function requireItemServerOrThrow(item: Pick<MediaItem, 'serverInstanceId'>) {
	return resolveMediaServerInstance(item.serverInstanceId, { requireEnabled: true });
}

/**
 * Apply a user-supplied image file as the item's poster, directly to the active
 * media server (no hosting). Records the application. For a custom URL (which both
 * the server and Kometa can consume) use the normal apply flow with the URL as the
 * poster instead.
 */
export async function applyCustomUpload(
	item: MediaItem,
	data: ArrayBuffer,
	contentType: string,
	_config: AppConfig
): Promise<void> {
	const { server, connection } = await requireItemServerOrThrow(item);
	await server.applyPosterBytes(item.ratingKey, data, contentType);
	await db.insert(appliedPosters).values({
		serverInstanceId: item.serverInstanceId,
		mediaItemId: item.id,
		url: 'custom-upload',
		method: 'plex',
		status: 'success'
	});
	await logEvent(
		'info',
		'apply',
		`Applied custom upload to "${item.title}" via ${connection.name}`,
		{
			title: item.title,
			method: 'upload',
			serverInstanceId: item.serverInstanceId,
			mediaItemId: item.id
		}
	);
}

/** Scope for {@link revertItem}: omit `season` to revert everything. */
export interface RevertScope {
	/** Revert only this season's poster/background and its episodes' title cards. */
	season?: number;
}

/**
 * Revert applied artwork at full or per-season scope.
 *
 * Full scope (no season): re-set the show poster captured at sync, unlock it, and
 * unlock every applied season/episode child so the server manages it again; then
 * clear all applied history, pending selections, and child selections so the item
 * reads as unchanged. Per-season scope unlocks only that season's poster/background
 * and its episodes' title cards, leaving the show-level and other seasons intact.
 *
 * Children have no stored prior art, so reverting them unlocks the field rather
 * than re-setting an image (consistent with the unlock-based show-level revert; a
 * no-op on Jellyfin/Emby which have no lock concept). The Kometa YAML export (if
 * any) is left in place. Returns how many children were unlocked vs skipped.
 */
export async function revertItem(
	item: MediaItem,
	_config: AppConfig,
	scope?: RevertScope
): Promise<{ reverted: number; skipped: number }> {
	const { server, connection } = await requireItemServerOrThrow(item);
	const season = scope?.season;
	const fullScope = season === undefined;

	// Which applied children to unlock, derived from history (deduped by slot).
	const appliedChildRows = await db
		.select()
		.from(appliedPosters)
		.where(
			and(
				eq(appliedPosters.mediaItemId, item.id),
				eq(appliedPosters.method, 'plex'),
				isNotNull(appliedPosters.kind)
			)
		);
	const seen = new Set<string>();
	const childSlots: StagedChildSlot[] = [];
	for (const r of appliedChildRows) {
		if (!r.kind || r.season === null) continue;
		if (!fullScope && r.season !== season) continue;
		const key = `${r.kind}:${r.season}:${r.episode ?? ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		childSlots.push({ kind: r.kind, season: r.season, episode: r.episode, url: '' });
	}

	let reverted = 0;
	let skipped = 0;
	if (childSlots.length && item.type === 'show') {
		try {
			const { ops, skipped: sk } = await resolveChildrenForServer(
				server,
				item.ratingKey,
				childSlots
			);
			skipped += sk.length;
			for (const op of ops) {
				try {
					await server.lockField(op.childId, op.field, false);
					reverted++;
				} catch {
					skipped++;
				}
			}
		} catch {
			skipped += childSlots.length;
		}
	}

	// Show-level revert only on a full revert.
	if (fullScope) {
		if (item.currentPosterUrl) {
			await server.applyPosterUrl(item.ratingKey, item.currentPosterUrl);
		}
		await server.lockField(item.ratingKey, 'poster', false);
		// Apply can lock the background too (incl. background-only applies), so unlock it.
		await server.lockField(item.ratingKey, 'background', false);
		await db.delete(appliedPosters).where(eq(appliedPosters.mediaItemId, item.id));
		await db.delete(childSelections).where(eq(childSelections.mediaItemId, item.id));
		await db
			.update(mediaItems)
			.set({ selectedPosterUrl: null, selectedBackgroundUrl: null, updatedAt: new Date() })
			.where(eq(mediaItems.id, item.id));
	} else {
		await db
			.delete(appliedPosters)
			.where(and(eq(appliedPosters.mediaItemId, item.id), eq(appliedPosters.season, season)));
		await db
			.delete(childSelections)
			.where(and(eq(childSelections.mediaItemId, item.id), eq(childSelections.season, season)));
	}

	await logEvent(
		'info',
		'apply',
		fullScope
			? `Reverted "${item.title}" to its original cover on ${connection.name}`
			: `Reverted season ${season} of "${item.title}" on ${connection.name}`,
		{
			title: item.title,
			season: fullScope ? undefined : season,
			serverInstanceId: item.serverInstanceId,
			mediaItemId: item.id
		}
	);
	return { reverted, skipped };
}
