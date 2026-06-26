/**
 * Catalog of Kometa default OVERLAY files — the `default:` values usable in a
 * library's `overlay_files`. Mirrors `defaults-catalog.ts` (collections) in shape.
 * Names verified against kometa.wiki/en/latest/defaults/overlays/.
 *
 * Pure data + guards.
 */

export interface OverlayGroup {
	/** Stable group id (also an i18n key suffix `kometa_overlay_group_<id>`). */
	id: string;
	names: readonly string[];
}

export const OVERLAY_GROUPS: readonly OverlayGroup[] = Object.freeze([
	{ id: 'content', names: ['mediastinger', 'ratings', 'status', 'episode_info'] },
	{
		id: 'media',
		names: [
			'resolution',
			'video_format',
			'audio_codec',
			'aspect',
			'languages',
			'language_count',
			'runtimes',
			'versions'
		]
	},
	{ id: 'production', names: ['network', 'streaming', 'studio'] },
	{
		id: 'content_ratings',
		names: [
			'content_rating_us_movie',
			'content_rating_us_show',
			'content_rating_uk',
			'content_rating_de',
			'content_rating_au',
			'content_rating_nz',
			'commonsense'
		]
	},
	{ id: 'awards', names: ['ribbon'] },
	{ id: 'utility', names: ['direct_play'] }
]);

export const OVERLAY_DEFAULTS: readonly string[] = Object.freeze(
	OVERLAY_GROUPS.flatMap((g) => g.names)
);

const KNOWN = new Set(OVERLAY_DEFAULTS);

/** True when `name` is a recognized Kometa default overlay in the catalog. */
export function isKnownOverlay(name: string): boolean {
	return KNOWN.has(name);
}

/** Filter to recognized overlay names (order preserved). */
export function knownOverlays(names: readonly string[]): string[] {
	return names.filter((n) => KNOWN.has(n));
}
