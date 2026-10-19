import { describe, expect, it } from 'vitest';
import { buildBarChart, niceCeil } from './chart';

describe('niceCeil', () => {
	it('rounds up to 1, 2 or 5 times a power of ten', () => {
		expect([0, 0.7, 1, 1.5, 3, 7, 12, 480].map(niceCeil)).toEqual([1, 1, 1, 2, 5, 10, 20, 500]);
	});
});

describe('buildBarChart', () => {
	const points = [3, 0, 7, 1].map((value, i) => ({ label: `d${i}`, value }));
	const chart = buildBarChart(points, {
		width: 100,
		height: 60,
		padding: { top: 0, right: 0, bottom: 10, left: 0 },
		gap: 0,
		ticks: 4
	});

	it('scales bars to the plot area', () => {
		expect(chart.max).toBe(8);
		expect(chart.bars.map((b) => b.width)).toEqual([25, 25, 25, 25]);
		expect(chart.bars.map((b) => b.x)).toEqual([0, 25, 50, 75]);
		expect(chart.bars[1].height).toBe(0);
		expect(chart.bars[2].height).toBeCloseTo((7 / 8) * 50);
		expect(chart.bars[2].y + chart.bars[2].height).toBe(chart.plot.bottom);
	});

	it('produces integer ticks from zero to the max', () => {
		expect(chart.yTicks.map((t) => t.value)).toEqual([0, 2, 4, 6, 8]);
		expect(chart.yTicks[0].y).toBe(chart.plot.bottom);
		expect(chart.yTicks.at(-1)?.y).toBe(chart.plot.top);
	});

	it('handles an empty or all-zero series', () => {
		expect(buildBarChart([]).bars).toEqual([]);
		const flat = buildBarChart([{ label: 'a', value: 0 }]);
		expect(flat.max).toBe(1);
		expect(flat.bars[0].height).toBe(0);
	});

	it('thins x labels on long series', () => {
		const month = Array.from({ length: 30 }, (_, i) => ({ label: `d${i}`, value: i }));
		expect(buildBarChart(month, { maxXLabels: 6 }).xLabels).toHaveLength(6);
	});
});
