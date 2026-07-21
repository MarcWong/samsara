<script>
	import { onMount } from 'svelte';
	import PlazaCityBackground from '../components/parallax/PlazaCityBackground.svelte';
	import { goToScreen } from '../stores.js';
	import COUNTRIES from '../game/functions/countries.js';

	// A small deterministic wobble per button so the board reads as
	// hand-pinned notices, not a perfect CSS grid.
	const TILTS = [-1.4, 0.8, -0.5, 1.6, -1, 0.5, 1.2, -1.7, 0.9, -0.4, 1.5, -1.1];

	// Settles in a beat after mount, same arrival cue every screen in this
	// flow uses, independent of whatever the WebGL background behind it is
	// doing.
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

<PlazaCityBackground {flying} />

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

	/* the board itself: a dark tech panel standing in the alley, low in the
	   frame and viewed at a genuine angle (rotateY, not just tilted back).
	   Cyan edge-lighting instead of the old warm-wood/amber treatment --
	   this screen's background is now a real photographed alley (see
	   PlazaCityBackground.svelte), and the neon-sign look integrates with
	   that a lot better than a lamplit noticeboard would. */
	.billboard {
		position: relative;
		width: 100%;
		max-width: 23rem;
		padding: 1.3rem 1.05rem 1.9rem;
		background:
			radial-gradient(ellipse 90% 55% at 50% -8%, rgba(0, 232, 255, 0.14), transparent 65%),
			linear-gradient(155deg, #1a1030 0%, #100a22 55%, #050308 100%);
		border: 2px solid rgba(0, 232, 255, 0.55);
		border-radius: 0.4rem;
		box-shadow:
			inset 0 0 0 1px rgba(0, 232, 255, 0.12),
			inset 0 3px 20px rgba(0, 0, 0, 0.7),
			0 0 2px rgba(0, 232, 255, 0.8),
			0 0 34px rgba(0, 232, 255, 0.3),
			0 0 70px rgba(255, 0, 200, 0.18),
			0 40px 45px -15px rgba(0, 0, 0, 0.75);
		transform: rotateX(6deg) rotateY(-11deg);
		transform-origin: center right;
	}

	/* a slim neon tube above the board instead of practical spotlights --
	   alternating cyan/magenta, the classic two-tone cyberpunk sign cue */
	.lamps {
		position: absolute;
		top: -1.1rem;
		left: 6%;
		right: 6%;
		height: 0.3rem;
		pointer-events: none;
		border-radius: 999px;
		background: linear-gradient(90deg, #00e8ff 0%, #00e8ff 45%, #ff2fd0 55%, #ff2fd0 100%);
		box-shadow:
			0 0 8px 2px rgba(0, 232, 255, 0.8),
			0 0 22px 6px rgba(255, 47, 208, 0.45);
	}
	.lamp {
		display: none;
	}

	/* the board's visible side thickness, revealed by the tilt */
	.billboard-edge {
		position: absolute;
		left: 4px;
		right: 4px;
		bottom: -13px;
		height: 13px;
		background: linear-gradient(180deg, #0a0614, #020103);
		border-radius: 0 0 4px 4px;
		box-shadow: inset 0 1px 0 rgba(0, 232, 255, 0.25);
	}
	/* support legs planting the board in the ground */
	.billboard::before,
	.billboard::after {
		content: '';
		position: absolute;
		bottom: -2.3rem;
		width: 0.75rem;
		height: 2.5rem;
		background: linear-gradient(180deg, #0d0818, #020103);
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
		color: #d9faff;
		text-shadow:
			0 0 6px rgba(0, 232, 255, 0.9),
			0 0 22px rgba(0, 232, 255, 0.5);
	}
	.board {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem 0.4rem;
	}

	/* each country is its own small neon-edged plaque, pinned at a slight
	   angle -- dark glass rather than the old warm wood plaque */
	.country {
		position: relative;
		border: 1px solid rgba(0, 232, 255, 0.35);
		border-radius: 0.35rem;
		background: linear-gradient(155deg, #171025, #0a0714);
		color: #d9faff;
		font-family: inherit;
		font-size: 0.8rem;
		padding: 0.6em 0.35em;
		cursor: pointer;
		transform: rotate(var(--tilt, 0deg));
		box-shadow:
			0 5px 8px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(0, 232, 255, 0.08),
			0 0 10px rgba(0, 232, 255, 0.12);
		transition: background 150ms ease, border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
	}
	.country::before {
		content: '';
		position: absolute;
		top: 0.3rem;
		left: 50%;
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #baf9ff, #00c3dd);
		transform: translateX(-50%);
		box-shadow: 0 0 5px 1px rgba(0, 232, 255, 0.7);
	}
	.country:hover {
		background: linear-gradient(155deg, #3a1240, #1c0a24);
		border-color: rgba(255, 47, 208, 0.75);
		transform: rotate(0deg) scale(1.05);
		box-shadow:
			0 8px 14px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 47, 208, 0.15),
			0 0 18px rgba(255, 47, 208, 0.45);
	}
	.country.chosen {
		background: linear-gradient(155deg, #3a1240, #1c0a24);
		border-color: rgba(255, 47, 208, 0.75);
		transform: rotate(0deg) scale(1.05);
		box-shadow:
			0 8px 14px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 47, 208, 0.15),
			0 0 18px rgba(255, 47, 208, 0.45);
	}
	.country:active {
		transform: rotate(0deg) scale(0.98);
	}
</style>
