import { describe, expect, it, vi } from 'vitest';
import { createMemoryRepository } from './db';
import { AliasTakenError, createLink } from './links';
import { verifyPassword } from './password';
import type { CreateLinkInput } from './validation';

const input = (overrides: Partial<CreateLinkInput> = {}): CreateLinkInput => ({
	url: 'https://example.com/',
	alias: null,
	expiresAt: null,
	maxClicks: null,
	password: null,
	...overrides
});

/** A random source that replays a fixed sequence of alphabet indexes. */
const sequence = (...values: number[]) => vi.fn(() => values.shift() ?? 0);

describe('createLink', () => {
	it('retries with a new slug when the random one collides', async () => {
		const repo = createMemoryRepository();
		await repo.insertLink(newLink('aaa'));
		const insert = vi.spyOn(repo, 'insertLink');

		// First draw "aaa" collides, second draw "aab" succeeds.
		const random = sequence(36, 36, 36, 36, 36, 37);
		const link = await createLink(repo, input(), { slugLength: 3, random });
		expect(link.slug).toBe('aab');
		expect(insert).toHaveBeenCalledTimes(2);
	});

	it('grows the slug length after repeated collisions and eventually gives up', async () => {
		const repo = createMemoryRepository();
		await repo.insertLink(newLink('0'));
		await repo.insertLink(newLink('00'));
		const zeros = () => 0;
		await expect(
			createLink(repo, input(), { slugLength: 1, maxAttempts: 4, random: zeros })
		).rejects.toThrow(/unique slug/);
		const third = await createLink(repo, input(), {
			slugLength: 1,
			maxAttempts: 6,
			random: sequence(0, 0, 0, 0, 0, 0, 1)
		});
		expect(third.slug).toBe('01');
	});

	it('uses a custom alias as-is and reports when it is taken', async () => {
		const repo = createMemoryRepository();
		expect((await createLink(repo, input({ alias: 'launch' }))).slug).toBe('launch');
		await expect(createLink(repo, input({ alias: 'launch' }))).rejects.toBeInstanceOf(
			AliasTakenError
		);
	});

	it('stores only a password hash', async () => {
		const repo = createMemoryRepository();
		const link = await createLink(repo, input({ password: 'open sesame' }));
		expect(link.passwordHash).not.toContain('open sesame');
		expect(await verifyPassword('open sesame', link.passwordHash!)).toBe(true);
	});
});

function newLink(slug: string) {
	return {
		slug,
		targetUrl: 'https://example.org/',
		passwordHash: null,
		expiresAt: null,
		maxClicks: null,
		createdAt: new Date()
	};
}
