<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{page.status} · snaplink</title>
</svelte:head>

<section class="card">
	<h1>{page.status}</h1>
	<p>{page.error?.message ?? 'Something went wrong'}</p>
	<a href={resolve('/')}>Create a new link</a>
</section>
