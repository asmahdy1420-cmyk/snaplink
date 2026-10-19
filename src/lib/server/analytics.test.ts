import { describe, expect, it } from 'vitest';
import { fillDays, parseRange, rangeStart } from './analytics';

describe('analytics helpers', () => {
	it('fills gaps in a daily series with zeros', () => {
		const start = new Date('2026-10-17T00:00:00Z');
		const filled = fillDays([{ day: '2026-10-18', clicks: 4, visitors: 2 }], start, 3);
		expect(filled).toEqual([
			{ day: '2026-10-17', clicks: 0, visitors: 0 },
			{ day: '2026-10-18', clicks: 4, visitors: 2 },
			{ day: '2026-10-19', clicks: 0, visitors: 0 }
		]);
	});

	it('starts the range at midnight UTC so today is included', () => {
		expect(rangeStart(new Date('2026-10-19T15:45:00Z'), 7).toISOString()).toBe(
			'2026-10-13T00:00:00.000Z'
		);
	});

	it('accepts only the supported ranges', () => {
		expect(parseRange('7')).toBe(7);
		expect(parseRange('90')).toBe(90);
		expect(parseRange('365')).toBe(30);
		expect(parseRange(null)).toBe(30);
	});
});
