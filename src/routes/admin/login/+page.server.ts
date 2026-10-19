import { fail, redirect } from '@sveltejs/kit';
import { safeEqual, startSession } from '$lib/server/auth';
import { getConfig } from '$lib/server/config';
import { clientIp } from '$lib/server/limits';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.isAdmin) redirect(303, '/admin');
	return { enabled: getConfig().adminToken !== undefined };
};

export const actions = {
	default: async (event) => {
		const { cookies, locals, request, url } = event;
		const { adminToken } = getConfig();
		if (!adminToken) {
			return fail(503, { message: 'Admin access is disabled. Set ADMIN_TOKEN to enable it.' });
		}

		const limit = locals.limiter.take(`login:${clientIp(event)}`);
		if (!limit.allowed) {
			return fail(429, { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` });
		}

		const token = (await request.formData()).get('token');
		if (typeof token !== 'string' || !safeEqual(token, adminToken)) {
			return fail(401, { message: 'Invalid token' });
		}

		startSession(cookies, adminToken, url.protocol === 'https:');
		redirect(303, '/admin');
	}
} satisfies Actions;
