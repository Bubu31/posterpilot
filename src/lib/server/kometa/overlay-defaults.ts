/**
 * Catalog of Kometa default OVERLAY files (the `default:` values usable in a
 * library's `overlay_files`), with manual-derived descriptions and doc links.
 * Pure data + guards.
 */

export interface OverlayItem {
	readonly name: string;
	readonly description: string;
}
export interface OverlayGroup {
	readonly id: string;
	readonly label: string;
	readonly docUrl: string;
	readonly overlays: readonly OverlayItem[];
}

export const OVERLAY_GROUPS: readonly OverlayGroup[] = Object.freeze([
	Object.freeze({
		id: 'awards-charts',
		label: 'Awards/Charts',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/',
		overlays: [
			{
				name: 'ribbon',
				description:
					'Ribbon/banner badge in a bottom corner marking chart and award placements such as IMDb Top 250 or Rotten Tomatoes Fresh.'
			}
		]
	}),
	Object.freeze({
		id: 'content',
		label: 'Content',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/content/',
		overlays: [
			{
				name: 'episode_info',
				description: 'Episode number badge showing the season/episode code like S01E01 on episodes.'
			},
			{
				name: 'mediastinger',
				description:
					'Small logo flagging titles that have a mid-credit or post-credit scene (mediastinger).'
			},
			{
				name: 'ratings',
				description:
					'Text overlay of one to three ratings (e.g. IMDb audience, Metacritic critic) for movies, shows, and episodes.'
			},
			{
				name: 'status',
				description: "Banner showing a show's airing status: Airing, Returning, Canceled, or Ended."
			}
		]
	}),
	Object.freeze({
		id: 'content-ratings',
		label: 'Content Ratings',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/content_rating/',
		overlays: [
			{
				name: 'content_rating_us_movie',
				description: 'US MPAA movie age-rating badge (G, PG, PG-13, R, NC-17, NR).'
			},
			{
				name: 'content_rating_us_show',
				description:
					'US TV Parental Guidelines badge (TV-G, TV-Y, TV-PG, TV-14, TV-MA, NR) for shows, seasons, and episodes.'
			},
			{
				name: 'content_rating_uk',
				description: 'UK BBFC age-rating badge (U, PG, 12, 12A, 15, 18, R18, NR).'
			},
			{
				name: 'content_rating_de',
				description: 'German FSK age-rating badge (0, 6, 12, 16, 18, BPjM, NR).'
			},
			{
				name: 'content_rating_au',
				description: 'Australian Classification age-rating badge (G, PG, M, MA15+, R18+, X18+, NR).'
			},
			{
				name: 'content_rating_nz',
				description:
					'New Zealand OFLC age-rating badge (G, PG, M, R13, RP13, R15, R16, R18, R, NR).'
			},
			{
				name: 'commonsense',
				description: 'Common Sense Media recommended-age badge (1+ through 18+, NR).'
			}
		]
	}),
	Object.freeze({
		id: 'media',
		label: 'Media',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/media/',
		overlays: [
			{
				name: 'aspect',
				description: 'Badge showing the video aspect ratio such as 1.33, 1.78, or 2.39.'
			},
			{
				name: 'audio_codec',
				description: 'Logo badge for the audio codec/format such as Dolby Atmos, DTS-X, or TrueHD.'
			},
			{
				name: 'language_count',
				description:
					'Badge flagging Dual-Audio, Multi-Audio, Dual-Subtitle, or Multi-Subtitle availability.'
			},
			{
				name: 'languages',
				description:
					'Row of country flags representing the available audio and/or subtitle languages.'
			},
			{
				name: 'resolution',
				description:
					'Resolution badge (e.g. 4K, 1080P, 720P) plus Dolby Vision/HDR and edition labels.'
			},
			{
				name: 'runtimes',
				description: "Text overlay of the title's runtime, e.g. 'Runtime: 1h 30m'."
			},
			{
				name: 'versions',
				description:
					'Badge indicating that multiple versions/copies of the item exist in the library.'
			},
			{
				name: 'video_format',
				description: 'Badge for the source/video format such as REMUX, Blu-ray, WEB-DL, or HDTV.'
			}
		]
	}),
	Object.freeze({
		id: 'production',
		label: 'Production',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/production/',
		overlays: [
			{
				name: 'network',
				description: 'Logo/text badge for the TV network that airs the show (e.g. ABC, CBS).'
			},
			{
				name: 'streaming',
				description:
					'Logo badge for the streaming service the title is on (e.g. Netflix, Hulu, Disney+).'
			},
			{
				name: 'studio',
				description: 'Logo/text badge for the production studio such as Warner Bros. Pictures.'
			}
		]
	}),
	Object.freeze({
		id: 'utility',
		label: 'Utility',
		docUrl: 'https://kometa.wiki/en/latest/defaults/overlays/utility/',
		overlays: [
			{
				name: 'direct_play',
				description: "Banner marking items that should be Direct Play only (won't transcode well)."
			}
		]
	})
]);

export const OVERLAY_DEFAULTS: readonly OverlayItem[] = Object.freeze(
	OVERLAY_GROUPS.flatMap((g) => g.overlays)
);

const KNOWN: ReadonlySet<string> = new Set(OVERLAY_DEFAULTS.map((o) => o.name));

/** True when `name` is a recognized Kometa default overlay. */
export function isKnownOverlay(name: string): boolean {
	return KNOWN.has(name);
}

/** Filter to recognized overlay names (order preserved). */
export function knownOverlays(names: readonly string[]): string[] {
	return names.filter((n) => KNOWN.has(n));
}
