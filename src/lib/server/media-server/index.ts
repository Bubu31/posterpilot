/**
 * Media-server provider factory + public surface of the module.
 *
 * `getActiveServer(config)` constructs the provider for the configured server
 * type with its credentials bound. The whole app (sync, discover, apply, the
 * settings test) obtains a `MediaServer` from here and never imports a provider
 * directly.
 */

import { requiredKeysFor, type AppConfig, type ServerType } from '$lib/server/config';
import { plexProvider } from './plex';
import { embyLikeProvider } from './emby';
import { mediaServerIdentity, normalizeMediaServerCapabilities } from './capabilities';
import type { MediaServer } from './types';

export type {
	MediaServer,
	ServerType,
	ServerItem,
	ServerChild,
	ServerLibrary,
	ServerNativeCollection,
	ServerNativeCollectionMember,
	ConnectionResult,
	ConnectionCandidate,
	LockField,
	MediaServerIdentity,
	MediaServerCapabilities,
	CapabilitySupport,
	ServerArtwork,
	ServerArtworkKind
} from './types';

export {
	defaultMediaServerCapabilities,
	mediaServerIdentity,
	normalizeMediaServerCapabilities
} from './capabilities';

/** Which config keys the active server type needs (re-exported for callers). */
export { requiredKeysFor } from '$lib/server/config';

/** Result of attempting to resolve the active provider. */
export interface ActiveServerResult {
	server: MediaServer | null;
	/** Config keys that are missing for the active type; empty when `server` is set. */
	missing: string[];
}

/** Credentials-bound input used by the named-server registry. */
export interface MediaServerConnection {
	instanceId?: string | null;
	name?: string | null;
	type: ServerType;
	baseUrl: string;
	credential: string;
	capabilities?: Record<string, unknown> | null;
}

/**
 * Construct a provider for one explicit server instance. Keeping this factory here
 * prevents apply/jobs from importing provider implementations or falling back to
 * whichever legacy server happens to be active.
 */
export function createMediaServer(connection: MediaServerConnection): MediaServer {
	const context = {
		identity: mediaServerIdentity(connection.type, connection.instanceId, connection.name),
		capabilities: normalizeMediaServerCapabilities(connection.type, connection.capabilities)
	};
	switch (connection.type) {
		case 'plex':
			return plexProvider(connection.baseUrl, connection.credential, context);
		case 'jellyfin':
			return embyLikeProvider(connection.baseUrl, connection.credential, 'jellyfin', context);
		case 'emby':
			return embyLikeProvider(connection.baseUrl, connection.credential, 'emby', context);
	}
}

/**
 * Resolve the active provider for the configured server type, binding its
 * credentials. Returns `{ server: null, missing }` when those credentials are
 * absent rather than producing a half-configured client.
 */
export function resolveActiveServer(config: AppConfig): ActiveServerResult {
	const required = requiredKeysFor(config.serverType);
	const missing = required.filter((k) => {
		const v = config[k];
		return v === null || v === undefined || v === '';
	});
	if (missing.length) return { server: null, missing };

	const connection =
		config.serverType === 'plex'
			? { type: 'plex' as const, baseUrl: config.plexUrl!, credential: config.plexToken! }
			: config.serverType === 'jellyfin'
				? {
						type: 'jellyfin' as const,
						baseUrl: config.jellyfinUrl!,
						credential: config.jellyfinApiKey!
					}
				: {
						type: 'emby' as const,
						baseUrl: config.embyUrl!,
						credential: config.embyApiKey!
					};
	return { server: createMediaServer(connection), missing: [] };
}

/**
 * Convenience accessor: the active `MediaServer`, or null when unconfigured.
 * Use {@link resolveActiveServer} when the missing keys matter.
 */
export function getActiveServer(config: AppConfig): MediaServer | null {
	return resolveActiveServer(config).server;
}

/** A short human label for a server type (for messages / UI). */
export function serverTypeLabel(type: ServerType): string {
	switch (type) {
		case 'jellyfin':
			return 'Jellyfin';
		case 'emby':
			return 'Emby';
		case 'plex':
		default:
			return 'Plex';
	}
}
