import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'snaplink_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time string comparison that does not leak length differences. */
export function safeEqual(a: string, b: string): boolean {
	return timingSafeEqual(digest(a), digest(b));
}

/**
 * The cookie holds an HMAC derived from the admin token, never the token itself. Rotating
 * ADMIN_TOKEN therefore invalidates every existing session.
 */
export function sessionValue(adminToken: string): string {
	return createHmac('sha256', adminToken).update('snaplink-admin-session-v1').digest('base64url');
}

export function isValidSession(
	cookie: string | undefined,
	adminToken: string | undefined
): boolean {
	if (!cookie || !adminToken) return false;
	return safeEqual(cookie, sessionValue(adminToken));
}

export function startSession(cookies: Cookies, adminToken: string, secure: boolean): void {
	cookies.set(SESSION_COOKIE, sessionValue(adminToken), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_MAX_AGE
	});
}

export function endSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
