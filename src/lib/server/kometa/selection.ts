/**
 * The Kometa selection payload and its parser. Pure (no db/fs/$env) so it can be
 * unit-tested and imported by the API endpoints without pulling in the heavier
 * sync orchestration.
 *
 * Library-scoped maps are keyed by Plex section key (the orchestration resolves
 * those to Kometa library names via the cached library list).
 */

/** Selections coming from the Kometa manager. */
export interface SyncSelectionInput {
	/** Managed library section keys (Plex section ids). */
	libraries: string[];
	/** Enabled default collection names per section key. */
	defaults: Record<string, string[]>;
	/** Bounded global-setting id → value (empty value means "unmanage"). */
	settings: Record<string, string>;
	/** Connector section → field key → value (empty non-secret = remove). */
	connections: Record<string, Record<string, string>>;
	/** Enabled overlay default names per section key. */
	overlays: Record<string, string[]>;
	/** Per-library operations: section key → op key → value. */
	operations: Record<string, Record<string, string>>;
	/** Per-library settings overrides: section key → setting key → value. */
	librarySettings: Record<string, Record<string, string>>;
	/** Global webhooks: key → value. */
	webhooks: Record<string, string>;
}

function strArrayMap(v: unknown): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
			if (Array.isArray(val)) out[k] = val.map(String);
		}
	}
	return out;
}

function strMap(v: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
			if (typeof val === 'string') out[k] = val;
		}
	}
	return out;
}

function nestedStrMap(v: unknown): Record<string, Record<string, string>> {
	const out: Record<string, Record<string, string>> = {};
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
			out[k] = strMap(val);
		}
	}
	return out;
}

/** Coerce an untrusted request body into a well-formed SyncSelectionInput. */
export function parseSelectionInput(body: unknown): SyncSelectionInput {
	const b = (body ?? {}) as Record<string, unknown>;
	return {
		libraries: Array.isArray(b.libraries) ? b.libraries.map(String) : [],
		defaults: strArrayMap(b.defaults),
		settings: strMap(b.settings),
		connections: nestedStrMap(b.connections),
		overlays: strArrayMap(b.overlays),
		operations: nestedStrMap(b.operations),
		librarySettings: nestedStrMap(b.librarySettings),
		webhooks: strMap(b.webhooks)
	};
}
