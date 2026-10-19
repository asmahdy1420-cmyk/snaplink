import { describe, expect, it } from 'vitest';
import { browserFamily } from './user-agent';

const cases: [string, string][] = [
	[
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
		'Chrome'
	],
	[
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
		'Edge'
	],
	[
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
		'Opera'
	],
	[
		'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
		'Samsung Internet'
	],
	['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox'],
	[
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
		'Firefox'
	],
	[
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
		'Chrome'
	],
	[
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
		'Safari'
	],
	['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Bot'],
	['Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'Bot'],
	['facebookexternalhit/1.1', 'Bot'],
	['curl/8.7.1', 'CLI'],
	['python-requests/2.32.3', 'CLI'],
	['', 'Other'],
	['SomethingElse/1.0', 'Other']
];

describe('browserFamily', () => {
	it.each(cases)('classifies %s', (ua, family) => {
		expect(browserFamily(ua)).toBe(family);
	});

	it('handles a missing header', () => {
		expect(browserFamily(null)).toBe('Other');
	});
});
