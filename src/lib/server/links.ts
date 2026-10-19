import { hashPassword } from './password';
import { randomSlug, type RandomInt } from './slug';
import { SlugTakenError, type Link, type LinkRepository } from './types';
import type { CreateLinkInput } from './validation';

export class AliasTakenError extends Error {
	constructor(readonly alias: string) {
		super(`Alias "${alias}" is already taken`);
		this.name = 'AliasTakenError';
	}
}

export interface CreateLinkOptions {
	now?: Date;
	slugLength?: number;
	maxAttempts?: number;
	random?: RandomInt;
}

/**
 * Persists a validated link. Random slugs rely on the UNIQUE constraint rather than a
 * check-then-insert, so collisions are detected even under concurrent requests; on a
 * collision a fresh slug is drawn, and the length grows by one after half the attempts.
 */
export async function createLink(
	repo: LinkRepository,
	input: CreateLinkInput,
	{ now = new Date(), slugLength = 7, maxAttempts = 6, random }: CreateLinkOptions = {}
): Promise<Link> {
	const base = {
		targetUrl: input.url,
		passwordHash: input.password ? await hashPassword(input.password) : null,
		expiresAt: input.expiresAt,
		maxClicks: input.maxClicks,
		createdAt: now
	};

	if (input.alias) {
		try {
			return await repo.insertLink({ ...base, slug: input.alias });
		} catch (err) {
			if (err instanceof SlugTakenError) throw new AliasTakenError(input.alias);
			throw err;
		}
	}

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const length = slugLength + (attempt >= Math.ceil(maxAttempts / 2) ? 1 : 0);
		try {
			return await repo.insertLink({ ...base, slug: randomSlug(length, random) });
		} catch (err) {
			if (!(err instanceof SlugTakenError)) throw err;
		}
	}
	throw new Error(`Could not allocate a unique slug after ${maxAttempts} attempts`);
}
