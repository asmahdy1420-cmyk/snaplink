/**
 * Words that may never be used as a custom alias, either because they collide with
 * application routes or because they would be confusing in a short link.
 */
export const RESERVED_ALIASES: ReadonlySet<string> = new Set([
	'about',
	'admin',
	'api',
	'app',
	'assets',
	'create',
	'dashboard',
	'health',
	'healthz',
	'help',
	'login',
	'logout',
	'new',
	'qr',
	'settings',
	'static',
	'stats',
	'unlock',
	'www'
]);

export const ALIAS_MIN_LENGTH = 3;
export const ALIAS_MAX_LENGTH = 32;
const ALIAS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type AliasCheck = { ok: true; alias: string } | { ok: false; reason: string };

export function validateAlias(raw: string): AliasCheck {
	const alias = raw.trim();
	if (alias.length < ALIAS_MIN_LENGTH || alias.length > ALIAS_MAX_LENGTH) {
		return {
			ok: false,
			reason: `Alias must be ${ALIAS_MIN_LENGTH}-${ALIAS_MAX_LENGTH} characters long`
		};
	}
	if (!ALIAS_PATTERN.test(alias)) {
		return {
			ok: false,
			reason: 'Use letters, digits, "-" or "_", starting with a letter or digit'
		};
	}
	if (RESERVED_ALIASES.has(alias.toLowerCase())) {
		return { ok: false, reason: `"${alias}" is reserved` };
	}
	return { ok: true, alias };
}
