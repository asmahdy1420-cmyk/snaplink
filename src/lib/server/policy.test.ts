import { describe, expect, it } from 'vitest';
import { linkStatus } from './policy';

const now = new Date('2026-10-19T12:00:00Z');
const base = { expiresAt: null, maxClicks: null, clickCount: 0 };

describe('linkStatus', () => {
	it('is active without limits', () => {
		expect(linkStatus({ ...base, clickCount: 10_000 }, now)).toBe('active');
	});

	it('expires at the exact expiry instant', () => {
		expect(linkStatus({ ...base, expiresAt: new Date(now.getTime() + 1) }, now)).toBe('active');
		expect(linkStatus({ ...base, expiresAt: now }, now)).toBe('expired');
	});

	it('is exhausted once the click count reaches the limit', () => {
		expect(linkStatus({ ...base, maxClicks: 3, clickCount: 2 }, now)).toBe('active');
		expect(linkStatus({ ...base, maxClicks: 3, clickCount: 3 }, now)).toBe('exhausted');
	});

	it('reports expiry before exhaustion', () => {
		const link = { expiresAt: new Date(0), maxClicks: 1, clickCount: 1 };
		expect(linkStatus(link, now)).toBe('expired');
	});
});
