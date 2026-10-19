import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { GET, HEAD } from '../../routes/[slug]/+server';
import { createLink } from '$lib/server/links';
import { mockEvent, testLocals, thrown } from '../helpers';
import type { CreateLinkInput } from '$lib/server/validation';

type Event = Parameters<typeof GET>[0];

const input = (overrides: Partial<CreateLinkInput> = {}): CreateLinkInput => ({
	url: 'https://example.com/landing',
	alias: 'promo',
	expiresAt: null,
	maxClicks: null,
	password: null,
	...overrides
});

const chrome =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function visit(locals: App.Locals, slug = 'promo', headers: Record<string, string> = {}) {
	return mockEvent<Event>({ url: `http://sn.test/${slug}`, params: { slug }, locals, headers });
}

describe('GET /[slug]', () => {
	it('redirects with 302, disables caching and records an anonymised click', async () => {
		const locals = testLocals();
		const link = await createLink(locals.repo, input());

		const response = await GET(
			visit(locals, 'promo', {
				'user-agent': chrome,
				referer: 'https://t.co/xyz',
				'x-country': 'tr'
			})
		);
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('https://example.com/landing');
		expect(response.headers.get('cache-control')).toBe('no-store');

		const stats = await locals.repo.stats(link.id, new Date(0));
		expect(stats.totalClicks).toBe(1);
		expect(stats.referrers).toEqual([{ label: 't.co', count: 1 }]);
		expect(stats.browsers).toEqual([{ label: 'Chrome', count: 1 }]);
		expect(stats.countries).toEqual([{ label: 'TR', count: 1 }]);
	});

	it('returns 404 for unknown slugs', async () => {
		const err = await thrown(() => GET(visit(testLocals(), 'missing')));
		expect(isHttpError(err, 404)).toBe(true);
	});

	it('returns 410 for expired links', async () => {
		const locals = testLocals();
		await createLink(locals.repo, input({ expiresAt: new Date(Date.now() + 50) }), {
			now: new Date(Date.now() - 1000)
		});
		await new Promise((r) => setTimeout(r, 60));
		const err = await thrown(() => GET(visit(locals)));
		expect(isHttpError(err, 410)).toBe(true);
	});

	it('serves exactly max-clicks redirects, then 410', async () => {
		const locals = testLocals();
		await createLink(locals.repo, input({ maxClicks: 2 }));
		expect((await GET(visit(locals))).status).toBe(302);
		expect((await GET(visit(locals))).status).toBe(302);
		const err = await thrown(() => GET(visit(locals)));
		expect(isHttpError(err, 410)).toBe(true);
	});

	it('sends password-protected links to the unlock page without counting', async () => {
		const locals = testLocals();
		await createLink(locals.repo, input({ password: 'letmein' }));
		const response = await GET(visit(locals));
		expect(response.headers.get('location')).toBe('/promo/unlock');
		expect((await locals.repo.findBySlug('promo'))?.clickCount).toBe(0);
	});

	it('answers HEAD requests without recording a click', async () => {
		const locals = testLocals();
		await createLink(locals.repo, input({ maxClicks: 1 }));
		const response = await HEAD(visit(locals) as Parameters<typeof HEAD>[0]);
		expect(response.status).toBe(302);
		expect((await locals.repo.findBySlug('promo'))?.clickCount).toBe(0);
	});
});
