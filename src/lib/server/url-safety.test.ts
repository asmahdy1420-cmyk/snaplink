import { describe, expect, it } from 'vitest';
import { checkTargetUrl } from './url-safety';

const allowed = (url: string) => checkTargetUrl(url).ok;

describe('checkTargetUrl', () => {
	it('accepts public http and https URLs and normalises them', () => {
		expect(checkTargetUrl(' https://Example.com/a?b=1 ')).toEqual({
			ok: true,
			url: 'https://example.com/a?b=1'
		});
		expect(allowed('http://8.8.8.8/dns')).toBe(true);
		expect(allowed('https://[2606:4700:4700::1111]/')).toBe(true);
	});

	it('rejects non-http schemes and malformed input', () => {
		for (const url of [
			'javascript:alert(1)',
			'data:text/html,hi',
			'ftp://example.com',
			'file:///etc/passwd',
			'example.com',
			''
		]) {
			expect(allowed(url)).toBe(false);
		}
	});

	it('rejects loopback, private and link-local IPv4 ranges', () => {
		for (const host of [
			'127.0.0.1',
			'10.1.2.3',
			'172.16.0.1',
			'172.31.255.255',
			'192.168.1.1',
			'169.254.169.254',
			'100.64.0.1',
			'0.0.0.0',
			'224.0.0.1'
		]) {
			expect(allowed(`http://${host}/`), host).toBe(false);
		}
		expect(allowed('http://172.32.0.1/')).toBe(true);
	});

	it('sees through alternative IPv4 notations', () => {
		for (const host of ['2130706433', '0x7f.1', '0177.0.0.1', '127.1']) {
			expect(allowed(`http://${host}/`), host).toBe(false);
		}
	});

	it('rejects private IPv6 literals including IPv4-mapped addresses', () => {
		for (const host of [
			'[::1]',
			'[::]',
			'[fc00::1]',
			'[fd12:3456::1]',
			'[fe80::1]',
			'[::ffff:127.0.0.1]',
			'[::ffff:10.0.0.1]',
			'[64:ff9b::a00:1]'
		]) {
			expect(allowed(`http://${host}/`), host).toBe(false);
		}
		expect(allowed('http://[::ffff:8.8.8.8]/')).toBe(true);
	});

	it('rejects local hostnames, credentials and links back to the shortener', () => {
		expect(allowed('http://localhost:3000')).toBe(false);
		expect(allowed('http://app.localhost')).toBe(false);
		expect(allowed('http://printer.local')).toBe(false);
		expect(allowed('http://intranet/')).toBe(false);
		expect(allowed('https://user:pass@example.com')).toBe(false);
		expect(checkTargetUrl('https://sn.test/abc', { selfHost: 'sn.test' }).ok).toBe(false);
	});
});
