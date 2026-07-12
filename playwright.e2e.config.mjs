import { defineConfig, devices } from '@playwright/test';

const appPort = Number(process.env.POSTERPILOT_E2E_PORT ?? 14170);
const baseURL = `http://127.0.0.1:${appPort}`;

export default defineConfig({
	testDir: './tests/e2e/specs',
	outputDir: './test-results/e2e',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	timeout: 90_000,
	expect: { timeout: 15_000 },
	reporter: process.env.CI
		? [['line'], ['html', { outputFolder: 'playwright-report/e2e', open: 'never' }]]
		: [['list'], ['html', { outputFolder: 'playwright-report/e2e', open: 'never' }]],
	use: {
		...devices['Desktop Chrome'],
		baseURL,
		locale: 'en-US',
		timezoneId: 'UTC',
		colorScheme: 'dark',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	webServer: {
		command: 'node ./tests/e2e/support/start.mjs',
		url: `${baseURL}/api/health`,
		reuseExistingServer: false,
		timeout: 120_000,
		stdout: 'pipe',
		stderr: 'pipe'
	},
	projects: [
		{
			name: 'bootstrap',
			testMatch: /00-bootstrap\.setup\.e2e\.mjs/
		},
		{
			name: 'product-flows',
			testMatch: /10-product-flows\.e2e\.mjs/,
			dependencies: ['bootstrap']
		},
		{
			name: 'multi-server-kometa',
			testMatch: /20-multi-server-kometa\.e2e\.mjs/,
			dependencies: ['product-flows']
		},
		{
			name: 'authentication',
			testMatch: /30-authentication\.e2e\.mjs/,
			dependencies: ['multi-server-kometa']
		}
	]
});
