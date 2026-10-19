/** A redirect that browsers and proxies must not cache, so every visit reaches the server. */
export function noStoreRedirect(location: string, status: 301 | 302 | 303 | 307 = 302): Response {
	return new Response(null, {
		status,
		headers: { location, 'cache-control': 'no-store' }
	});
}
