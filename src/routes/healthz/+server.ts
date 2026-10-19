import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	await locals.repo.countLinks();
	return json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
};
