import { utcDay } from './visit';
import type { DailyCount, LinkRepository, LinkStats } from './types';

const DAY_MS = 86_400_000;

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(value: string | null): RangeDays {
	const n = Number(value);
	return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

/** Start of the UTC day `days - 1` days before `now`, so the window includes today. */
export function rangeStart(now: Date, days: number): Date {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return new Date(today - (days - 1) * DAY_MS);
}

/** Expands a sparse per-day series into one entry per day, filling gaps with zeros. */
export function fillDays(sparse: DailyCount[], start: Date, days: number): DailyCount[] {
	const byDay = new Map(sparse.map((d) => [d.day, d]));
	return Array.from({ length: days }, (_, i) => {
		const day = utcDay(new Date(start.getTime() + i * DAY_MS));
		return byDay.get(day) ?? { day, clicks: 0, visitors: 0 };
	});
}

export async function linkAnalytics(
	repo: LinkRepository,
	linkId: number,
	days: number,
	now: Date
): Promise<LinkStats> {
	const start = rangeStart(now, days);
	const stats = await repo.stats(linkId, start);
	return { ...stats, daily: fillDays(stats.daily, start, days) };
}
