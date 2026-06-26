import { describe, it, expect } from 'vitest';
import { parseSelectionInput } from './selection';

const EMPTY = {
	libraries: [],
	defaults: {},
	settings: {},
	connections: {},
	overlays: {},
	operations: {},
	librarySettings: {},
	webhooks: {}
};

describe('parseSelectionInput', () => {
	it('returns empty selections for junk input', () => {
		expect(parseSelectionInput(null)).toEqual(EMPTY);
		expect(parseSelectionInput('nope')).toEqual(EMPTY);
		expect(parseSelectionInput({ libraries: 'x' })).toEqual(EMPTY);
	});

	it('coerces a well-formed body across all sections', () => {
		const out = parseSelectionInput({
			libraries: [1, '2'],
			defaults: { '1': ['genre', 5], bad: 'no' },
			settings: { asset_directory: '/a', n: 3 },
			connections: { tautulli: { url: 'http://t', apikey: 'k', bad: 9 } },
			overlays: { '1': ['mediastinger'] },
			operations: { '1': { assets_for_all: 'true' } },
			librarySettings: { '1': { asset_directory: '/m' } },
			webhooks: { error: 'https://h' }
		});
		expect(out.libraries).toEqual(['1', '2']);
		expect(out.defaults).toEqual({ '1': ['genre', '5'] });
		expect(out.settings).toEqual({ asset_directory: '/a' });
		expect(out.connections).toEqual({ tautulli: { url: 'http://t', apikey: 'k' } });
		expect(out.overlays).toEqual({ '1': ['mediastinger'] });
		expect(out.operations).toEqual({ '1': { assets_for_all: 'true' } });
		expect(out.librarySettings).toEqual({ '1': { asset_directory: '/m' } });
		expect(out.webhooks).toEqual({ error: 'https://h' });
	});
});
