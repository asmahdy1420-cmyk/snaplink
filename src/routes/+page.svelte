<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { formatUtc } from '$lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>snaplink · shorten a link</title>
</svelte:head>

<h1>Shorten a link</h1>

{#if !data.canCreate}
	<section class="card">
		<p>Link creation is limited to the administrator on this instance.</p>
		<a class="button" href={resolve('/admin/login')}>Sign in</a>
	</section>
{:else}
	<form
		class="card"
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<div class="field">
			<label for="url">Destination URL</label>
			<input
				id="url"
				name="url"
				type="url"
				required
				placeholder="https://example.com/a/very/long/path"
				value={form?.values?.url ?? ''}
				aria-invalid={form?.errors?.url ? 'true' : undefined}
				aria-describedby={form?.errors?.url ? 'url-error' : undefined}
			/>
			{#if form?.errors?.url}<p class="error" id="url-error">{form.errors.url[0]}</p>{/if}
		</div>

		<details
			open={Boolean(
				form?.errors?.alias ||
				form?.errors?.expiresAt ||
				form?.errors?.maxClicks ||
				form?.errors?.password
			)}
		>
			<summary>Options</summary>
			<div class="grid options">
				<div class="field">
					<label for="alias">Custom alias</label>
					<input
						id="alias"
						name="alias"
						placeholder="spring-sale"
						value={form?.values?.alias ?? ''}
						aria-invalid={form?.errors?.alias ? 'true' : undefined}
					/>
					{#if form?.errors?.alias}<p class="error">{form.errors.alias[0]}</p>{/if}
				</div>
				<div class="field">
					<label for="expiresAt">Expires at (UTC)</label>
					<input
						id="expiresAt"
						name="expiresAt"
						type="datetime-local"
						value={form?.values?.expiresAt ?? ''}
						aria-invalid={form?.errors?.expiresAt ? 'true' : undefined}
					/>
					{#if form?.errors?.expiresAt}<p class="error">{form.errors.expiresAt[0]}</p>{/if}
				</div>
				<div class="field">
					<label for="maxClicks">Max clicks</label>
					<input
						id="maxClicks"
						name="maxClicks"
						type="number"
						min="1"
						step="1"
						value={form?.values?.maxClicks ?? ''}
						aria-invalid={form?.errors?.maxClicks ? 'true' : undefined}
					/>
					{#if form?.errors?.maxClicks}<p class="error">{form.errors.maxClicks[0]}</p>{/if}
				</div>
				<div class="field">
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						aria-invalid={form?.errors?.password ? 'true' : undefined}
					/>
					{#if form?.errors?.password}<p class="error">{form.errors.password[0]}</p>{/if}
				</div>
			</div>
		</details>

		<button type="submit" disabled={submitting}>{submitting ? 'Shortening...' : 'Shorten'}</button>
	</form>
{/if}

{#if form?.created}
	{@const created = form.created}
	<section class="card result" aria-live="polite">
		<div>
			<p class="muted">Your short link</p>
			<p class="short">
				<a href={resolve('/[slug]', { slug: created.slug })}>{created.shortUrl}</a>
				<CopyButton text={created.shortUrl} />
			</p>
			<p class="muted truncate">to {created.targetUrl}</p>
			<ul class="muted">
				{#if created.expiresAt}<li>Expires {formatUtc(created.expiresAt)}</li>{/if}
				{#if created.maxClicks}<li>Stops after {created.maxClicks} clicks</li>{/if}
				{#if created.protected}<li>Password protected</li>{/if}
			</ul>
			{#if data.isAdmin}
				<a href={resolve('/admin/links/[slug]', { slug: created.slug })}>View analytics</a>
			{/if}
		</div>
		<figure>
			<img
				src={resolve('/[slug]/qr.svg', { slug: created.slug })}
				alt="QR code for {created.shortUrl}"
				width="160"
				height="160"
			/>
			<figcaption>
				<a href={resolve('/[slug]/qr.svg', { slug: created.slug })} download="{created.slug}.svg">
					Download QR
				</a>
			</figcaption>
		</figure>
	</section>
{/if}

<style>
	summary {
		cursor: pointer;
		margin-bottom: 12px;
		color: var(--muted);
	}

	.options {
		margin-bottom: 4px;
	}

	.result {
		display: flex;
		gap: 20px;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.short {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 4px;
		word-break: break-all;
	}

	ul {
		padding-left: 18px;
	}

	figure {
		margin: 0;
		text-align: center;
	}

	img {
		border-radius: 8px;
		background: #fff;
	}
</style>
