import { error, fail, redirect } from '@sveltejs/kit';
import { endSession } from '$lib/server/auth';
import { linkStatus } from '$lib/server/policy';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
	const [links, total] = await Promise.all([
		locals.repo.listLinks({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
		locals.repo.countLinks()
	]);
	const now = new Date();
	return {
		page,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		total,
		links: links.map((link) => ({
			slug: link.slug,
			shortUrl: `${url.origin}/${link.slug}`,
			targetUrl: link.targetUrl,
			clickCount: link.clickCount,
			maxClicks: link.maxClicks,
			expiresAt: link.expiresAt?.toISOString() ?? null,
			createdAt: link.createdAt.toISOString(),
			protected: link.passwordHash !== null,
			status: linkStatus(link, now)
		}))
	};
};

export const actions = {
	delete: async ({ locals, request }) => {
		if (!locals.isAdmin) error(401, 'Sign in first');
		const slug = (await request.formData()).get('slug');
		if (typeof slug !== 'string' || !(await locals.repo.deleteLink(slug))) {
			return fail(404, { message: 'Link not found' });
		}
		return { deleted: slug };
	},
	logout: async ({ cookies }) => {
		endSession(cookies);
		redirect(303, '/admin/login');
	}
} satisfies Actions;
