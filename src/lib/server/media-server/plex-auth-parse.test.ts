import { describe, expect, it } from 'vitest';
import {
	parseConnections,
	parseCreatedPin,
	parsePinToken,
	type RawResource
} from './plex-auth-parse';

describe('parseCreatedPin', () => {
	it('shapes a valid create response', () => {
		expect(parseCreatedPin({ id: 42, code: 'ABCD', expiresAt: '2026-01-01T00:00:00Z' })).toEqual({
			id: 42,
			code: 'ABCD',
			expiresAt: '2026-01-01T00:00:00Z'
		});
	});
	it('defaults expiresAt to null when absent', () => {
		expect(parseCreatedPin({ id: 1, code: 'X' })).toEqual({ id: 1, code: 'X', expiresAt: null });
	});
	it('throws on a malformed response', () => {
		expect(() => parseCreatedPin(null)).toThrow();
		expect(() => parseCreatedPin({ code: 'X' })).toThrow();
		expect(() => parseCreatedPin({ id: 1 })).toThrow();
	});
});

describe('parsePinToken', () => {
	it('returns the token when present', () => {
		expect(parsePinToken({ id: 1, code: 'X', authToken: 'tok123' })).toBe('tok123');
	});
	it('returns null while pending (null/empty/missing token)', () => {
		expect(parsePinToken({ id: 1, code: 'X', authToken: null })).toBeNull();
		expect(parsePinToken({ id: 1, code: 'X', authToken: '' })).toBeNull();
		expect(parsePinToken({ id: 1, code: 'X' })).toBeNull();
		expect(parsePinToken(null)).toBeNull();
	});
});

describe('parseConnections', () => {
	it('flattens server connections and tags local/relay/https', () => {
		const resources: RawResource[] = [
			{
				name: 'Living Room',
				provides: 'server',
				connections: [
					{ uri: 'https://1.2.3.4:32400', address: '1.2.3.4', local: false, protocol: 'https' },
					{
						uri: 'http://192.168.1.10:32400',
						address: '192.168.1.10',
						local: true,
						protocol: 'http'
					}
				]
			}
		];
		const result = parseConnections(resources);
		// Local first.
		expect(result[0]).toMatchObject({
			serverName: 'Living Room',
			uri: 'http://192.168.1.10:32400',
			local: true,
			relay: false,
			https: false
		});
		expect(result[1]).toMatchObject({ uri: 'https://1.2.3.4:32400', local: false, https: true });
	});

	it('adds a plain-IP option (no plex.direct) for local connections with a port', () => {
		const resources: RawResource[] = [
			{
				name: 'Unraid',
				provides: 'server',
				connections: [
					{
						uri: 'https://192-168-64-169.abc.plex.direct:32400',
						address: '192.168.64.169',
						port: 32400,
						local: true,
						protocol: 'https'
					}
				]
			}
		];
		const result = parseConnections(resources);
		expect(result.map((c) => c.uri)).toEqual([
			'http://192.168.64.169:32400',
			'https://192-168-64-169.abc.plex.direct:32400'
		]);
		expect(result[0]).toMatchObject({ local: true, relay: false, https: false });
	});

	it('orders local before remote, and non-relay before relay within a group', () => {
		const resources: RawResource[] = [
			{
				name: 'S',
				provides: 'server',
				connections: [
					{ uri: 'https://relay', local: false, relay: true, protocol: 'https' },
					{ uri: 'https://remote', local: false, relay: false, protocol: 'https' },
					{ uri: 'https://local-relay', local: true, relay: true, protocol: 'https' },
					{ uri: 'http://local', local: true, relay: false, protocol: 'http' }
				]
			}
		];
		expect(parseConnections(resources).map((c) => c.uri)).toEqual([
			'http://local',
			'https://local-relay',
			'https://remote',
			'https://relay'
		]);
	});

	it('skips resources that do not provide server and connections without a uri', () => {
		const resources: RawResource[] = [
			{ name: 'Player', provides: 'player', connections: [{ uri: 'http://x' }] },
			{
				name: 'Multi',
				provides: 'server,player',
				connections: [{ uri: 'http://ok' }, { address: 'no-uri' }]
			}
		];
		const result = parseConnections(resources);
		expect(result).toHaveLength(1);
		expect(result[0].uri).toBe('http://ok');
	});

	it('returns an empty array for null/undefined input', () => {
		expect(parseConnections(null)).toEqual([]);
		expect(parseConnections(undefined)).toEqual([]);
	});

	it('infers https from the uri scheme when protocol is absent', () => {
		const resources: RawResource[] = [
			{ provides: 'server', connections: [{ uri: 'https://no-protocol-field' }] }
		];
		expect(parseConnections(resources)[0].https).toBe(true);
	});
});
