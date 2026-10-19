<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Sign in · snaplink</title>
</svelte:head>

<form class="card narrow" method="POST" use:enhance>
	<h1>Admin sign in</h1>
	{#if !data.enabled}
		<p class="error">Admin access is disabled. Set the ADMIN_TOKEN environment variable.</p>
	{/if}
	<div class="field">
		<label for="token">Admin token</label>
		<input id="token" name="token" type="password" required autocomplete="current-password" />
		{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
	</div>
	<button type="submit" disabled={!data.enabled}>Sign in</button>
</form>

<style>
	.narrow {
		max-width: 420px;
		margin: 40px auto;
	}
</style>
