<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>snaplink</title>
</svelte:head>

<header>
	<nav>
		<a class="brand" href={resolve('/')}>snaplink</a>
		<span class="spacer"></span>
		<a href={resolve('/')}>New link</a>
		<a href={resolve('/admin')}>{data.isAdmin ? 'Dashboard' : 'Admin'}</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	nav {
		display: flex;
		gap: 16px;
		align-items: center;
		max-width: 960px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	nav a {
		color: var(--text);
		text-decoration: none;
	}

	.brand {
		font-weight: 800;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
	}

	.spacer {
		flex: 1;
	}
</style>
