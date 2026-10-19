<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Protected link · snaplink</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<form class="card narrow" method="POST" use:enhance>
	<h1>This link is protected</h1>
	<p class="muted">Enter the password you were given to continue.</p>
	<div class="field">
		<label for="password">Password</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input id="password" name="password" type="password" required autocomplete="off" autofocus />
		{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
	</div>
	<button type="submit">Continue</button>
</form>

<style>
	.narrow {
		max-width: 420px;
		margin: 40px auto;
	}
</style>
