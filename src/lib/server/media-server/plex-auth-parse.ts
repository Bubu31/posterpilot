/**
 * Pure parsers for the plex.tv auth/discovery responses.
 *
 * No I/O or framework imports — unit-tested in isolation. The network client in
 * `plex-auth.ts` does the fetches and delegates shaping to these functions.
 */

import type { ConnectionCandidate } from './types';

/** Raw `GET /api/v2/pins/{id}` response fields we read. */
export interface RawPin {
	id?: number;
	code?: string;
	authToken?: string | null;
	expiresAt?: string;
}

/** A created PIN: id + code shown to the user, plus optional expiry. */
export interface CreatedPin {
	id: number;
	code: string;
	expiresAt: string | null;
}

/** Shape the create-PIN response into a `CreatedPin`, or throw if malformed. */
export function parseCreatedPin(raw: RawPin | undefined | null): CreatedPin {
	if (!raw || typeof raw.id !== 'number' || typeof raw.code !== 'string') {
		throw new Error('plex.tv returned an unexpected PIN response');
	}
	return { id: raw.id, code: raw.code, expiresAt: raw.expiresAt ?? null };
}

/** Extract the auth token from a poll response; null until plex.tv grants it. */
export function parsePinToken(raw: RawPin | undefined | null): string | null {
	const token = raw?.authToken;
	return typeof token === 'string' && token.length > 0 ? token : null;
}

/** Raw connection entry inside a plex.tv resource. */
interface RawConnection {
	uri?: string;
	address?: string;
	port?: number | string;
	local?: boolean;
	relay?: boolean;
	protocol?: string;
}

/** Raw `GET /api/v2/resources` entry we care about. */
export interface RawResource {
	name?: string;
	provides?: string;
	connections?: RawConnection[];
}

/**
 * Parse the plex.tv resources response into a flat list of connection candidates,
 * keeping only resources that provide `server`. Each connection is tagged
 * local/relay/https. Local connections are surfaced first (faster), then remote,
 * with relay connections ordered last within each group.
 */
export function parseConnections(
	resources: RawResource[] | undefined | null
): ConnectionCandidate[] {
	if (!Array.isArray(resources)) return [];
	const candidates: ConnectionCandidate[] = [];

	for (const resource of resources) {
		if (!resource?.provides || !resource.provides.split(',').includes('server')) continue;
		const serverName = resource.name ?? 'Plex Server';
		for (const conn of resource.connections ?? []) {
			if (!conn?.uri) continue;
			const local = conn.local === true;
			const relay = conn.relay === true;
			const address = conn.address ?? '';
			// For local connections, offer a plain-IP URL (no plex.direct cert host)
			// first — simpler/faster on a LAN. The plex.direct URI stays as a fallback.
			if (local && !relay && address && conn.port) {
				candidates.push({
					serverName,
					uri: `http://${address}:${conn.port}`,
					address,
					local: true,
					relay: false,
					https: false
				});
			}
			candidates.push({
				serverName,
				uri: conn.uri,
				address,
				local,
				relay,
				https: conn.protocol === 'https' || conn.uri.startsWith('https')
			});
		}
	}

	// Local first, then remote; within each group non-relay before relay.
	return candidates.sort((a, b) => {
		if (a.local !== b.local) return a.local ? -1 : 1;
		if (a.relay !== b.relay) return a.relay ? 1 : -1;
		return 0;
	});
}
