import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	it('verifies the right password and rejects the wrong one', async () => {
		const hash = await hashPassword('correct horse');
		expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
		expect(await verifyPassword('correct horse', hash)).toBe(true);
		expect(await verifyPassword('correct horsE', hash)).toBe(false);
	});

	it('salts every hash', async () => {
		expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
	});

	it('treats malformed hashes as a failed match', async () => {
		expect(await verifyPassword('x', 'plain-text')).toBe(false);
		expect(await verifyPassword('x', 'scrypt$0$8$1$abc$def')).toBe(false);
		expect(await verifyPassword('x', 'scrypt$16384$8$1$abc$tooshort')).toBe(false);
	});
});
