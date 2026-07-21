<script>
	// Stands in for pollykole.com's Three.js camera-path system, without the
	// 3D asset pipeline: each layer is a flat image/SVG at a given "depth"
	// (0 = far background, barely moves; 1 = near foreground, moves and
	// scales the most). Toggling `flying` lets CSS transition every layer by
	// a different amount at once, reading as a forward camera push.
	import { onMount } from 'svelte';

	// `zoomFromFar`: an alternate arrival style for scenes that should read as
	// a establishing-shot-to-close-up push (e.g. Plaza) rather than the default
	// decelerate-from-a-flythrough settle (below) -- starts noticeably smaller/
	// wide instead of larger/blurred, and takes longer to arrive.
	let { layers = [], flying = false, duration = 2200, zoomFromFar = false } = $props();

	// Every new scene starts slightly zoomed-in/blurred (as though still
	// carrying momentum from the flythrough that led here) and settles to
	// rest right after mount -- without this, a scene swap plus the previous
	// scene's flythrough reads as "fly forward, then hard cut to a static
	// frame," which is exactly the discontinuity this is fixing.
	let settled = $state(false);
	onMount(() => {
		requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
	});
</script>

<div class="parallax-scene" class:zoom-from-far={zoomFromFar}>
	{#each layers as layer (layer.id)}
		<div
			class="parallax-layer"
			class:flying
			class:entering={!settled}
			data-layer-id={layer.id}
			style="--depth:{layer.depth}; z-index:{Math.round(layer.depth * 10)}; transition-duration:{duration}ms; {layer.style ?? ''}"
		>
			{@html layer.svg}
		</div>
	{/each}
	<div class="scrim"></div>
</div>

<style>
	.parallax-scene {
		position: fixed;
		inset: 0;
		overflow: hidden;
		z-index: -1;
		background: var(--bg);
	}
	.parallax-layer {
		position: absolute;
		inset: -15% -20%;
		transition-property: transform, opacity, filter;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		will-change: transform;
	}
	.parallax-layer :global(svg) {
		width: 100%;
		height: 100%;
	}
	.parallax-layer.flying {
		transform: translateX(calc(var(--depth) * -70%)) scale(calc(1 + var(--depth) * 0.5));
		opacity: calc(1 - var(--depth) * 0.25);
	}
	.parallax-layer.entering {
		transform: scale(calc(1 + var(--depth) * 0.35));
		filter: blur(3px);
		transition-duration: 900ms;
	}
	/* opposite direction from the default above: starts pulled back/wide
	   (smaller, barely blurred, like an establishing shot) and pushes in to
	   the resting frame -- a deliberate far-to-near dolly rather than a
	   flythrough's momentum settling out. */
	.zoom-from-far .parallax-layer.entering {
		transform: scale(calc(0.68 + var(--depth) * 0.1));
		filter: blur(0.5px);
		transition-duration: 1800ms;
		transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.35) 100%);
		pointer-events: none;
	}
</style>
