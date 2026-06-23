/**
 * plex.tv auth + discovery client (server-side only).
 *
 * Implements the PIN-based token-acquire flow and connection discovery against
 * plex.tv. The product/client-identifier headers stay server-side. Response
 * shaping is delegated to the pure parsers in `plex-auth-parse.ts`.
 */

import {
	parseConnections,
	parseCreatedPin,
	parsePinToken,
	type CreatedPin,
	type RawPin,
	type RawResource
} from './plex-auth-parse';
import type { ConnectionCandidate } from './types';

const PLEX_TV = 'https://plex.tv/api/v2';
const PRODUCT = 'PosterPilot';

/** Headers every plex.tv call carries (product + stable client identifier). */
function plexTvHeaders(clientId: string): Record<string, string> {
	return {
		Accept: 'application/json',
		'X-Plex-Product': PRODUCT,
		'X-Plex-Client-Identifier': clientId
	};
}

/**
 * Create a strong PIN. Returns the pin id + code; the user authorizes the code at
 * https://plex.tv/link, after which {@link pollPin} returns the token.
 */
export async function createPin(clientId: string): Promise<CreatedPin> {
	const res = await fetch(`${PLEX_TV}/pins?strong=true`, {
		method: 'POST',
		headers: plexTvHeaders(clientId)
	});
	if (!res.ok) {
		throw new Error(`plex.tv rejected the PIN request: HTTP ${res.status} ${res.statusText}`);
	}
	const raw = (await res.json()) as RawPin;
	return parseCreatedPin(raw);
}

/**
 * Poll a PIN once. Returns the `authToken` when the user has authorized the code,
 * or null while still pending. Callers poll on an interval until non-null or the
 * PIN's expiry passes.
 */
export async function pollPin(id: number, clientId: string): Promise<string | null> {
	const res = await fetch(`${PLEX_TV}/pins/${encodeURIComponent(String(id))}`, {
		headers: plexTvHeaders(clientId)
	});
	if (!res.ok) {
		throw new Error(`plex.tv PIN poll failed: HTTP ${res.status} ${res.statusText}`);
	}
	const raw = (await res.json()) as RawPin;
	return parsePinToken(raw);
}

/**
 * Discover the user's Plex servers and their connections (local/remote/relay).
 * Requires a Plex token.
 */
export async function listConnections(
	token: string,
	clientId: string
): Promise<ConnectionCandidate[]> {
	const res = await fetch(`${PLEX_TV}/resources?includeHttps=1`, {
		headers: { ...plexTvHeaders(clientId), 'X-Plex-Token': token }
	});
	if (!res.ok) {
		throw new Error(`plex.tv resources lookup failed: HTTP ${res.status} ${res.statusText}`);
	}
	const raw = (await res.json()) as RawResource[];
	return parseConnections(raw);
}
