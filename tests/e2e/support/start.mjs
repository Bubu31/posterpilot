import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFakeMediaServers } from './fake-media-servers.mjs';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const runtimeFile = fileURLToPath(new URL('../.runtime.json', import.meta.url));
const scenarioFile = fileURLToPath(new URL('../.scenario.json', import.meta.url));
const appPort = Number(process.env.POSTERPILOT_E2E_PORT ?? 14170);
const jellyfinPort = Number(process.env.POSTERPILOT_E2E_JELLYFIN_PORT ?? appPort + 1);
const plexPort = Number(process.env.POSTERPILOT_E2E_PLEX_PORT ?? appPort + 2);
const dataDirectory = mkdtempSync(join(tmpdir(), 'posterpilot-e2e-'));
const databaseFile = join(dataDirectory, 'posterpilot.db');
const kometaDirectory = join(dataDirectory, 'kometa');

for (const path of [runtimeFile, scenarioFile]) {
	try {
		unlinkSync(path);
	} catch {
		// A clean first run has no prior metadata file.
	}
}

const runtime = {
	appUrl: `http://127.0.0.1:${appPort}`,
	fakeJellyfinUrl: `http://127.0.0.1:${jellyfinPort}`,
	fakePlexUrl: `http://127.0.0.1:${plexPort}`,
	dataDirectory,
	databaseFile,
	kometaDirectory,
	kometaConfigPath: join(kometaDirectory, 'config.yml'),
	kometaAssetsDirectory: join(kometaDirectory, 'assets')
};
writeFileSync(runtimeFile, `${JSON.stringify(runtime, null, 2)}\n`, { mode: 0o600 });

const fakeServers = await startFakeMediaServers({ jellyfinPort, plexPort });
const application = spawn('bun', ['run', 'dev', '--host', '127.0.0.1', '--port', String(appPort)], {
	cwd: repositoryRoot,
	stdio: 'inherit',
	env: {
		...process.env,
		DATABASE_URL: `file:${databaseFile}`,
		APP_SECRET: 'posterpilot-local-e2e-secret',
		APP_LANGUAGE: 'en',
		LOG_DIR: join(dataDirectory, 'logs'),
		EVENT_RETENTION: '500',
		NO_COLOR: '1'
	}
});

let stopping = false;
async function stop(exitCode = 0) {
	if (stopping) return;
	stopping = true;
	if (application.exitCode === null) application.kill('SIGTERM');
	await fakeServers.close().catch(() => {});
	for (const path of [runtimeFile, scenarioFile]) {
		try {
			unlinkSync(path);
		} catch {
			// Best-effort cleanup after interrupted runs.
		}
	}
	rmSync(dataDirectory, { recursive: true, force: true });
	process.exit(exitCode);
}

process.once('SIGTERM', () => void stop(0));
process.once('SIGINT', () => void stop(130));
application.once('error', (error) => {
	console.error(`[e2e] could not start PosterPilot: ${error.message}`);
	void stop(1);
});
application.once('exit', (code, signal) => {
	if (stopping) return;
	console.error(`[e2e] PosterPilot exited early (${signal ?? code ?? 'unknown'}).`);
	void stop(code ?? 1);
});
