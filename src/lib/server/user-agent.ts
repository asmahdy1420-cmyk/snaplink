export type BrowserFamily =
	'Bot' | 'CLI' | 'Edge' | 'Opera' | 'Samsung Internet' | 'Firefox' | 'Chrome' | 'Safari' | 'Other';

const BOT =
	/bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse/i;
const CLI =
	/^(curl|wget|httpie|python-requests|python-urllib|go-http-client|node-fetch|axios|undici|okhttp|java)\b/i;

/**
 * Maps a User-Agent string to a coarse browser family. Deliberately small: analytics only
 * need the family, and keeping version numbers would add fingerprinting surface.
 * Order matters because Chromium-based browsers also advertise "Chrome" and "Safari".
 */
export function browserFamily(userAgent: string | null | undefined): BrowserFamily {
	const ua = userAgent?.trim() ?? '';
	if (!ua) return 'Other';
	if (BOT.test(ua)) return 'Bot';
	if (CLI.test(ua)) return 'CLI';
	if (/\bEdg(e|A|iOS)?\//.test(ua)) return 'Edge';
	if (/\bOPR\/|\bOpera\b/.test(ua)) return 'Opera';
	if (/\bSamsungBrowser\//.test(ua)) return 'Samsung Internet';
	if (/\b(Firefox|FxiOS)\//.test(ua)) return 'Firefox';
	if (/\b(Chrome|CriOS|Chromium)\//.test(ua)) return 'Chrome';
	if (/\bVersion\/[\d.]+.*\bSafari\//.test(ua)) return 'Safari';
	return 'Other';
}
