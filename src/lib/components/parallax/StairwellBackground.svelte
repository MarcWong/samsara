<script>
	// Replaces the old 3D WebGL treadmill climb: 5.mp4 (the player walking
	// through the corridor's EXIT door into a stairwell, ending on a
	// symmetric straight-down/straight-up shot of the stairwell void) plays
	// once, continuing directly from Plaza's frozen corridor backdrop with
	// no visible seam. Once it ends, the last frame freezes and spins
	// slowly in place around the viewport's own center -- "5.mp4's last
	// frame rotating around the screen's center point" -- while Trajectory
	// lays its statbar/log UI on top exactly as it did over the old scene.
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { webCodecsSupported, loadMp4, CanvasVideoPlayer } from '../videoPlayer.js';

	// Fires the instant the clip ends and the spin starts -- Trajectory uses
	// this to hold its statbar/log hidden until then, instead of them
	// appearing over top of 5.mp4 while it's still mid-playback.
	let { onSpin = null } = $props();

	const supported = webCodecsSupported();

	let stageEl;
	let canvasEl;
	let videoEl = $state(null); // fallback path only
	let audioEl = $state(null);
	let resizeObserver;
	let player = null;
	let destroyed = false;

	// Rotation only starts once the clip has actually ended and its last
	// frame is frozen -- while it's still playing, the frame stays put.
	let spinning = $state(false);

	function startSpinning() {
		spinning = true;
		onSpin?.();
	}

	onMount(() => {
		if (!supported) return; // fallback <video> drives itself via markup

		player = new CanvasVideoPlayer(canvasEl);
		resizeObserver = new ResizeObserver(() => {
			const w = stageEl.clientWidth;
			const h = stageEl.clientHeight;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvasEl.width = Math.round(w * dpr);
			canvasEl.height = Math.round(h * dpr);
			player.redraw();
		});
		resizeObserver.observe(stageEl);

		(async () => {
			try {
				const media = await loadMp4(`${base}/videos/5.mp4`);
				if (destroyed) return;
				player.play(media, { loop: false, onEnded: startSpinning });
			} catch (err) {
				// A missing/broken clip shouldn't leave the screen frozen on
				// nothing -- start the (empty) spin state regardless so the
				// rest of the scene still behaves.
				console.error('[StairwellBackground] video failed', err);
				startSpinning();
			}
		})();

		startAudio();
	});

	// Same defensive autoplay-with-sound pattern used in CityIntro: Plaza's
	// Start button click is the real user gesture, but it reaches this
	// component through a setTimeout (the blink-out delay), which some
	// browsers no longer count as "still gesture-adjacent" -- try immediately,
	// and if refused, retry on the next pointer/key input.
	function startAudio() {
		if (!audioEl) return;
		audioEl.play().catch(() => {
			const resume = () => audioEl?.play().catch(() => {});
			window.addEventListener('pointerdown', resume, { once: true, capture: true });
			window.addEventListener('keydown', resume, { once: true, capture: true });
		});
	}

	onDestroy(() => {
		destroyed = true;
		resizeObserver?.disconnect();
		player?.stop();
		audioEl?.pause();
	});
</script>

<div class="bg-outer">
	<div class="center" bind:this={stageEl}>
		<div class="spin" class:spinning>
			{#if supported}
				<canvas bind:this={canvasEl}></canvas>
			{:else}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoEl}
					src="{base}/videos/5.mp4"
					autoplay
					playsinline
					onended={startSpinning}
				></video>
			{/if}
		</div>
	</div>
	{#if supported}
		<audio bind:this={audioEl} src="{base}/videos/5.mp4" preload="auto"></audio>
	{/if}
</div>

<style>
	.bg-outer {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: #0d1418;
	}
	/* Oversized (170%) and centered on the viewport's own middle: rotating
	   an element that only just covers the viewport would expose empty
	   corners at in-between angles, so the source frame is scaled well
	   past the viewport's diagonal-to-side ratio first, then only the
	   inner .spin layer actually rotates. */
	.center {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 170%;
		height: 170%;
		transform: translate(-50%, -50%);
	}
	.spin {
		position: absolute;
		inset: 0;
	}
	.spin.spinning {
		animation: spin 100s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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
