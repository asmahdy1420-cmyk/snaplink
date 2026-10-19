import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidSession, SESSION_COOKIE } from '$lib/server/auth';
import { failure, mockCookies, mockEvent, testLocals, thrown } from '../helpers';

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const login = await import('../../routes/admin/login/+page.server');
const admin = await import('../../routes/admin/+page.server');
const { handle } = await import('../../hooks.server');

const TOKEN = 'a-long-admin-token-for-tests';
type LoginEvent = Parameters<typeof login.actions.default>[0];
type HandleInput = Parameters<typeof handle>[0];

describe('admin authentication', () => {
	beforeEach(() => {
		env.ADMIN_TOKEN = TOKEN;
		env.DATABASE_PATH = ':memory:';
	});

	it('rejects a wrong token with 401 and sets no cookie', async () => {
		const { cookies, jar } = mockCookies();
		const result = await login.actions.default(
			mockEvent<LoginEvent>({ url: 'http://sn.test/admin/login', form: { token: 'nope' }, cookies })
		);
		expect(failure(result).status).toBe(401);
		expect(jar.size).toBe(0);
	});

	it('sets an httpOnly, sameSite=lax session cookie and redirects on success', async () => {
		const { cookies, jar } = mockCookies();
		const err = await thrown(() =>
			login.actions.default(
				mockEvent<LoginEvent>({
					url: 'https://sn.test/admin/login',
					form: { token: TOKEN },
					cookies
				})
			)
		);
		expect(isRedirect(err) && err.status === 303 && err.location).toBe('/admin');

		const session = jar.get(SESSION_COOKIE);
		expect(session?.options).toMatchObject({
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			path: '/'
		});
		expect(session?.value).not.toContain(TOKEN);
		expect(isValidSession(session?.value, TOKEN)).toBe(true);
		expect(isValidSession(session?.value, 'rotated-token')).toBe(false);
	});

	it('reports 503 when ADMIN_TOKEN is not configured', async () => {
		delete env.ADMIN_TOKEN;
		const result = await login.actions.default(
			mockEvent<LoginEvent>({ url: 'http://sn.test/admin/login', form: { token: '' } })
		);
		expect(failure(result).status).toBe(503);
	});

	it('guards /admin routes in the server hook', async () => {
		const resolve = vi.fn(async () => new Response('ok'));
		const anonymous = mockEvent<HandleInput['event']>({ url: 'http://sn.test/admin/links/x' });
		const err = await thrown(() => handle({ event: anonymous, resolve }));
		expect(isRedirect(err) && err.location).toBe('/admin/login');
		expect(resolve).not.toHaveBeenCalled();

		const { cookies } = mockCookies();
		cookies.set(SESSION_COOKIE, (await signIn()) ?? '', { path: '/' });
		const signedIn = mockEvent<HandleInput['event']>({ url: 'http://sn.test/admin', cookies });
		const response = await handle({ event: signedIn, resolve });
		expect(response.status).toBe(200);
		expect(signedIn.locals.isAdmin).toBe(true);
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
	});

	it('deletes links from the dashboard and clears the session on logout', async () => {
		const locals = testLocals({ isAdmin: true });
		await locals.repo.insertLink({
			slug: 'gone',
			targetUrl: 'https://example.com/',
			passwordHash: null,
			expiresAt: null,
			maxClicks: null,
			createdAt: new Date()
		});
		type AdminEvent = Parameters<typeof admin.actions.delete>[0];
		const result = await admin.actions.delete(
			mockEvent<AdminEvent>({ form: { slug: 'gone' }, locals })
		);
		expect(result).toEqual({ deleted: 'gone' });
		expect(await locals.repo.findBySlug('gone')).toBeNull();

		const { cookies, jar } = mockCookies({ [SESSION_COOKIE]: 'x' });
		const err = await thrown(() =>
			admin.actions.logout(mockEvent<AdminEvent>({ form: {}, cookies }))
		);
		expect(isRedirect(err)).toBe(true);
		expect(jar.has(SESSION_COOKIE)).toBe(false);
	});
});

async function signIn(): Promise<string | undefined> {
	const { cookies, jar } = mockCookies();
	await thrown(() =>
		login.actions.default(
			mockEvent<LoginEvent>({ url: 'http://sn.test/admin/login', form: { token: TOKEN }, cookies })
		)
	);
	return jar.get(SESSION_COOKIE)?.value;
}
