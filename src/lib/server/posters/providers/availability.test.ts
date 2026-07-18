import { describe, expect, it } from 'vitest';
import type { AppConfig } from '$lib/server/config';
import { providerAvailability } from './availability';

const config = {
	providerMediux: true,
	providerTmdb: true,
	providerFanart: true,
	providerThePosterDb: false,
	tmdbKey: 'tmdb-key',
	fanartKey: null,
	thePosterDbUsername: null,
	thePosterDbPassword: null
} as AppConfig;

describe('providerAvailability', () => {
	it('distinguishes disabled providers from missing credentials', () => {
		expect(providerAvailability('mediux', config)).toBe('available');
		expect(providerAvailability('theposterdb', config)).toBe('disabled');
		expect(providerAvailability('fanarttv', config)).toBe('missing_credential');
	});

	it('requires the shared TMDB credential when TMDB artwork is enabled', () => {
		expect(providerAvailability('tmdb', { ...config, tmdbKey: null })).toBe('missing_credential');
	});

	it('requires both ThePosterDB credentials once enabled', () => {
		const enabled = { ...config, providerThePosterDb: true };
		expect(providerAvailability('theposterdb', enabled)).toBe('missing_credential');
		expect(providerAvailability('theposterdb', { ...enabled, thePosterDbUsername: 'me' })).toBe(
			'missing_credential'
		);
		expect(
			providerAvailability('theposterdb', {
				...enabled,
				thePosterDbUsername: 'me',
				thePosterDbPassword: 'secret'
			})
		).toBe('available');
	});
});
