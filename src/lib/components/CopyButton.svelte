<script lang="ts">
	let { text }: { text: string } = $props();
	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<button type="button" class="secondary" onclick={copy} aria-live="polite">
	{copied ? 'Copied' : 'Copy'}
</button>
