import { randomInt } from 'node:crypto';

export const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Returns an integer in `[0, max)`. Injectable so collisions can be tested deterministically. */
export type RandomInt = (max: number) => number;

const secureRandomInt: RandomInt = (max) => randomInt(max);

/** Builds a random base62 slug using a cryptographically secure source by default. */
export function randomSlug(length = 7, random: RandomInt = secureRandomInt): string {
	if (!Number.isInteger(length) || length < 1) {
		throw new RangeError(`Slug length must be a positive integer, got ${length}`);
	}
	let slug = '';
	for (let i = 0; i < length; i++) {
		slug += BASE62[random(BASE62.length)];
	}
	return slug;
}
