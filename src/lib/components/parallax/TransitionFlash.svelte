<script>
	// A brief bloom of light exactly when the screen key changes, so the
	// underlying component swap (old scene destroyed, new one mounted) reads
	// as a beat of motion -- a flash mid-flythrough -- instead of a visible
	// cut. Re-keying the div on every change restarts the CSS animation.
	let { screen } = $props();

	let flashFor = $state(null);
	let mounted = false;

	$effect(() => {
		const current = screen;
		if (!mounted) {
			mounted = true;
			return;
		}
		flashFor = current;
	});
</script>

{#if flashFor !== null}
	{#key flashFor}
		<div class="transition-flash"></div>
	{/key}
{/if}

<style>
	.transition-flash {
		position: fixed;
		inset: 0;
		z-index: 50;
		pointer-events: none;
		background: radial-gradient(circle at 50% 45%, rgba(255, 242, 220, 0.85), rgba(255, 242, 220, 0) 65%);
		animation: flash-fade 900ms ease-out forwards;
	}
	@keyframes flash-fade {
		0% {
			opacity: 0;
		}
		12% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
