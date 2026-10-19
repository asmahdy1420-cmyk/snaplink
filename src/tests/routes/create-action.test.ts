import { isActionFailure } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenBucketLimiter } from '$lib/server/rate-limit';
import type { FieldErrors } from '$lib/server/validation';
import { failure, mockEvent, testLocals } from '../helpers';

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const { actions } = await import('../../routes/+page.server');
type Event = Parameters<typeof actions.default>[0];

const submit = (form: Record<string, string>, locals = testLocals(), ip?: string) =>
	actions.default(mockEvent<Event>({ url: 'http://sn.test/', form, locals, ip }));

describe('create link action', () => {
	beforeEach(() => {
		for (const key of Object.keys(env)) delete env[key];
	});

	it('creates a link and returns the short URL', async () => {
		const locals = testLocals();
		const result = await submit(
			{ url: 'https://example.com/docs', alias: 'docs', maxClicks: '10' },
			locals
		);
		expect(result).toEqual({
			created: {
				slug: 'docs',
				shortUrl: 'http://sn.test/docs',
				targetUrl: 'https://example.com/docs',
				expiresAt: null,
				maxClicks: 10,
				protected: false
			}
		});
		expect(await locals.repo.countLinks()).toBe(1);
	});

	it('generates a random base62 slug when no alias is given', async () => {
		const result = await submit({ url: 'https://example.com' });
		expect(isActionFailure(result)).toBe(false);
		expect((result as { created: { slug: string } }).created.slug).toMatch(/^[0-9A-Za-z]{7}$/);
	});

	it('fails with 400 and field errors, echoing values but never the password', async () => {
		const result = await submit({
			url: 'http://localhost:8080',
			alias: 'ok-alias',
			password: 'pw'
		});
		const { status, data: raw } = failure(result);
		expect(status).toBe(400);
		const data = raw as { errors: FieldErrors; values: Record<string, string> };
		expect(data.errors.url?.[0]).toMatch(/Private, loopback/);
		expect(data.errors.password).toBeDefined();
		expect(data.values).toEqual({
			url: 'http://localhost:8080',
			alias: 'ok-alias',
			expiresAt: '',
			maxClicks: ''
		});
	});

	it('fails with 409 when the alias is taken', async () => {
		const locals = testLocals();
		await submit({ url: 'https://example.com', alias: 'taken' }, locals);
		const result = await submit({ url: 'https://example.org', alias: 'taken' }, locals);
		expect(failure(result).status).toBe(409);
	});

	it('rate limits anonymous creators per IP', async () => {
		const locals = testLocals({
			limiter: new TokenBucketLimiter({ capacity: 2, refillPerSecond: 0.01 })
		});
		const form = { url: 'https://example.com' };
		await submit(form, locals, '198.51.100.1');
		await submit(form, locals, '198.51.100.1');
		const limited = await submit(form, locals, '198.51.100.1');
		expect(failure(limited).status).toBe(429);
		expect(isActionFailure(await submit(form, locals, '198.51.100.2'))).toBe(false);
		// Signed-in admins are not limited.
		locals.isAdmin = true;
		expect(isActionFailure(await submit(form, locals, '198.51.100.1'))).toBe(false);
	});

	it('restricts creation to the admin when PUBLIC_CREATION=false', async () => {
		env.PUBLIC_CREATION = 'false';
		const result = await submit({ url: 'https://example.com' });
		expect(failure(result).status).toBe(403);
	});
});
