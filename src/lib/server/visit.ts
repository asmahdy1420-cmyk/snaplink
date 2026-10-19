import { createHmac } from 'node:crypto';
import { browserFamily } from './user-agent';
import type { Link, LinkRepository, NewClick } from './types';

export function utcDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Keyed hash of IP + User-Agent with that day's random salt. Salts are deleted once the day
 * is over, after which a hash can no longer be linked back to an address.
 */
export function visitorHash(salt: Buffer, ip: string, userAgent: string): string {
	return createHmac('sha256', salt)
		.update(ip)
		.update('\0')
		.update(userAgent)
		.digest('base64url')
		.slice(0, 22);
}

/** Reduces a Referer header to its hostname; internal navigation counts as direct. */
export function referrerHost(referer: string | null, selfHost?: string): string | null {
	if (!referer) return null;
	try {
		const url = new URL(referer);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		const host = url.hostname.toLowerCase().replace(/^www\./, '');
		if (!host || (selfHost && host === selfHost.toLowerCase().replace(/^www\./, ''))) return null;
		return host.slice(0, 253);
	} catch {
		return null;
	}
}

/** Accepts an ISO 3166-1 alpha-2 code set by a trusted proxy or CDN (e.g. `x-country: DE`). */
export function countryCode(value: string | null): string | null {
	const code = value?.trim().toUpperCase() ?? '';
	return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null;
}

export interface VisitContext {
	ip: string;
	headers: Headers;
	selfHost: string;
	now: Date;
}

export async function buildClick(repo: LinkRepository, ctx: VisitContext): Promise<NewClick> {
	const userAgent = ctx.headers.get('user-agent') ?? '';
	const salt = await repo.dailySalt(utcDay(ctx.now));
	return {
		at: ctx.now,
		referrerHost: referrerHost(ctx.headers.get('referer'), ctx.selfHost),
		country: countryCode(ctx.headers.get('x-country')),
		browser: browserFamily(userAgent),
		visitorHash: visitorHash(salt, ctx.ip, userAgent)
	};
}

/** Records one visit. Resolves to false when the link stopped accepting clicks meanwhile. */
export async function recordVisit(
	repo: LinkRepository,
	link: Link,
	ctx: VisitContext
): Promise<boolean> {
	return repo.registerClick(link.id, await buildClick(repo, ctx));
}
