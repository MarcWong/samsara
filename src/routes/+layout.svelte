<script>
	import '../app.css';
	import { base } from '$app/paths';
	import RotateGate from '$lib/components/RotateGate.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="{base}/favicon.ico" />
	<!-- The manifest's `orientation: landscape` only binds when the page is
	     installed/launched as a PWA -- in a plain browser tab, RotateGate's
	     portrait overlay below is what actually steers the player. -->
	<link rel="manifest" href="{base}/manifest.webmanifest" />
</svelte:head>

{@render children()}

<RotateGate />
