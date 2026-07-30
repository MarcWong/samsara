<script>
	// Rendered exactly once, unconditionally, by +page.svelte -- this is the
	// single persistent canvas every screen's video plays through (see
	// videoStage.svelte.js for why). It never mounts or unmounts as the
	// player navigates between screens; only its content changes.
	import { onMount, onDestroy } from 'svelte';
	import { videoStage } from './videoStage.svelte.js';
	import { skippable } from '../skip.js';
	import { CLIP_VOLUME } from '../audio.js';

	let stageEl = $state();
	let canvasEl = $state();
	let videoEl = $state();

	onMount(() => {
		videoStage.attach(canvasEl, stageEl);
	});
	onDestroy(() => {
		videoStage.detach();
	});

	// Fallback (<video>) path: reruns on every playFallback() call (key
	// bumps each time, including repeats of the same src).
	$effect(() => {
		const { key, rate, muted } = videoStage.fallback;
		if (!videoEl || !key) return;
		videoEl.load();
		videoEl.playbackRate = rate;
		videoEl.muted = muted;
		// On this path the clip's own soundtrack comes out of the <video>
		// itself rather than a sibling <audio>, so it needs the same level
		// against the bg.opus bed that CityIntro sets on its elements.
		videoEl.volume = CLIP_VOLUME;
		videoEl.play().catch(() => {});
	});
</script>

<div class="video-stage" bind:this={stageEl}>
	{#if videoStage.supported}
		<canvas bind:this={canvasEl}></canvas>
	{:else}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={videoEl}
			src={videoStage.fallback.src}
			loop={videoStage.fallback.loop}
			autoplay
			playsinline
			onended={() => videoStage.fallbackEnded()}
			use:skippable
		></video>
	{/if}
</div>

<style>
	.video-stage {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: #0d1418;
	}
	canvas,
	video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
