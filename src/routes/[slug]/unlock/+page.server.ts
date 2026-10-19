import { fail, redirect } from '@sveltejs/kit';
import { clientIp } from '$lib/server/limits';
import { verifyPassword } from '$lib/server/password';
import { loadActiveLink } from '$lib/server/resolve';
import { recordVisit } from '$lib/server/visit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const link = await loadActiveLink(locals.repo, params.slug, new Date());
	if (!link.passwordHash) redirect(307, `/${encodeURIComponent(link.slug)}`);
	return { slug: link.slug };
};

export const actions = {
	default: async (event) => {
		const { locals, params, request, url } = event;
		const now = new Date();
		const link = await loadActiveLink(locals.repo, params.slug, now);

		const limit = locals.limiter.take(`unlock:${clientIp(event)}:${link.slug}`);
		if (!limit.allowed) {
			return fail(429, { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` });
		}

		const password = (await request.formData()).get('password');
		const valid =
			typeof password === 'string' &&
			link.passwordHash !== null &&
			(await verifyPassword(password, link.passwordHash));
		if (!valid) return fail(401, { message: 'Incorrect password' });

		const counted = await recordVisit(locals.repo, link, {
			ip: clientIp(event),
			headers: request.headers,
			selfHost: url.hostname,
			now
		});
		if (!counted) return fail(410, { message: 'This link is no longer available' });

		redirect(303, link.targetUrl);
	}
} satisfies Actions;
