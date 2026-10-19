import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) =>
			err ? reject(err) : resolve(key)
		);
	});
}

/** Hashes a password as `scrypt$N$r$p$salt$hash` (base64url fields). */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH);
	const key = await derive(password, salt, PARAMS);
	return [
		'scrypt',
		PARAMS.N,
		PARAMS.r,
		PARAMS.p,
		salt.toString('base64url'),
		key.toString('base64url')
	].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [N, r, p] = parts.slice(1, 4).map(Number);
	if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
	const salt = Buffer.from(parts[4], 'base64url');
	const expected = Buffer.from(parts[5], 'base64url');
	if (expected.length !== KEY_LENGTH) return false;
	const actual = await derive(password, salt, { N, r, p, maxmem: 256 * N * r });
	return timingSafeEqual(actual, expected);
}
