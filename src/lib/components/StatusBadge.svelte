<script lang="ts">
	let { status }: { status: 'active' | 'expired' | 'exhausted' } = $props();
</script>

<span class="badge {status}">{status}</span>

<style>
	.badge {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		border: 1px solid currentColor;
	}

	.active {
		color: var(--ok);
	}

	.expired,
	.exhausted {
		color: var(--warn);
	}
</style>
