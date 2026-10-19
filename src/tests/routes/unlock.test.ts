import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { actions } from '../../routes/[slug]/unlock/+page.server';
import { createLink } from '$lib/server/links';
import { TokenBucketLimiter } from '$lib/server/rate-limit';
import { failure, mockEvent, testLocals, thrown } from '../helpers';

type Event = Parameters<typeof actions.default>[0];

async function setup(limiter?: TokenBucketLimiter) {
	const locals = testLocals(limiter ? { limiter } : {});
	await createLink(locals.repo, {
		url: 'https://example.com/secret',
		alias: 'vault',
		expiresAt: null,
		maxClicks: null,
		password: 'open sesame'
	});
	const attempt = (password: string) =>
		actions.default(
			mockEvent<Event>({
				url: 'http://sn.test/vault/unlock',
				params: { slug: 'vault' },
				form: { password },
				locals
			})
		);
	return { locals, attempt };
}

describe('unlock action', () => {
	it('redirects to the destination and counts the click with the right password', async () => {
		const { locals, attempt } = await setup();
		const err = await thrown(() => attempt('open sesame'));
		expect(isRedirect(err) && err.location).toBe('https://example.com/secret');
		expect((await locals.repo.findBySlug('vault'))?.clickCount).toBe(1);
	});

	it('fails with 401 on a wrong password', async () => {
		const { locals, attempt } = await setup();
		const result = await attempt('guess');
		expect(failure(result).status).toBe(401);
		expect((await locals.repo.findBySlug('vault'))?.clickCount).toBe(0);
	});

	it('limits password attempts', async () => {
		const { attempt } = await setup(new TokenBucketLimiter({ capacity: 2, refillPerSecond: 0.01 }));
		await attempt('a');
		await attempt('b');
		const result = await attempt('open sesame');
		expect(failure(result).status).toBe(429);
	});
});
