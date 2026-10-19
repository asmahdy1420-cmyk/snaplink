import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const link = await locals.repo.findBySlug(params.slug);
	if (!link) error(404, 'Link not found');

	const svg = await QRCode.toString(`${url.origin}/${link.slug}`, {
		type: 'svg',
		margin: 1,
		errorCorrectionLevel: 'M',
		color: { dark: '#111827', light: '#ffffff' }
	});
	return new Response(svg, {
		headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' }
	});
};
