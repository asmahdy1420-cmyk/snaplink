import { error } from '@sveltejs/kit';
import { linkStatus, statusMessage } from './policy';
import type { Link, LinkRepository } from './types';

/** Loads a link that can still be visited, or throws the matching 404/410 error. */
export async function loadActiveLink(repo: LinkRepository, slug: string, now: Date): Promise<Link> {
	const link = await repo.findBySlug(slug);
	if (!link) error(404, 'Link not found');
	const status = linkStatus(link, now);
	if (status !== 'active') error(410, statusMessage(status));
	return link;
}

export function unlockPath(slug: string): string {
	return `/${encodeURIComponent(slug)}/unlock`;
}
