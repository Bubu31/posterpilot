/**
 * Catalog of Kometa default COLLECTION files (the `default:` values usable in a
 * library's `collection_files`), with manual-derived descriptions and doc links.
 * Complete set + descriptions sourced and verified against kometa.wiki.
 * Pure data + guards.
 */

export interface DefaultItem {
	readonly name: string;
	readonly description: string;
}
export interface DefaultGroup {
	readonly id: string;
	readonly label: string;
	readonly docUrl: string;
	readonly collections: readonly DefaultItem[];
}

export const DEFAULT_COLLECTION_GROUPS: readonly DefaultGroup[] = Object.freeze([
	Object.freeze({
		id: 'award',
		label: 'Award',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#award',
		collections: [
			{
				name: 'separator_award',
				description:
					'Creates a separator collection that visually groups all the award-based collections together.'
			},
			{
				name: 'oscars',
				description:
					'Creates collections of Academy Award (Oscars) winners, such as Best Picture and Best Director winners by year.'
			},
			{
				name: 'berlinale',
				description:
					'Creates collections of Berlin International Film Festival Golden Bear award winners by year.'
			},
			{
				name: 'bafta',
				description:
					'Creates collections of BAFTA (British Academy of Film Awards) best-film winners by year.'
			},
			{
				name: 'cannes',
				description:
					"Creates collections of Cannes Film Festival Palme d'Or (Golden Palm) winners by year."
			},
			{
				name: 'cesar',
				description: "Creates collections of France's Cesar Award best-film winners by year."
			},
			{
				name: 'choice',
				description: 'Creates collections of Critics Choice Award best-picture winners by year.'
			},
			{
				name: 'emmy',
				description: 'Creates collections of Emmy Award best-in-category winners by year.'
			},
			{
				name: 'golden',
				description:
					'Creates collections of Golden Globe best-picture and best-director winners by year.'
			},
			{
				name: 'spirit',
				description: 'Creates collections of Independent Spirit Award best-feature winners by year.'
			},
			{
				name: 'nfr',
				description: 'Creates collections of films inducted into the U.S. National Film Registry.'
			},
			{ name: 'pca', description: "Creates collections of People's Choice Award winners by year." },
			{
				name: 'razzie',
				description: 'Creates collections of Golden Raspberry (Razzie) worst-film winners by year.'
			},
			{
				name: 'sag',
				description: 'Creates collections of Screen Actors Guild Award winners by year.'
			},
			{
				name: 'sundance',
				description:
					'Creates collections of Sundance Film Festival Grand Jury Prize winners by year.'
			},
			{
				name: 'tiff',
				description:
					"Creates collections of Toronto International Film Festival People's Choice award winners by year."
			},
			{
				name: 'venice',
				description: 'Creates collections of Venice Film Festival Golden Lion winners by year.'
			}
		]
	}),
	Object.freeze({
		id: 'chart',
		label: 'Chart',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#chart',
		collections: [
			{
				name: 'separator_chart',
				description:
					'Creates a separator collection that visually groups all the chart-based collections together.'
			},
			{
				name: 'basic',
				description:
					'Creates basic charts such as Newly Released and New Episodes using only built-in Plex data.'
			},
			{
				name: 'anilist',
				description:
					'Creates collections from AniList charts such as AniList Popular and AniList Season.'
			},
			{
				name: 'imdb',
				description: 'Creates collections from IMDb charts such as IMDb Popular and IMDb Top 250.'
			},
			{
				name: 'letterboxd',
				description: 'Creates collections from Letterboxd lists such as the Letterboxd Top 250.'
			},
			{
				name: 'myanimelist',
				description:
					'Creates collections from MyAnimeList charts such as MyAnimeList Popular and Top Rated.'
			},
			{
				name: 'tautulli',
				description:
					'Creates collections from Tautulli watch statistics such as Plex Popular and Plex Watched.'
			},
			{
				name: 'tmdb',
				description:
					'Creates collections from TMDb charts such as TMDb Popular and TMDb Airing Today.'
			},
			{
				name: 'trakt',
				description:
					'Creates collections from Trakt charts such as Trakt Popular and Trakt Trending.'
			},
			{
				name: 'other_chart',
				description:
					'Creates miscellaneous charts such as AniDB Popular and Common Sense Selection.'
			},
			{ name: 'simkl', description: 'Creates collections from Simkl charts such as Simkl Popular.' }
		]
	}),
	Object.freeze({
		id: 'content',
		label: 'Content',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#content',
		collections: [
			{
				name: 'genre',
				description:
					'Creates a collection for each genre found in the library, such as Action, Drama, and Science Fiction.'
			},
			{
				name: 'franchise',
				description:
					'Creates inline franchise collections that group titles in a series together, such as the Star Wars Skywalker Saga.'
			},
			{
				name: 'universe',
				description:
					'Creates collections for shared fictional universes such as the Marvel Cinematic Universe and Wizarding World.'
			},
			{
				name: 'based',
				description:
					'Creates collections grouping titles by source material, such as Based on a Book or Based on a True Story.'
			},
			{
				name: 'collectionless',
				description:
					'Creates a single Collectionless collection gathering all items that do not belong to any other collection.'
			}
		]
	}),
	Object.freeze({
		id: 'content_rating',
		label: 'Content Rating',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#content-rating',
		collections: [
			{
				name: 'content_rating_us',
				description:
					'Creates a collection for each US (MPAA) content rating, such as G, PG, and NC-17.'
			},
			{
				name: 'content_rating_uk',
				description:
					'Creates a collection for each UK (BBFC) content rating, such as U, PG, and 12A.'
			},
			{
				name: 'content_rating_de',
				description:
					'Creates a collection for each German (FSK) content rating, such as Films 12, Films 16, and Films 18.'
			},
			{
				name: 'content_rating_au',
				description:
					'Creates a collection for each Australian (ACB) content rating, such as G, M, MA15+, and R18+.'
			},
			{
				name: 'content_rating_nz',
				description:
					'Creates a collection for each New Zealand content rating, such as G, M, R13, and R16.'
			},
			{
				name: 'content_rating_mal',
				description:
					'Creates a collection for each MyAnimeList content rating, such as G, PG-13, R, and Rx.'
			},
			{
				name: 'content_rating_cs',
				description:
					'Creates a collection for each Common Sense Media age-based rating, such as 1, 5, and 18.'
			}
		]
	}),
	Object.freeze({
		id: 'location',
		label: 'Location',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#location',
		collections: [
			{
				name: 'country',
				description:
					'Creates a collection for each country of origin found in the library, such as Belgium and India.'
			},
			{
				name: 'region',
				description:
					'Creates collections grouping titles by geographic region, such as Iberia and the Balkans.'
			},
			{
				name: 'continent',
				description:
					'Creates a collection for each continent of origin, such as Asia and North America.'
			}
		]
	}),
	Object.freeze({
		id: 'media',
		label: 'Media',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#media',
		collections: [
			{
				name: 'aspect',
				description: 'Creates a collection for each aspect ratio, such as 1.33, 1.78, and 2.77.'
			},
			{
				name: 'resolution',
				description:
					'Creates collections grouping titles by video resolution, such as 4K, 1080p, and 720p.'
			},
			{
				name: 'audio_language',
				description:
					'Creates a collection for each audio language, such as French Audio and Korean Audio.'
			},
			{
				name: 'subtitle_language',
				description:
					'Creates a collection for each subtitle language, such as German Subtitles and Swedish Subtitles.'
			}
		]
	}),
	Object.freeze({
		id: 'people',
		label: 'People',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#people',
		collections: [
			{
				name: 'actor',
				description:
					'Creates a collection for each of the most-featured actors in the library, such as Chris Hemsworth and Margot Robbie.'
			},
			{
				name: 'director',
				description:
					'Creates a collection for each of the most-featured directors, such as Steven Spielberg (Director).'
			},
			{
				name: 'producer',
				description:
					'Creates a collection for each of the most-featured producers, such as James Cameron (Producer).'
			},
			{
				name: 'writer',
				description:
					'Creates a collection for each of the most-featured writers, such as Lilly Wachowski (Writer).'
			}
		]
	}),
	Object.freeze({
		id: 'production',
		label: 'Production',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#production',
		collections: [
			{
				name: 'network',
				description:
					'Creates a collection for each TV network, such as Disney Channel and Lifetime.'
			},
			{
				name: 'streaming',
				description:
					"Creates a collection for each streaming service's catalog, such as Disney+ Movies and HBO Max Shows."
			},
			{
				name: 'studio',
				description:
					'Creates a collection for each studio, such as DreamWorks Studios and Walt Disney Pictures.'
			}
		]
	}),
	Object.freeze({
		id: 'time',
		label: 'Time',
		docUrl: 'https://kometa.wiki/en/latest/defaults/collections/#time',
		collections: [
			{
				name: 'seasonal',
				description: 'Creates seasonal and holiday collections, such as Easter and Christmas.'
			},
			{
				name: 'year',
				description:
					"Creates a 'Best of' collection for each release year, such as Best of 2010 and Best of 2019."
			},
			{
				name: 'decade',
				description:
					"Creates a 'Best of' collection for each decade, such as Best of 2010s and Best of 2020s."
			}
		]
	})
]);

export const DEFAULT_COLLECTIONS: readonly DefaultItem[] = Object.freeze(
	DEFAULT_COLLECTION_GROUPS.flatMap((g) => g.collections)
);

const KNOWN_NAMES: ReadonlySet<string> = new Set(DEFAULT_COLLECTIONS.map((c) => c.name));

/** True when `name` is a recognized Kometa default collection file. */
export function isKnownDefault(name: string): boolean {
	return KNOWN_NAMES.has(name);
}

/** Filter a list of default names to only the recognized ones (order preserved). */
export function knownDefaults(names: readonly string[]): string[] {
	return names.filter((n) => KNOWN_NAMES.has(n));
}
