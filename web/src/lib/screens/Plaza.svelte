<script>
	import { onMount } from 'svelte';
	import ParallaxScene from '../components/parallax/ParallaxScene.svelte';
	import { skyline, cityHall, lamppost, DUSK_SKY } from '../components/parallax/art.js';
	import { goToScreen } from '../stores.js';
	import COUNTRIES from '../game/functions/countries.js';

	// City hall is tall and centered, reaching well up into the frame, so its
	// dome stays visible above the billboard on narrow/portrait viewports --
	// the billboard itself sits low in the layout (see .content below) and is
	// narrower than the viewport, rather than the two competing for the same
	// vertical band.
	const layers = [
		{ id: 'sky', depth: 0.05, svg: '', style: `background: ${DUSK_SKY};` },
		{ id: 'skyline', depth: 0.12, svg: skyline({ seed: 11, color: '#100f16', height: 380, count: 8 }), style: 'bottom:0; top:auto; height:56%;' },
		{ id: 'cityhall', depth: 0.2, svg: cityHall({}), style: 'bottom:0; top:auto; height:72%;' },
		{
			id: 'fog',
			depth: 0.25,
			svg: '',
			style:
				'bottom:0; top:auto; height:46%; background:linear-gradient(180deg, transparent, rgba(201,143,114,0.14) 55%, rgba(180,120,110,0.05) 100%);',
		},
		{ id: 'floor', depth: 0.3, svg: '', style: 'bottom:0; top:auto; height:28%; background:linear-gradient(180deg, transparent, #14120f 60%, #0a0908 100%);' },
		{
			id: 'lamp-left',
			depth: 0.9,
			svg: lamppost({}),
			style: 'bottom:-6%; top:auto; left:-8%; right:auto; width:13%; height:56%;',
		},
		{
			id: 'lamp-right',
			depth: 0.9,
			svg: lamppost({}),
			style: 'bottom:-6%; top:auto; right:-8%; left:auto; width:13%; height:56%; transform:scaleX(-1);',
		},
	];

	// A small deterministic wobble per button so the board reads as
	// hand-pinned notices, not a perfect CSS grid.
	const TILTS = [-1.4, 0.8, -0.5, 1.6, -1, 0.5, 1.2, -1.7, 0.9, -0.4, 1.5, -1.1];

	// Mirrors ParallaxScene's own entering->settled beat so the billboard
	// arrives in the same far-to-near push as the buildings behind it,
	// instead of popping in ahead of/separate from the scene.
	let settled = $state(false);
	onMount(() => {
		requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
	});

	let flying = $state(false);
	let chosen = $state(null);

	function choose(code) {
		if (flying) return;
		chosen = code;
		flying = true;
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === code ? 1 : 0]));
		setTimeout(() => goToScreen('HOUSING', nationality), 2400);
	}
</script>

<ParallaxScene {layers} {flying} zoomFromFar={true} />

<div class="content" class:hidden={flying} class:entering={!settled}>
	<div class="billboard">
		<div class="lamps" aria-hidden="true">
			<span class="lamp" style="left:18%"></span>
			<span class="lamp" style="left:50%"></span>
			<span class="lamp" style="left:82%"></span>
		</div>
		<div class="billboard-edge"></div>
		<h2 class="prompt">Which country would you choose to be born in?</h2>
		<div class="board">
			{#each COUNTRIES as { code, name }, i (code)}
				<button
					type="button"
					class="country"
					class:chosen={chosen === code}
					style="--tilt:{TILTS[i % TILTS.length]}deg"
					onclick={() => choose(code)}
				>
					{name}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	/* City hall's left/right inset controls how much of its width the
	   slice-mode SVG (see cityHall() in art.js) crops away -- tuned
	   separately per orientation because the container's aspect ratio
	   swings from taller-than-wide (portrait) to much wider-than-tall
	   (landscape) at the same percentages, and slice-mode's crop axis
	   flips between them: unchanged, a landscape viewport stretches the
	   inset so wide relative to its height that the whole silhouette
	   blows up into an unrecognizable, mostly-flat wall. */
	:global(.parallax-layer[data-layer-id='cityhall']) {
		left: 8%;
		right: 8%;
	}
	@media (orientation: landscape) {
		:global(.parallax-layer[data-layer-id='cityhall']) {
			left: 36%;
			right: 36%;
		}
	}

	.content {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: 2rem 1.25rem 3rem;
		transition: opacity 600ms ease;
		perspective: 1400px;
	}
	.content.hidden {
		opacity: 0;
		pointer-events: none;
	}
	/* the billboard's own leg of the far-to-near arrival -- pulled back and
	   faded so it grows into place alongside the buildings behind it rather
	   than appearing instantly at full size. */
	.content > .billboard {
		transition: opacity 1400ms ease, transform 1800ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.content.entering > .billboard {
		opacity: 0;
		transform: rotateX(6deg) rotateY(-11deg) scale(0.6) translateY(6%);
	}

	/* the board itself: a physical panel standing in the plaza, low in the
	   frame and viewed at a genuine angle (rotateY, not just tilted back)
	   so city hall stays visible rising behind and above it */
	.billboard {
		position: relative;
		width: 100%;
		max-width: 23rem;
		padding: 1.3rem 1.05rem 1.9rem;
		background:
			radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255, 214, 150, 0.16), transparent 65%),
			linear-gradient(155deg, #362f27 0%, #1c1916 55%, #0d0b0a 100%);
		border: 8px solid #0b0a09;
		border-radius: 0.4rem;
		box-shadow:
			inset 0 0 0 2px rgba(255, 255, 255, 0.04),
			inset 0 3px 20px rgba(0, 0, 0, 0.65),
			0 3px 0 rgba(255, 255, 255, 0.04),
			0 40px 45px -15px rgba(0, 0, 0, 0.7),
			0 -18px 40px -10px rgba(255, 200, 130, 0.12);
		transform: rotateX(6deg) rotateY(-11deg);
		transform-origin: center right;
	}

	/* three spotlights bolted above the board, each spilling a soft cone of
	   warm light down onto it -- the "practical lighting" cue */
	.lamps {
		position: absolute;
		top: -2.4rem;
		left: 0;
		right: 0;
		height: 2.4rem;
		pointer-events: none;
	}
	.lamp {
		position: absolute;
		top: 0;
		width: 3px;
		height: 1.6rem;
		background: linear-gradient(180deg, #0c0b0a, #1e1a16);
		transform: translateX(-50%);
	}
	.lamp::before {
		content: '';
		position: absolute;
		bottom: -0.3rem;
		left: 50%;
		transform: translateX(-50%);
		width: 0.8rem;
		height: 0.42rem;
		border-radius: 50%;
		background: radial-gradient(circle, #ffedc4, #d9a85c 75%);
		box-shadow: 0 0 13px 5px rgba(255, 214, 150, 0.55);
	}
	.lamp::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 4.2rem;
		height: 3.2rem;
		background: radial-gradient(ellipse at top, rgba(255, 214, 150, 0.3), rgba(255, 214, 150, 0) 72%);
	}

	/* the board's visible side thickness, revealed by the tilt -- what
	   actually sells "this is a physical object", not a flat card */
	.billboard-edge {
		position: absolute;
		left: 4px;
		right: 4px;
		bottom: -13px;
		height: 13px;
		background: linear-gradient(180deg, #0b0a09, #030303);
		border-radius: 0 0 4px 4px;
	}
	/* support legs planting the board in the ground */
	.billboard::before,
	.billboard::after {
		content: '';
		position: absolute;
		bottom: -2.3rem;
		width: 0.75rem;
		height: 2.5rem;
		background: linear-gradient(180deg, #100e0c, #030303);
		border-radius: 0 0 3px 3px;
		box-shadow: 0 8px 14px rgba(0, 0, 0, 0.55);
	}
	.billboard::before {
		left: 16%;
	}
	.billboard::after {
		right: 16%;
	}

	.prompt {
		font-size: 1.05rem;
		margin: 0 0 0.85rem;
		text-align: center;
		color: #f1ece2;
		text-shadow:
			0 2px 6px rgba(0, 0, 0, 0.5),
			0 0 18px rgba(255, 214, 150, 0.2);
	}
	.board {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem 0.4rem;
	}

	/* each country is its own small plaque, pinned at a slight angle */
	.country {
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 0.35rem;
		background: linear-gradient(155deg, #4a4238, #2b2721);
		color: var(--text);
		font-family: inherit;
		font-size: 0.8rem;
		padding: 0.6em 0.35em;
		cursor: pointer;
		transform: rotate(var(--tilt, 0deg));
		box-shadow:
			0 5px 8px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
		transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
	}
	.country::before {
		content: '';
		position: absolute;
		top: 0.3rem;
		left: 50%;
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #e8d9b0, #8a7a4a);
		transform: translateX(-50%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}
	.country:hover {
		background: linear-gradient(155deg, #6495ed, #4a72c9);
		transform: rotate(0deg) scale(1.05);
		box-shadow:
			0 8px 14px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}
	.country.chosen {
		background: linear-gradient(155deg, #6495ed, #4a72c9);
		transform: rotate(0deg) scale(1.05);
	}
	.country:active {
		transform: rotate(0deg) scale(0.98);
	}
</style>
