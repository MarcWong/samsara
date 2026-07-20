<script>
	// Placeholder for Phase 4's per-screen looping video backgrounds (see the
	// migration plan's Deferred section). Each screen gets a CSS gradient here
	// so screen components don't need to change at all when a real .mp4/.webm
	// loop is swapped in later — only this lookup gains a <video> per key.
	const GRADIENTS = {
		MAIN: 'radial-gradient(circle at 30% 20%, #3a4454, #1a1e24 70%)',
		REBORN: 'radial-gradient(circle at 70% 30%, #35404e, #1a1e24 70%)',
		MODE: 'linear-gradient(160deg, #2a3038, #1a1e24 60%, #2e2438)',
		SEXORIENTATION: 'linear-gradient(160deg, #2e2a3a, #1a1e24 60%)',
		TALENT: 'radial-gradient(circle at 50% 15%, #3a3450, #1a1e24 70%)',
		PROPERTYTEXT: 'linear-gradient(160deg, #2a3542, #1a1e24 60%)',
		PROPERTY: 'linear-gradient(160deg, #263042, #1a1e24 65%)',
		TRAJECTORY: 'linear-gradient(180deg, #1e2530, #23202a 80%)',
		SUMMARY: 'radial-gradient(circle at 50% 0%, #2e3a42, #1a1e24 70%)',
	};

	let { screen } = $props();
	let gradient = $derived(GRADIENTS[screen] ?? GRADIENTS.MAIN);
</script>

<div class="background" style:background={gradient}></div>

<style>
	.background {
		position: fixed;
		inset: 0;
		z-index: -1;
		transition: background 400ms ease;
	}
</style>
