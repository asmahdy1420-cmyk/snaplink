<script lang="ts">
	let {
		title,
		rows
	}: {
		title: string;
		rows: { label: string; count: number }[];
	} = $props();

	const max = $derived(Math.max(1, ...rows.map((r) => r.count)));
</script>

<section class="card">
	<h2>{title}</h2>
	{#if rows.length === 0}
		<p class="muted">No data yet.</p>
	{:else}
		<ul>
			{#each rows as row (row.label)}
				<li>
					<span class="bar" style:width="{(row.count / max) * 100}%"></span>
					<span class="label">{row.label}</span>
					<span class="count">{row.count}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	h2 {
		font-size: 1rem;
		margin: 0 0 12px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		position: relative;
		display: flex;
		justify-content: space-between;
		padding: 5px 8px;
		margin-bottom: 4px;
		font-size: 0.9rem;
	}

	.bar {
		position: absolute;
		inset: 0 auto 0 0;
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		border-radius: 6px;
	}

	.label,
	.count {
		position: relative;
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding-right: 12px;
	}

	.count {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
</style>
