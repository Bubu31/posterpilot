import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const url = env.DATABASE_URL || 'file:./data/posterpilot.db';

// libsql writes a real file for `file:` URLs — make sure the parent dir exists.
if (url.startsWith('file:')) {
	const path = url.slice('file:'.length);
	const dir = dirname(path);
	if (dir) mkdirSync(dir, { recursive: true });
}

const client = createClient({ url });

export const db = drizzle(client, { schema });

let migrated = false;

/** Apply pending migrations once per process. Called from hooks.server.ts on startup. */
export async function migrateDb(): Promise<void> {
	if (migrated) return;
	await migrate(db, { migrationsFolder: './drizzle' });
	migrated = true;
}
