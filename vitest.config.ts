import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Minimal config for pure-logic unit tests (no SvelteKit plugin needed — the
// server modules under test keep their testable logic free of $env/$app imports).
export default defineConfig({
	resolve: {
		alias: { $lib: resolve('./src/lib') }
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
