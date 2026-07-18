import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '$env/dynamic/private';
import { resolveDataPaths } from '$lib/server/data-paths';
import { processPendingRestore } from './pending-restore';
import * as schema from './schema';

const dataPaths = resolveDataPaths(env.DATABASE_URL, env.APP_KEY_FILE);

// libsql writes a real file for `file:` URLs — make sure the parent dir exists.
if (dataPaths.databaseFile) {
	const dir = dirname(dataPaths.databaseFile);
	if (dir) mkdirSync(dir, { recursive: true });
}

// A restore marker is consumed before createClient can open the SQLite file.
// This ordering is deliberate: replacing a live database (or its key) is unsafe.
export const restoreBootResult = processPendingRestore(dataPaths);
if (restoreBootResult.status === 'rejected' || restoreBootResult.status === 'rolled_back') {
	console.error(
		`[restore] ${restoreBootResult.error}; marker retained at ${restoreBootResult.failedMarker}`
	);
}

export const databaseClient = createClient({ url: dataPaths.databaseUrl });

export const db = drizzle(databaseClient, { schema });

let migrated = false;

/** Apply pending migrations once per process. Called from hooks.server.ts on startup. */
export async function migrateDb(): Promise<void> {
	if (migrated) return;
	// Provider discovery runs every provider concurrently, and each one writes its own
	// outcome/candidates in a separate transaction. Plain SQLite rejects a write immediately
	// (SQLITE_BUSY) instead of waiting when another writer holds the lock, so without WAL +
	// a busy timeout, concurrent providers routinely fail each other's writes under normal
	// use (e.g. `mediux discovery failed ... SQLITE_BUSY: database is locked`). In-memory
	// test databases skip this — WAL needs a real file and tests don't have concurrent writers.
	if (dataPaths.databaseFile) {
		await databaseClient.execute('PRAGMA journal_mode = WAL;');
		await databaseClient.execute('PRAGMA busy_timeout = 5000;');
	}
	await migrate(db, { migrationsFolder: './drizzle' });
	migrated = true;
}
