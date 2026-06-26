import { describe, it, expect } from 'vitest';
import {
	CONNECTORS,
	connectorBySection,
	secretFieldKeys,
	CONNECTOR_DEPENDENCIES
} from './connectors';
import { OVERLAY_DEFAULTS, isKnownOverlay, knownOverlays } from './overlay-defaults';
import { OPERATIONS, isKnownOperation, operationByKey } from './operations';

describe('connectors catalog', () => {
	it('has the 14 expected sections, no dups', () => {
		const sections = CONNECTORS.map((c) => c.section);
		expect(sections).toContain('tautulli');
		expect(sections).toContain('trakt');
		expect(sections.length).toBe(14);
		expect(new Set(sections).size).toBe(14);
	});

	it('marks plex/tmdb as PosterPilot-sourced creds', () => {
		expect(connectorBySection('plex')?.credsFromPosterPilot).toBe(true);
		expect(connectorBySection('tmdb')?.credsFromPosterPilot).toBe(true);
	});

	it('identifies secret fields per section', () => {
		expect([...secretFieldKeys('tautulli')]).toEqual(['apikey']);
		expect(secretFieldKeys('trakt').has('client_secret')).toBe(true);
	});

	it('excludes auto-populated auth blocks and the bogus mal.cache_expiration', () => {
		const mal = connectorBySection('mal');
		const keys = mal?.fields.map((f) => f.key) ?? [];
		expect(keys).not.toContain('cache_expiration');
		expect(keys.some((k) => k.startsWith('authorization'))).toBe(false);
		const trakt = connectorBySection('trakt');
		expect(trakt?.fields.some((f) => f.key === 'authorization')).toBe(false);
	});

	it('maps connector dependencies', () => {
		const byFeature = new Map(CONNECTOR_DEPENDENCIES.map((d) => [d.feature, d.requiresConnector]));
		expect(byFeature.get('trakt')).toBe('trakt');
		expect(byFeature.get('tautulli')).toBe('tautulli');
		expect(byFeature.get('ratings')).toBe('mdblist');
	});
});

describe('overlay catalog', () => {
	it('knows mediastinger and rejects junk', () => {
		expect(isKnownOverlay('mediastinger')).toBe(true);
		expect(isKnownOverlay('resolution')).toBe(true);
		expect(isKnownOverlay('not_real')).toBe(false);
	});
	it('knownOverlays filters', () => {
		expect(knownOverlays(['mediastinger', 'nope', 'ribbon'])).toEqual(['mediastinger', 'ribbon']);
	});
	it('has no duplicates', () => {
		expect(new Set(OVERLAY_DEFAULTS).size).toBe(OVERLAY_DEFAULTS.length);
	});
});

describe('operations catalog', () => {
	it('knows operations and their types', () => {
		expect(isKnownOperation('assets_for_all')).toBe(true);
		expect(operationByKey('assets_for_all')?.type).toBe('bool');
		expect(operationByKey('mass_genre_update')?.type).toBe('enum');
		expect(isKnownOperation('nope')).toBe(false);
	});
	it('has no duplicate keys', () => {
		const keys = OPERATIONS.map((o) => o.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
