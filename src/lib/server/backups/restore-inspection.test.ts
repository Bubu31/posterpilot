import { createClient, type Client } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectRestoreDatabase } from './restore-inspection';

const clients: Client[] = [];
const directories: string[] = [];

function snapshotPath(): string {
	const directory = mkdtempSync(join(tmpdir(), 'posterpilot-restore-inspection-'));
	directories.push(directory);
	return join(directory, 'snapshot.db');
}

async function createSnapshot(): Promise<{ client: Client; path: string }> {
	const path = snapshotPath();
	const client = createClient({ url: `file:${path}` });
	clients.push(client);
	await client.execute('PRAGMA foreign_keys = ON');
	await client.execute('CREATE TABLE server_instances (id text PRIMARY KEY NOT NULL)');
	await client.execute(`
		CREATE TABLE media_items (
			id integer PRIMARY KEY NOT NULL,
			server_instance_id text NOT NULL REFERENCES server_instances(id)
		)
	`);
	await client.execute(`
		CREATE TABLE poster_candidates (
			id integer PRIMARY KEY NOT NULL,
			server_instance_id text NOT NULL REFERENCES server_instances(id),
			media_item_id integer NOT NULL REFERENCES media_items(id)
		)
	`);
	await client.execute(`
		CREATE TABLE __drizzle_migrations (
			id integer PRIMARY KEY NOT NULL,
			hash text NOT NULL,
			created_at integer NOT NULL
		)
	`);
	await client.execute({
		sql: 'INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (1, ?, 100)',
		args: ['a'.repeat(64)]
	});
	await client.execute("INSERT INTO server_instances (id) VALUES ('server-a'), ('server-b')");
	await client.execute("INSERT INTO media_items (id, server_instance_id) VALUES (10, 'server-b')");
	return { client, path };
}

afterEach(async () => {
	await Promise.all(clients.splice(0).map((client) => client.close()));
	for (const directory of directories.splice(0))
		rmSync(directory, { recursive: true, force: true });
});

describe('restore database integrity inspection', () => {
	it('rejects an A-to-B item relationship even when ordinary foreign keys are valid', async () => {
		const { client, path } = await createSnapshot();
		await client.execute(
			"INSERT INTO poster_candidates (id, server_instance_id, media_item_id) VALUES (1, 'server-a', 10)"
		);
		const integrity = await client.execute('PRAGMA integrity_check(1)');
		const foreignKeys = await client.execute('PRAGMA foreign_key_check');
		expect(integrity.rows[0]?.integrity_check ?? integrity.rows[0]?.[0]).toBe('ok');
		expect(foreignKeys.rows).toHaveLength(0);
		client.close();
		clients.splice(clients.indexOf(client), 1);

		await expect(inspectRestoreDatabase(path, null)).resolves.toMatchObject({
			status: 'integrity_failed'
		});
	});

	it('rejects an orphan reported by foreign_key_check even when integrity_check is ok', async () => {
		const { client, path } = await createSnapshot();
		await client.execute('PRAGMA foreign_keys = OFF');
		await client.execute(
			"INSERT INTO poster_candidates (id, server_instance_id, media_item_id) VALUES (1, 'server-a', 999)"
		);
		const integrity = await client.execute('PRAGMA integrity_check(1)');
		const foreignKeys = await client.execute('PRAGMA foreign_key_check');
		expect(integrity.rows[0]?.integrity_check ?? integrity.rows[0]?.[0]).toBe('ok');
		expect(foreignKeys.rows.length).toBeGreaterThan(0);
		client.close();
		clients.splice(clients.indexOf(client), 1);

		await expect(inspectRestoreDatabase(path, null)).resolves.toMatchObject({
			status: 'integrity_failed'
		});
	});
});
