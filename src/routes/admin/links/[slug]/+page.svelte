<script lang="ts">
	import { resolve } from '$app/paths';
	import BarList from '$lib/components/BarList.svelte';
	import ClicksChart from '$lib/components/ClicksChart.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { formatUtc, shortDay } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const points = $derived(
		data.stats.daily.map((d) => ({ label: shortDay(d.day), value: d.clicks }))
	);
</script>

<svelte:head>
	<title>/{data.link.slug} analytics · snaplink</title>
</svelte:head>

<p><a href={resolve('/admin')}>All links</a></p>

<section class="card summary">
	<div>
		<h1>/{data.link.slug} <StatusBadge status={data.link.status} /></h1>
		<p class="short">
			<a href={resolve('/[slug]', { slug: data.link.slug })}>{data.link.shortUrl}</a>
			<CopyButton text={data.link.shortUrl} />
		</p>
		<p class="muted truncate" title={data.link.targetUrl}>to {data.link.targetUrl}</p>
		<p class="muted">
			Created {formatUtc(data.link.createdAt)} · Expires {formatUtc(data.link.expiresAt)}
			{#if data.link.maxClicks}· Limit {data.link.maxClicks} clicks{/if}
			{#if data.link.protected}· Password protected{/if}
		</p>
	</div>
	<img
		src={resolve('/[slug]/qr.svg', { slug: data.link.slug })}
		alt="QR code"
		width="120"
		height="120"
	/>
</section>

<div class="grid totals">
	<div class="card stat">
		<span class="value">{data.link.clickCount}</span><span class="muted">clicks all time</span>
	</div>
	<div class="card stat">
		<span class="value">{data.stats.totalClicks}</span><span class="muted"
			>clicks, last {data.days} days</span
		>
	</div>
	<div class="card stat">
		<span class="value">{data.stats.uniqueVisitors}</span>
		<span class="muted" title="Daily unique visitors, summed"
			>daily uniques, last {data.days} days</span
		>
	</div>
</div>

<section class="card">
	<div class="chart-head">
		<h2>Clicks over time</h2>
		<form method="GET" class="ranges" aria-label="Range">
			{#each data.ranges as range (range)}
				<button
					name="days"
					value={range}
					class={range === data.days ? '' : 'secondary'}
					aria-pressed={range === data.days}>{range}d</button
				>
			{/each}
		</form>
	</div>
	<ClicksChart {points} />
</section>

<div class="grid">
	<BarList title="Top referrers" rows={data.stats.referrers} />
	<BarList title="Browsers" rows={data.stats.browsers} />
	<BarList title="Countries" rows={data.stats.countries} />
</div>

<style>
	.summary {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	h1 {
		margin: 0 0 6px;
	}

	.short {
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 0;
	}

	img {
		border-radius: 8px;
		background: #fff;
	}

	.totals {
		margin-bottom: 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.value {
		font-size: 1.8rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.chart-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h2 {
		font-size: 1rem;
		margin: 0;
	}

	.ranges {
		display: flex;
		gap: 6px;
	}

	.ranges button {
		padding: 4px 10px;
	}
</style>
