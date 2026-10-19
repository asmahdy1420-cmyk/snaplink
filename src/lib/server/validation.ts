import { z } from 'zod';
import { validateAlias } from './alias';
import { checkTargetUrl } from './url-safety';

const blankToUndefined = (value: unknown) =>
	typeof value === 'string' && value.trim() === '' ? undefined : value;

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** Parses the value of an `<input type="datetime-local">`, interpreted as UTC. */
export function parseUtcDateTime(value: string): Date | null {
	if (!DATETIME.test(value)) return null;
	const date = new Date(`${value}Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

export interface ValidationContext {
	now: Date;
	selfHost?: string;
}

export function createLinkSchema({ now, selfHost }: ValidationContext) {
	return z.object({
		url: z
			.string({ error: 'Enter a URL' })
			.trim()
			.min(1, 'Enter a URL')
			.max(2048, 'URL is too long')
			.transform((value, ctx) => {
				const result = checkTargetUrl(value, { selfHost });
				if (!result.ok) {
					ctx.addIssue({ code: 'custom', message: result.reason });
					return z.NEVER;
				}
				return result.url;
			}),
		alias: z.preprocess(
			blankToUndefined,
			z
				.string()
				.optional()
				.transform((value, ctx) => {
					if (value === undefined) return null;
					const result = validateAlias(value);
					if (!result.ok) {
						ctx.addIssue({ code: 'custom', message: result.reason });
						return z.NEVER;
					}
					return result.alias;
				})
		),
		expiresAt: z.preprocess(
			blankToUndefined,
			z
				.string()
				.optional()
				.transform((value, ctx) => {
					if (value === undefined) return null;
					const date = parseUtcDateTime(value);
					if (!date) {
						ctx.addIssue({ code: 'custom', message: 'Enter a valid date and time' });
						return z.NEVER;
					}
					if (date.getTime() <= now.getTime()) {
						ctx.addIssue({ code: 'custom', message: 'Expiry must be in the future' });
						return z.NEVER;
					}
					return date;
				})
		),
		maxClicks: z.preprocess(
			blankToUndefined,
			z.coerce
				.number({ error: 'Enter a number' })
				.int('Enter a whole number')
				.min(1, 'Must be at least 1')
				.max(1_000_000_000, 'That limit is too large')
				.optional()
				.transform((value) => value ?? null)
		),
		password: z.preprocess(
			blankToUndefined,
			z
				.string()
				.min(4, 'Use at least 4 characters')
				.max(128, 'Use at most 128 characters')
				.optional()
				.transform((value) => value ?? null)
		)
	});
}

export type CreateLinkInput = z.output<ReturnType<typeof createLinkSchema>>;
export type FieldErrors = Partial<Record<keyof CreateLinkInput, string[]>>;

export type ParseResult =
	{ success: true; data: CreateLinkInput } | { success: false; errors: FieldErrors };

export function parseCreateLinkForm(form: FormData, ctx: ValidationContext): ParseResult {
	const raw = Object.fromEntries(
		['url', 'alias', 'expiresAt', 'maxClicks', 'password'].map((key) => [
			key,
			form.get(key) ?? undefined
		])
	);
	const result = createLinkSchema(ctx).safeParse(raw);
	if (result.success) return { success: true, data: result.data };
	return { success: false, errors: z.flattenError(result.error).fieldErrors as FieldErrors };
}
