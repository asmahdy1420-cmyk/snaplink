import { fail } from '@sveltejs/kit';
import { getConfig } from '$lib/server/config';
import { AliasTakenError, createLink } from '$lib/server/links';
import { clientIp } from '$lib/server/limits';
import { parseCreateLinkForm, type FieldErrors } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	canCreate: locals.isAdmin || getConfig().publicCreation
});

/** Values echoed back on failure so the form survives a full page reload (no JavaScript). */
function echo(form: FormData) {
	const text = (key: string) => {
		const value = form.get(key);
		return typeof value === 'string' ? value : '';
	};
	return {
		url: text('url'),
		alias: text('alias'),
		expiresAt: text('expiresAt'),
		maxClicks: text('maxClicks')
	};
}

export const actions = {
	default: async (event) => {
		const { locals, request, url } = event;
		if (!locals.isAdmin && !getConfig().publicCreation) {
			return fail(403, { message: 'Only the administrator can create links on this instance.' });
		}

		if (!locals.isAdmin) {
			const limit = locals.limiter.take(`create:${clientIp(event)}`);
			if (!limit.allowed) {
				return fail(429, {
					message: `You are creating links too quickly. Try again in ${limit.retryAfterSeconds}s.`
				});
			}
		}

		const form = await request.formData();
		const values = echo(form);
		const parsed = parseCreateLinkForm(form, { now: new Date(), selfHost: url.hostname });
		if (!parsed.success) {
			return fail(400, { values, errors: parsed.errors });
		}

		try {
			const link = await createLink(locals.repo, parsed.data);
			return {
				created: {
					slug: link.slug,
					shortUrl: `${url.origin}/${link.slug}`,
					targetUrl: link.targetUrl,
					expiresAt: link.expiresAt?.toISOString() ?? null,
					maxClicks: link.maxClicks,
					protected: link.passwordHash !== null
				}
			};
		} catch (err) {
			if (err instanceof AliasTakenError) {
				const errors: FieldErrors = { alias: ['That alias is already taken'] };
				return fail(409, { values, errors });
			}
			throw err;
		}
	}
} satisfies Actions;
