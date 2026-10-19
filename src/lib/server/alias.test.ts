import { describe, expect, it } from 'vitest';
import { validateAlias } from './alias';

describe('validateAlias', () => {
	it('accepts letters, digits, dashes and underscores', () => {
		expect(validateAlias('  spring-sale_2026 ')).toEqual({ ok: true, alias: 'spring-sale_2026' });
	});

	it('rejects reserved words regardless of case', () => {
		for (const word of ['admin', 'ADMIN', 'Login', 'healthz', 'unlock']) {
			expect(validateAlias(word).ok).toBe(false);
		}
	});

	it('enforces length and character rules', () => {
		expect(validateAlias('ab').ok).toBe(false);
		expect(validateAlias('a'.repeat(33)).ok).toBe(false);
		expect(validateAlias('-leading').ok).toBe(false);
		expect(validateAlias('has space').ok).toBe(false);
		expect(validateAlias('dots.not.ok').ok).toBe(false);
		expect(validateAlias('ünïcode').ok).toBe(false);
	});
});
