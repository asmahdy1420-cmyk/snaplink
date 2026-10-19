import { describe, expect, it } from 'vitest';
import { parseCreateLinkForm } from './validation';

const now = new Date('2026-10-19T12:00:00Z');
const form = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(entries)) data.set(k, v);
	return data;
};

describe('parseCreateLinkForm', () => {
	it('turns blank optional fields into nulls', () => {
		const result = parseCreateLinkForm(
			form({ url: 'https://example.com', alias: ' ', expiresAt: '', maxClicks: '', password: '' }),
			{ now }
		);
		expect(result).toEqual({
			success: true,
			data: {
				url: 'https://example.com/',
				alias: null,
				expiresAt: null,
				maxClicks: null,
				password: null
			}
		});
	});

	it('parses expiry as UTC and limits as integers', () => {
		const result = parseCreateLinkForm(
			form({
				url: 'https://example.com',
				expiresAt: '2026-12-01T09:30',
				maxClicks: '25',
				password: 'hunter22'
			}),
			{ now }
		);
		expect(result.success && result.data).toMatchObject({
			expiresAt: new Date('2026-12-01T09:30:00Z'),
			maxClicks: 25,
			password: 'hunter22'
		});
	});

	it('reports one message per invalid field', () => {
		const result = parseCreateLinkForm(
			form({
				url: 'http://10.0.0.1',
				alias: 'admin',
				expiresAt: '2020-01-01T00:00',
				maxClicks: '2.5',
				password: 'abc'
			}),
			{ now }
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(Object.keys(result.errors).sort()).toEqual([
			'alias',
			'expiresAt',
			'maxClicks',
			'password',
			'url'
		]);
		expect(result.errors.expiresAt?.[0]).toBe('Expiry must be in the future');
	});

	it('requires a URL', () => {
		const result = parseCreateLinkForm(form({}), { now });
		expect(result.success).toBe(false);
	});
});
