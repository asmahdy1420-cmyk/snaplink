import { error } from '@sveltejs/kit';
import { linkAnalytics, parseRange, RANGE_OPTIONS } from '$lib/server/analytics';
import { linkStatus } from '$lib/server/policy';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const link = await locals.repo.findBySlug(params.slug);
	if (!link) error(404, 'Link not found');

	const now = new Date();
	const days = parseRange(url.searchParams.get('days'));
	return {
		days,
		ranges: [...RANGE_OPTIONS],
		link: {
			slug: link.slug,
			shortUrl: `${url.origin}/${link.slug}`,
			targetUrl: link.targetUrl,
			clickCount: link.clickCount,
			maxClicks: link.maxClicks,
			expiresAt: link.expiresAt?.toISOString() ?? null,
			createdAt: link.createdAt.toISOString(),
			protected: link.passwordHash !== null,
			status: linkStatus(link, now)
		},
		stats: await linkAnalytics(locals.repo, link.id, days, now)
	};
};
