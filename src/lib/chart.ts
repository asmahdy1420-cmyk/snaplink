export interface ChartPoint {
	label: string;
	value: number;
}

export interface Bar extends ChartPoint {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ChartGeometry {
	width: number;
	height: number;
	plot: { left: number; top: number; right: number; bottom: number };
	bars: Bar[];
	yTicks: { y: number; value: number }[];
	xLabels: { x: number; text: string }[];
	max: number;
}

export interface ChartOptions {
	width?: number;
	height?: number;
	padding?: { top: number; right: number; bottom: number; left: number };
	ticks?: number;
	maxXLabels?: number;
	gap?: number;
}

/** Rounds up to 1, 2 or 5 times a power of ten. */
export function niceCeil(n: number): number {
	if (n <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(n));
	const fraction = n / magnitude;
	const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
	return nice * magnitude;
}

/** Computes bar-chart geometry in SVG user units; rendering stays a thin Svelte component. */
export function buildBarChart(points: ChartPoint[], options: ChartOptions = {}): ChartGeometry {
	const {
		width = 640,
		height = 220,
		padding = { top: 12, right: 8, bottom: 28, left: 40 },
		ticks = 4,
		maxXLabels = 6,
		gap = 0.2
	} = options;
	const plot = {
		left: padding.left,
		top: padding.top,
		right: width - padding.right,
		bottom: height - padding.bottom
	};
	const plotWidth = plot.right - plot.left;
	const plotHeight = plot.bottom - plot.top;

	const peak = Math.max(0, ...points.map((p) => p.value));
	const step = Math.max(1, niceCeil(peak / ticks));
	const max = Math.max(step, Math.ceil(peak / step) * step);
	const scaleY = (v: number) => plot.bottom - (v / max) * plotHeight;

	const slot = points.length ? plotWidth / points.length : 0;
	const barWidth = slot * (1 - gap);
	const bars = points.map((p, i) => {
		const y = scaleY(p.value);
		return {
			...p,
			x: plot.left + i * slot + (slot - barWidth) / 2,
			y,
			width: barWidth,
			height: plot.bottom - y
		};
	});

	const yTicks = [];
	for (let value = 0; value <= max; value += step) yTicks.push({ y: scaleY(value), value });

	const every = Math.max(1, Math.ceil(points.length / maxXLabels));
	const xLabels = bars
		.filter((_, i) => i % every === 0)
		.map((b) => ({ x: b.x + b.width / 2, text: b.label }));

	return { width, height, plot, bars, yTicks, xLabels, max };
}
