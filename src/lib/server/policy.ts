import type { Link } from './types';

export type LinkStatus = 'active' | 'expired' | 'exhausted';

export function isExpired(link: Pick<Link, 'expiresAt'>, now: Date): boolean {
	return link.expiresAt !== null && link.expiresAt.getTime() <= now.getTime();
}

export function isExhausted(link: Pick<Link, 'maxClicks' | 'clickCount'>): boolean {
	return link.maxClicks !== null && link.clickCount >= link.maxClicks;
}

export function linkStatus(
	link: Pick<Link, 'expiresAt' | 'maxClicks' | 'clickCount'>,
	now: Date
): LinkStatus {
	if (isExpired(link, now)) return 'expired';
	if (isExhausted(link)) return 'exhausted';
	return 'active';
}

export function statusMessage(status: Exclude<LinkStatus, 'active'>): string {
	return status === 'expired' ? 'This link has expired' : 'This link has reached its click limit';
}
