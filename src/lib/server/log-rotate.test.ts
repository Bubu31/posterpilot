import { describe, expect, it } from 'vitest';
import { MAX_LOG_BYTES, shouldRotate } from './log-rotate';

describe('shouldRotate', () => {
	it('does not rotate below the cap', () => {
		expect(shouldRotate(0, 100)).toBe(false);
		expect(shouldRotate(99, 100)).toBe(false);
	});

	it('does not rotate exactly at the cap', () => {
		expect(shouldRotate(100, 100)).toBe(false);
	});

	it('rotates once the size exceeds the cap', () => {
		expect(shouldRotate(101, 100)).toBe(true);
	});

	it('defaults to the ~5 MB cap', () => {
		expect(shouldRotate(MAX_LOG_BYTES)).toBe(false);
		expect(shouldRotate(MAX_LOG_BYTES + 1)).toBe(true);
	});
});
