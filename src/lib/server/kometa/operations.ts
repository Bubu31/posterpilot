/**
 * Catalog of Kometa per-library `operations` keys and their value types, used to
 * render the operations controls and to coerce values before writing. Verified
 * against kometa.wiki/en/latest/config/operations/.
 *
 * Pure data + guards.
 */

export type OperationType = 'bool' | 'text' | 'int' | 'enum' | 'list';

export interface Operation {
	key: string;
	type: OperationType;
	/** Stable group for rendering. */
	group: 'assets' | 'mass_update' | 'ratings' | 'maintenance' | 'arr';
	note?: string;
}

export const OPERATIONS: readonly Operation[] = Object.freeze([
	{ key: 'assets_for_all', type: 'bool', group: 'assets' },
	{ key: 'assets_for_all_collections', type: 'bool', group: 'assets' },
	{ key: 'delete_collections', type: 'bool', group: 'maintenance' },
	{ key: 'mass_genre_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_content_rating_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_original_title_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_studio_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_originally_available_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_added_at_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_audience_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_critic_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_user_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_episode_audience_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_episode_critic_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_episode_user_rating_update', type: 'enum', group: 'ratings' },
	{ key: 'mass_poster_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_background_update', type: 'enum', group: 'mass_update' },
	{ key: 'mass_imdb_parental_labels', type: 'enum', group: 'mass_update' },
	{ key: 'mass_collection_mode', type: 'enum', group: 'mass_update' },
	{ key: 'update_blank_track_titles', type: 'bool', group: 'maintenance' },
	{ key: 'remove_title_parentheses', type: 'bool', group: 'maintenance' },
	{ key: 'ignore_labels', type: 'list', group: 'maintenance' },
	{ key: 'respect_ignore_ids', type: 'bool', group: 'maintenance' },
	{ key: 'split_duplicates', type: 'bool', group: 'maintenance' },
	{ key: 'radarr_add_all', type: 'bool', group: 'arr' },
	{ key: 'radarr_remove_by_tag', type: 'list', group: 'arr' },
	{ key: 'sonarr_add_all', type: 'bool', group: 'arr' },
	{ key: 'sonarr_remove_by_tag', type: 'list', group: 'arr' },
	{ key: 'genre_mapper', type: 'list', group: 'maintenance' },
	{ key: 'content_rating_mapper', type: 'list', group: 'maintenance' },
	{ key: 'metadata_backup', type: 'text', group: 'maintenance' },
	{ key: 'plex_bulk_edit_batch_size', type: 'int', group: 'maintenance' }
]);

const BY_KEY = new Map(OPERATIONS.map((o) => [o.key, o]));

/** Resolve an operation definition by key. */
export function operationByKey(key: string): Operation | undefined {
	return BY_KEY.get(key);
}

/** True when `key` is a recognized Kometa operation. */
export function isKnownOperation(key: string): boolean {
	return BY_KEY.has(key);
}
