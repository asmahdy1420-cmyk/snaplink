import { error } from '@sveltejs/kit';
import { noStoreRedirect } from '$lib/server/http';
import { clientIp } from '$lib/server/limits';
import { loadActiveLink, unlockPath } from '$lib/server/resolve';
import { recordVisit } from '$lib/server/visit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { locals, params, request, url } = event;
	const now = new Date();
	const link = await loadActiveLink(locals.repo, params.slug, now);

	if (link.passwordHash) return noStoreRedirect(unlockPath(link.slug));

	const counted = await recordVisit(locals.repo, link, {
		ip: clientIp(event),
		headers: request.headers,
		selfHost: url.hostname,
		now
	});
	if (!counted) error(410, 'This link is no longer available');

	return noStoreRedirect(link.targetUrl);
};

/** HEAD requests (link checkers, previews) get the same answer but are not counted. */
export const HEAD: RequestHandler = async ({ locals, params }) => {
	const link = await loadActiveLink(locals.repo, params.slug, new Date());
	return noStoreRedirect(link.passwordHash ? unlockPath(link.slug) : link.targetUrl);
};
