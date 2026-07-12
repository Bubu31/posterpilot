import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDataPaths, type DataPaths } from '$lib/server/data-paths';
import {
	finalizeAppliedPendingRestore,
	processPendingRestore,
	sha256File,
	type PendingRestoreContextV1
} from '$lib/server/db/pending-restore';
import type { BackupManifestV1 } from './manifest';
import { stageApplicationRestore } from './restore-staging';

let directory: string;
let bundle: string;
let paths: DataPaths;

const restore: PendingRestoreContextV1 = {
	restoreId: 'restore-1',
	backupId: 'backup-1',
	safetyBackupId: 'safety-1',
	manifestChecksum: 'a'.repeat(64),
	previewChecksum: 'b'.repeat(64),
	createdAt: '2026-07-10T21:00:00.000Z'
};

function bundleManifest(databaseChecksum: string): BackupManifestV1 {
	return {
		format: 'posterpilot-backup',
		formatVersion: 1,
		backupId: 'backup-1',
		trigger: 'manual',
		createdAt: '2026-07-01T10:00:00.000Z',
		appVersion: '0.8.0',
		schemaVersion: '100',
		snapshot: { method: 'vacuum_into', checkpointFallback: false },
		key: { mode: 'none', fingerprint: null, included: false },
		files: [{ path: 'database.db', role: 'database', sizeBytes: 12, sha256: databaseChecksum }],
		externalPaths: []
	};
}

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'posterpilot-stage-'));
	bundle = join(directory, 'bundle');
	paths = resolveDataPaths(
		`file:${join(directory, 'data', 'posterpilot.db')}`,
		join(directory, 'data', '.app-key')
	);
	mkdirSync(bundle, { recursive: true });
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('restore staging and boot commit', () => {
	it('retains rollback until readiness explicitly commits the orchestrated restore', async () => {
		const database = join(bundle, 'database.db');
		writeFileSync(database, 'new database');
		mkdirSync(join(directory, 'data'), { recursive: true });
		writeFileSync(paths.databaseFile!, 'old database');

		await stageApplicationRestore({
			dataPaths: paths,
			bundleDirectory: bundle,
			manifest: bundleManifest(sha256File(database)),
			restore
		});
		const result = processPendingRestore(paths);

		expect(result).toMatchObject({ status: 'applied', restore });
		expect(readFileSync(paths.databaseFile!, 'utf8')).toBe('new database');
		expect(existsSync(paths.restore.pendingMarker)).toBe(true);
		expect(existsSync(paths.restore.rollbackMarker)).toBe(true);

		finalizeAppliedPendingRestore(paths, restore.restoreId);
		expect(existsSync(paths.restore.pendingMarker)).toBe(false);
		expect(existsSync(paths.restore.rollbackDirectory)).toBe(false);
		expect(existsSync(paths.restore.stagingDirectory)).toBe(false);
	});

	it('publishes no marker and removes staging when copied bytes fail checksum verification', async () => {
		writeFileSync(join(bundle, 'database.db'), 'tampered');
		await expect(
			stageApplicationRestore({
				dataPaths: paths,
				bundleDirectory: bundle,
				manifest: bundleManifest('f'.repeat(64)),
				restore
			})
		).rejects.toThrow('staged_restore_checksum_mismatch');
		expect(existsSync(paths.restore.pendingMarker)).toBe(false);
		expect(existsSync(join(paths.restore.stagingDirectory, restore.restoreId))).toBe(false);
	});
});
