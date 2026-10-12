<script>
	import '../app.css';
	import { base } from '$app/paths';
	import RotateGate from '$lib/components/RotateGate.svelte';
	import { lang } from '$lib/i18n.js';

	let { children } = $props();

	// app.html ships lang="en"; keep the document's language in step with the
	// selected one (screen readers, CJK font selection, hyphenation).
	$effect(() => {
		document.documentElement.lang = $lang === 'zh' ? 'zh-CN' : 'en';
	});
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
