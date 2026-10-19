import { describe, expect, it } from 'vitest';
import { countryCode, referrerHost, utcDay, visitorHash } from './visit';

describe('visit helpers', () => {
	it('reduces referrers to a hostname and treats internal ones as direct', () => {
		expect(referrerHost('https://www.Google.com/search?q=secret')).toBe('google.com');
		expect(referrerHost('https://sn.test/admin', 'sn.test')).toBeNull();
		expect(referrerHost('android-app://com.slack')).toBeNull();
		expect(referrerHost('not a url')).toBeNull();
		expect(referrerHost(null)).toBeNull();
	});

	it('accepts only two-letter country codes', () => {
		expect(countryCode(' de ')).toBe('DE');
		expect(countryCode('XX')).toBeNull();
		expect(countryCode('DEU')).toBeNull();
		expect(countryCode(null)).toBeNull();
	});

	it('hashes visitors without exposing the IP and varies with the salt', () => {
		const a = visitorHash(Buffer.alloc(32, 1), '198.51.100.7', 'UA');
		expect(a).toHaveLength(22);
		expect(a).not.toContain('198');
		expect(visitorHash(Buffer.alloc(32, 1), '198.51.100.7', 'UA')).toBe(a);
		expect(visitorHash(Buffer.alloc(32, 2), '198.51.100.7', 'UA')).not.toBe(a);
	});

	it('formats UTC days', () => {
		expect(utcDay(new Date('2026-10-19T23:59:59+02:00'))).toBe('2026-10-19');
	});
});
