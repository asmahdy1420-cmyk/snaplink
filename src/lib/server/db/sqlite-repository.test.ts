import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRepository } from '.';
import { SlugTakenError, type NewClick, type NewLink } from '../types';

const now = new Date('2026-10-19T12:00:00Z');
const link = (overrides: Partial<NewLink> = {}): NewLink => ({
	slug: 'abc1234',
	targetUrl: 'https://example.com/',
	passwordHash: null,
	expiresAt: null,
	maxClicks: null,
	createdAt: now,
	...overrides
});
const click = (overrides: Partial<NewClick> = {}): NewClick => ({
	at: now,
	referrerHost: null,
	country: null,
	browser: 'Chrome',
	visitorHash: 'v1',
	...overrides
});

describe('SqliteLinkRepository', () => {
	let repo: ReturnType<typeof createMemoryRepository>;
	beforeEach(() => {
		repo = createMemoryRepository();
	});

	it('round-trips a link with all optional fields', async () => {
		const expiresAt = new Date('2027-01-01T00:00:00Z');
		const created = await repo.insertLink(link({ passwordHash: 'h', expiresAt, maxClicks: 5 }));
		expect(created).toMatchObject({
			slug: 'abc1234',
			clickCount: 0,
			maxClicks: 5,
			passwordHash: 'h'
		});
		expect((await repo.findBySlug('abc1234'))?.expiresAt).toEqual(expiresAt);
		expect(await repo.findBySlug('ABC1234')).toBeNull();
	});

	it('raises SlugTakenError on duplicate slugs', async () => {
		await repo.insertLink(link());
		await expect(repo.insertLink(link())).rejects.toBeInstanceOf(SlugTakenError);
	});

	it('lists newest first with pagination and counts', async () => {
		for (let i = 0; i < 3; i++) {
			await repo.insertLink(link({ slug: `s${i}xx`, createdAt: new Date(now.getTime() + i) }));
		}
		expect((await repo.listLinks({ limit: 2 })).map((l) => l.slug)).toEqual(['s2xx', 's1xx']);
		expect((await repo.listLinks({ limit: 2, offset: 2 })).map((l) => l.slug)).toEqual(['s0xx']);
		expect(await repo.countLinks()).toBe(3);
	});

	it('stops counting clicks at max_clicks and after expiry', async () => {
		const limited = await repo.insertLink(link({ slug: 'lim', maxClicks: 2 }));
		expect(await repo.registerClick(limited.id, click())).toBe(true);
		expect(await repo.registerClick(limited.id, click())).toBe(true);
		expect(await repo.registerClick(limited.id, click())).toBe(false);
		expect((await repo.findBySlug('lim'))?.clickCount).toBe(2);

		const expiring = await repo.insertLink(
			link({ slug: 'exp', expiresAt: new Date(now.getTime() + 1000) })
		);
		expect(await repo.registerClick(expiring.id, click())).toBe(true);
		expect(
			await repo.registerClick(expiring.id, click({ at: new Date(now.getTime() + 1000) }))
		).toBe(false);
	});

	it('aggregates stats per day, referrer, browser and country', async () => {
		const { id } = await repo.insertLink(link());
		const yesterday = new Date(now.getTime() - 86_400_000);
		await repo.registerClick(
			id,
			click({ at: yesterday, referrerHost: 'news.ycombinator.com', visitorHash: 'a' })
		);
		await repo.registerClick(
			id,
			click({ referrerHost: 'news.ycombinator.com', country: 'DE', visitorHash: 'a' })
		);
		await repo.registerClick(id, click({ browser: 'Firefox', country: 'DE', visitorHash: 'a' }));
		await repo.registerClick(id, click({ browser: 'Firefox', visitorHash: 'b' }));

		const stats = await repo.stats(id, new Date(now.getTime() - 7 * 86_400_000));
		expect(stats.totalClicks).toBe(4);
		expect(stats.uniqueVisitors).toBe(3);
		expect(stats.daily).toEqual([
			{ day: '2026-10-18', clicks: 1, visitors: 1 },
			{ day: '2026-10-19', clicks: 3, visitors: 2 }
		]);
		expect(stats.referrers).toEqual([
			{ label: 'Direct', count: 2 },
			{ label: 'news.ycombinator.com', count: 2 }
		]);
		expect(stats.browsers).toEqual([
			{ label: 'Chrome', count: 2 },
			{ label: 'Firefox', count: 2 }
		]);
		expect(stats.countries).toEqual([
			{ label: 'DE', count: 2 },
			{ label: 'Unknown', count: 2 }
		]);
		expect((await repo.stats(id, now)).totalClicks).toBe(3);
	});

	it('deletes a link together with its clicks', async () => {
		const { id } = await repo.insertLink(link());
		await repo.registerClick(id, click());
		expect(await repo.deleteLink('abc1234')).toBe(true);
		expect(await repo.deleteLink('abc1234')).toBe(false);
		expect((await repo.stats(id, new Date(0))).totalClicks).toBe(0);
	});

	it('keeps one salt per day and discards older ones', async () => {
		const first = await repo.dailySalt('2026-10-18');
		expect(first).toHaveLength(32);
		expect(await repo.dailySalt('2026-10-18')).toEqual(first);
		const next = await repo.dailySalt('2026-10-19');
		expect(next).not.toEqual(first);
		// The old salt is gone, so asking for it again yields a fresh one.
		expect(await repo.dailySalt('2026-10-18')).not.toEqual(first);
	});
});
