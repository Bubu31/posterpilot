// Pure rotation logic for the file logger. Kept free of I/O and `$env`/`$app`
// imports so it stays importable from unit tests (mirrors events-format.ts).

/** Base log filename inside the log directory. */
export const LOG_FILENAME = 'posterpilot.log';
/** Rotate once the active log grows past this many bytes (~5 MB). */
export const MAX_LOG_BYTES = 5 * 1024 * 1024;
/** How many rotated files to keep (posterpilot.log.1 … .MAX_LOG_FILES). */
export const MAX_LOG_FILES = 5;

/**
 * Rotation decision: does a file of `size` bytes exceed `cap`? Pure (no I/O), so
 * the "exceeds the cap → rotate" rule is unit-testable on its own.
 */
export function shouldRotate(size: number, cap: number = MAX_LOG_BYTES): boolean {
	return size > cap;
}
