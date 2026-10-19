import { describe, expect, it } from 'vitest';
import { BASE62, randomSlug } from './slug';

describe('randomSlug', () => {
	it('produces base62 slugs of the requested length', () => {
		for (let i = 0; i < 50; i++) {
			const slug = randomSlug(9);
			expect(slug).toHaveLength(9);
			expect(slug).toMatch(/^[0-9A-Za-z]+$/);
		}
	});

	it('maps the random source onto the alphabet', () => {
		const values = [0, 61, 10, 36];
		expect(randomSlug(4, () => values.shift()!)).toBe(`0${BASE62[61]}Aa`);
	});

	it('rejects invalid lengths', () => {
		expect(() => randomSlug(0)).toThrow(RangeError);
		expect(() => randomSlug(2.5)).toThrow(RangeError);
	});
});
