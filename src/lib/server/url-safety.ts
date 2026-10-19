export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/**
 * Validates a destination URL. Only absolute http(s) URLs pointing at public hostnames are
 * accepted. The WHATWG URL parser already normalises exotic IPv4 notations
 * (`0x7f.1`, `2130706433`) to dotted quads, so the checks below see canonical forms.
 */
export function checkTargetUrl(raw: string, options: { selfHost?: string } = {}): UrlCheck {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return { ok: false, reason: 'Enter a full URL starting with http:// or https://' };
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { ok: false, reason: 'Only http and https links are allowed' };
	}
	if (url.username || url.password) {
		return { ok: false, reason: 'URLs with embedded credentials are not allowed' };
	}
	const host = url.hostname.toLowerCase().replace(/\.$/, '');
	if (!host) {
		return { ok: false, reason: 'The URL has no hostname' };
	}
	if (options.selfHost && host === options.selfHost.toLowerCase()) {
		return { ok: false, reason: 'Links to this shortener are not allowed' };
	}
	if (isBlockedHostname(host)) {
		return { ok: false, reason: 'Private, loopback and local network addresses are not allowed' };
	}
	return { ok: true, url: url.href };
}

export function isBlockedHostname(host: string): boolean {
	if (host === 'localhost' || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
		return true;
	}
	if (host.startsWith('[') && host.endsWith(']')) {
		return isNonPublicIPv6(host.slice(1, -1));
	}
	const v4 = parseIPv4(host);
	if (v4) return isNonPublicIPv4(v4);
	// Single-label names ("intranet", "router") only resolve inside private networks.
	return !host.includes('.');
}

function parseIPv4(host: string): number[] | null {
	const parts = host.split('.');
	if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return null;
	const octets = parts.map(Number);
	return octets.every((o) => o <= 255) ? octets : null;
}

function isNonPublicIPv4([a, b, c]: number[]): boolean {
	return (
		a === 0 || // "this" network
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
		(a === 169 && b === 254) || // link-local
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0 && c === 0) ||
		(a === 192 && b === 0 && c === 2) || // TEST-NET-1
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) || // benchmarking
		(a === 198 && b === 51 && c === 100) || // TEST-NET-2
		(a === 203 && b === 0 && c === 113) || // TEST-NET-3
		a >= 224 // multicast, reserved and broadcast
	);
}

/**
 * Expands an IPv6 literal into eight 16-bit groups, or returns null if it is malformed.
 * Hostnames produced by `new URL()` are always serialised as hex groups (an embedded
 * dotted IPv4 tail is rewritten), so dotted tails are treated as malformed here.
 */
function expandIPv6(address: string): number[] | null {
	const halves = address.toLowerCase().split('::');
	if (halves.length > 2) return null;
	const split = (s: string) => (s === '' ? [] : s.split(':'));
	const head = split(halves[0]);
	const tail = halves.length === 2 ? split(halves[1]) : [];
	if (![...head, ...tail].every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;

	const missing = 8 - head.length - tail.length;
	if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
	const toInt = (group: string) => parseInt(group, 16);
	return [...head.map(toInt), ...new Array<number>(missing).fill(0), ...tail.map(toInt)];
}

function isNonPublicIPv6(address: string): boolean {
	const g = expandIPv6(address);
	if (!g) return true; // unparseable literals are rejected rather than trusted
	const allZeroUntil = (n: number) => g.slice(0, n).every((x) => x === 0);

	if (allZeroUntil(8)) return true; // unspecified ::
	if (allZeroUntil(7) && g[7] === 1) return true; // loopback ::1
	if (allZeroUntil(5) && g[5] === 0xffff) {
		// IPv4-mapped ::ffff:a.b.c.d
		return isNonPublicIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
	}
	if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
		// NAT64 well-known prefix embeds an IPv4 address
		return isNonPublicIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
	}
	if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
	if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
	if ((g[0] & 0xff00) === 0xff00) return true; // multicast ff00::/8
	if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation 2001:db8::/32
	return false;
}
