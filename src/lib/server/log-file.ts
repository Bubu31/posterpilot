import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { LOG_FILENAME, MAX_LOG_FILES, shouldRotate } from './log-rotate';

/** Default folder for the rotating log file; sits under the existing /data volume. */
const DEFAULT_LOG_DIR = './data/logs';

/** Resolve the configured log directory (env over default). */
function logDir(): string {
	const dir = env.LOG_DIR;
	return dir !== undefined && dir !== '' ? dir : DEFAULT_LOG_DIR;
}

/** Current byte size of `path`, or 0 when it does not exist / cannot be stat'd. */
function fileSize(path: string): number {
	try {
		return statSync(path).size;
	} catch {
		return 0;
	}
}

/**
 * Rotate the log chain: drop the oldest, then shift each file up by one
 * (`.N-1` → `.N`, …, base → `.1`). Best-effort — never throws.
 */
function rotate(dir: string): void {
	const base = join(dir, LOG_FILENAME);
	// Drop the oldest kept file so it does not survive the shift.
	const oldest = `${base}.${MAX_LOG_FILES}`;
	if (existsSync(oldest)) {
		try {
			rmSync(oldest);
		} catch {
			// ignore — best effort
		}
	}
	// Shift .N-1 → .N, working down to .1.
	for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
		const from = `${base}.${i}`;
		if (existsSync(from)) {
			try {
				renameSync(from, `${base}.${i + 1}`);
			} catch {
				// ignore — best effort
			}
		}
	}
	// Finally, the active log becomes .1.
	if (existsSync(base)) {
		try {
			renameSync(base, `${base}.1`);
		} catch {
			// ignore — best effort
		}
	}
}

/**
 * Append a single formatted event line to the rotating log file, creating the
 * directory and rotating on size as needed. Best-effort: any failure here must
 * never throw or propagate into the caller — file logging is a side channel.
 */
export function appendLogLine(line: string): void {
	try {
		const dir = logDir();
		mkdirSync(dir, { recursive: true });
		const base = join(dir, LOG_FILENAME);
		if (shouldRotate(fileSize(base))) rotate(dir);
		appendFileSync(base, `${line}\n`);
	} catch {
		// Never let file-logging failures propagate.
	}
}
