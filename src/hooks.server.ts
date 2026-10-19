import { redirect, type Handle } from '@sveltejs/kit';
import { isValidSession, SESSION_COOKIE } from '$lib/server/auth';
import { getConfig } from '$lib/server/config';
import { getRepository } from '$lib/server/db';
import { defaultLimiter } from '$lib/server/limits';

const isProtected = (path: string) =>
	(path === '/admin' || path.startsWith('/admin/')) && path !== '/admin/login';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.repo = getRepository();
	event.locals.limiter = defaultLimiter;
	event.locals.isAdmin = isValidSession(event.cookies.get(SESSION_COOKIE), getConfig().adminToken);

	if (isProtected(event.url.pathname) && !event.locals.isAdmin) {
		redirect(303, '/admin/login');
	}

	const response = await resolve(event);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	return response;
};
