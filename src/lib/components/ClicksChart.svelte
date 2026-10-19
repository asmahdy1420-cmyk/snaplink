<script lang="ts">
	import { buildBarChart, type ChartPoint } from '$lib/chart';

	let { points, title = 'Clicks per day' }: { points: ChartPoint[]; title?: string } = $props();

	const chart = $derived(buildBarChart(points));
	const total = $derived(points.reduce((sum, p) => sum + p.value, 0));
</script>

<svg
	viewBox="0 0 {chart.width} {chart.height}"
	role="img"
	aria-label="{title}: {total} clicks over {points.length} days"
>
	{#each chart.yTicks as tick (tick.value)}
		<line class="grid" x1={chart.plot.left} x2={chart.plot.right} y1={tick.y} y2={tick.y} />
		<text
			class="axis"
			x={chart.plot.left - 6}
			y={tick.y}
			text-anchor="end"
			dominant-baseline="middle"
		>
			{tick.value}
		</text>
	{/each}

	{#each chart.bars as bar (bar.label)}
		<rect class="bar" x={bar.x} y={bar.y} width={bar.width} height={Math.max(bar.height, 0)} rx="2">
			<title>{bar.label}: {bar.value}</title>
		</rect>
	{/each}

	{#each chart.xLabels as label (label.text)}
		<text class="axis" x={label.x} y={chart.plot.bottom + 18} text-anchor="middle"
			>{label.text}</text
		>
	{/each}
</svg>

<style>
	svg {
		width: 100%;
		height: auto;
		display: block;
	}

	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}

	.bar {
		fill: var(--accent);
	}

	.bar:hover {
		opacity: 0.8;
	}

	.axis {
		fill: var(--muted);
		font-size: 11px;
	}
</style>
