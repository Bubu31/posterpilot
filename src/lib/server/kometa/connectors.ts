/**
 * Catalog of Kometa service-connector sections and their fields, used to render
 * the Connections forms and to drive the consistency checker. Field keys are
 * verified against kometa.wiki (current docs). Auto-populated auth blocks
 * (`trakt.authorization`, `mal.authorization.*`) are intentionally excluded —
 * Kometa writes those itself and merge mode preserves them.
 *
 * Pure data — safe to import from server orchestration and (via the page load)
 * the client.
 */

export type FieldType = 'text' | 'secret' | 'url' | 'bool' | 'int';

export interface ConnectorField {
	key: string;
	type: FieldType;
	required?: boolean;
	note?: string;
}

export interface Connector {
	/** Top-level `config.yml` section key. */
	section: string;
	/** Human label (also an i18n key suffix `kometa_connector_<section>`). */
	label: string;
	/** Whether a live connection test is meaningful. */
	testable?: boolean;
	/**
	 * For plex/tmdb the core credential fields are sourced from PosterPilot's own
	 * stored settings, not entered here. True means "show as managed-by-PosterPilot".
	 */
	credsFromPosterPilot?: boolean;
	fields: readonly ConnectorField[];
}

export const CONNECTORS: readonly Connector[] = Object.freeze([
	{
		section: 'plex',
		label: 'Plex',
		testable: true,
		credsFromPosterPilot: true,
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'token', type: 'secret', required: true },
			{ key: 'timeout', type: 'int' },
			{ key: 'db_cache', type: 'int' },
			{ key: 'clean_bundles', type: 'bool' },
			{ key: 'empty_trash', type: 'bool' },
			{ key: 'optimize', type: 'bool' },
			{ key: 'verify_ssl', type: 'bool' }
		]
	},
	{
		section: 'tmdb',
		label: 'TMDB',
		testable: true,
		credsFromPosterPilot: true,
		fields: [
			{ key: 'apikey', type: 'secret', required: true },
			{ key: 'language', type: 'text' },
			{ key: 'region', type: 'text' },
			{ key: 'cache_expiration', type: 'int' }
		]
	},
	{
		section: 'tautulli',
		label: 'Tautulli',
		testable: true,
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'apikey', type: 'secret', required: true }
		]
	},
	{
		section: 'trakt',
		label: 'Trakt',
		fields: [
			{ key: 'client_id', type: 'secret', required: true },
			{ key: 'client_secret', type: 'secret', required: true },
			{ key: 'pin', type: 'secret', note: 'Used once to authorize; Kometa fills authorization.' },
			{ key: 'force_refresh', type: 'bool' }
		]
	},
	{
		section: 'mdblist',
		label: 'MDBList',
		fields: [
			{ key: 'apikey', type: 'secret', required: true },
			{ key: 'cache_expiration', type: 'int' }
		]
	},
	{
		section: 'omdb',
		label: 'OMDb',
		fields: [
			{ key: 'apikey', type: 'secret', required: true },
			{ key: 'cache_expiration', type: 'int' }
		]
	},
	{
		section: 'github',
		label: 'GitHub',
		fields: [{ key: 'token', type: 'secret', note: 'Optional — only to avoid GitHub rate limits.' }]
	},
	{
		section: 'radarr',
		label: 'Radarr',
		testable: true,
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'token', type: 'secret', required: true },
			{ key: 'add_missing', type: 'bool' },
			{ key: 'add_existing', type: 'bool' },
			{ key: 'upgrade_existing', type: 'bool' },
			{ key: 'monitor_existing', type: 'bool' },
			{ key: 'root_folder_path', type: 'text' },
			{ key: 'monitor', type: 'bool' },
			{ key: 'availability', type: 'text', note: 'announced | cinemas | released | db' },
			{ key: 'quality_profile', type: 'text' },
			{ key: 'tag', type: 'text' },
			{ key: 'search', type: 'bool' },
			{ key: 'radarr_path', type: 'text' },
			{ key: 'plex_path', type: 'text' },
			{ key: 'ignore_cache', type: 'bool' }
		]
	},
	{
		section: 'sonarr',
		label: 'Sonarr',
		testable: true,
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'token', type: 'secret', required: true },
			{ key: 'add_missing', type: 'bool' },
			{ key: 'add_existing', type: 'bool' },
			{ key: 'upgrade_existing', type: 'bool' },
			{ key: 'monitor_existing', type: 'bool' },
			{ key: 'root_folder_path', type: 'text' },
			{
				key: 'monitor',
				type: 'text',
				note: 'all | future | missing | existing | pilot | firstSeason | latestSeason | none'
			},
			{ key: 'quality_profile', type: 'text' },
			{ key: 'language_profile', type: 'text' },
			{ key: 'series_type', type: 'text', note: 'standard | anime | daily' },
			{ key: 'season_folder', type: 'bool' },
			{ key: 'tag', type: 'text' },
			{ key: 'search', type: 'bool' },
			{ key: 'cutoff_search', type: 'bool' },
			{ key: 'sonarr_path', type: 'text' },
			{ key: 'plex_path', type: 'text' },
			{ key: 'ignore_cache', type: 'bool' }
		]
	},
	{
		section: 'notifiarr',
		label: 'Notifiarr',
		fields: [{ key: 'apikey', type: 'secret', required: true }]
	},
	{
		section: 'gotify',
		label: 'Gotify',
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'token', type: 'secret', required: true }
		]
	},
	{
		section: 'ntfy',
		label: 'ntfy',
		fields: [
			{ key: 'url', type: 'url', required: true },
			{ key: 'token', type: 'secret' },
			{ key: 'topic', type: 'text', required: true }
		]
	},
	{
		section: 'anidb',
		label: 'AniDB',
		fields: [
			{ key: 'language', type: 'text' },
			{ key: 'cache_expiration', type: 'int' },
			{ key: 'enable_mature', type: 'bool' }
		]
	},
	{
		section: 'mal',
		label: 'MyAnimeList',
		fields: [
			{ key: 'client_id', type: 'secret', required: true },
			{ key: 'client_secret', type: 'secret', required: true },
			{ key: 'localhost_url', type: 'url' }
		]
	}
]);

const BY_SECTION = new Map(CONNECTORS.map((c) => [c.section, c]));

/** Resolve a connector by its section key. */
export function connectorBySection(section: string): Connector | undefined {
	return BY_SECTION.get(section);
}

/** Set of field keys that are secrets, per connector section (for masking/redaction). */
export function secretFieldKeys(section: string): Set<string> {
	const c = BY_SECTION.get(section);
	return new Set((c?.fields ?? []).filter((f) => f.type === 'secret').map((f) => f.key));
}

/**
 * Default collection/overlay/chart names that REQUIRE a connector section to be
 * configured. Used by the consistency checker. Verified against kometa.wiki.
 */
export const CONNECTOR_DEPENDENCIES: readonly { feature: string; requiresConnector: string }[] =
	Object.freeze([
		{ feature: 'trakt', requiresConnector: 'trakt' },
		{ feature: 'tautulli', requiresConnector: 'tautulli' },
		{ feature: 'myanimelist', requiresConnector: 'mal' },
		{ feature: 'anilist', requiresConnector: 'anidb' },
		{ feature: 'ratings', requiresConnector: 'mdblist' }
	]);
