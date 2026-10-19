<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { formatUtc } from '$lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Dashboard · snaplink</title>
</svelte:head>

<div class="head">
	<h1>Links <span class="muted">({data.total})</span></h1>
	<form method="POST" action="?/logout" use:enhance>
		<button type="submit" class="secondary">Sign out</button>
	</form>
</div>

{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}

<section class="card">
	{#if data.links.length === 0}
		<p class="muted">No links yet. <a href={resolve('/')}>Create the first one.</a></p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Short link</th>
						<th>Destination</th>
						<th>Clicks</th>
						<th>Expires</th>
						<th>Status</th>
						<th><span class="visually-hidden">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.links as link (link.slug)}
						<tr>
							<td>
								<a href={resolve('/admin/links/[slug]', { slug: link.slug })}>/{link.slug}</a>
								{#if link.protected}<span class="muted" title="Password protected">(locked)</span
									>{/if}
							</td>
							<td class="truncate" title={link.targetUrl}>{link.targetUrl}</td>
							<td>{link.clickCount}{link.maxClicks ? ` / ${link.maxClicks}` : ''}</td>
							<td>{formatUtc(link.expiresAt)}</td>
							<td><StatusBadge status={link.status} /></td>
							<td>
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ cancel }) => {
										if (!confirm(`Delete /${link.slug} and its analytics?`)) cancel();
									}}
								>
									<input type="hidden" name="slug" value={link.slug} />
									<button type="submit" class="danger">Delete</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if data.pages > 1}
	<form class="pager" method="GET" aria-label="Pagination">
		<button class="secondary" name="page" value={data.page - 1} disabled={data.page <= 1}>
			Previous
		</button>
		<span class="muted">Page {data.page} of {data.pages}</span>
		<button class="secondary" name="page" value={data.page + 1} disabled={data.page >= data.pages}>
			Next
		</button>
	</form>
{/if}

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.pager {
		display: flex;
		align-items: center;
		gap: 16px;
		justify-content: center;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
