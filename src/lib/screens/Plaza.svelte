<script>
	import { onMount } from 'svelte';
	import PlazaCityBackground from '../components/parallax/PlazaCityBackground.svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import COUNTRIES from '../game/functions/countries.js';

	const ORIENTATIONS = [
		{ value: 0, label: 'Straight' },
		{ value: 1, label: 'LBTQ' },
	];

	// Settles in a beat after mount, same arrival cue every screen in this
	// flow uses, independent of whatever the WebGL background behind it is
	// doing.
	let settled = $state(false);
	onMount(() => {
		requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
	});

	// The sexual-orientation choice used to be its own screen (Housing's
	// former "sex" step, before that -- a standalone SexOrientation screen).
	// It's folded in here now: the country and orientation billboards share
	// this one scene, with the WebGL background turning 180° between them
	// instead of a hard screen cut -- "walking to the other side of the
	// street" rather than "next screen."
	let country = $state(null);
	let turned = $state(false);
	let orientation = $state(null);
	let flying = $state(false);

	function chooseCountry(code) {
		if (country) return;
		country = code;
		turned = true;
	}

	// Ported verbatim from Housing.svelte's drawTalentsSilently -- the
	// lucky-charm draw has always happened immediately after the orientation
	// choice, just silently (no dedicated UI), so it moves here with it.
	function drawTalents() {
		const listTalents = core.talentRandom();
		const selected = new Set();
		while (selected.size < 3) {
			const id = Math.floor(Math.random() * 10);
			if (selected.has(5) && id == 7) continue;
			if (selected.has(7) && id == 5) continue;
			if (!selected.has(id)) selected.add(id);
		}
		return [...selected].map(index => listTalents[index]);
	}

	function chooseOrientation(LBTQ) {
		if (!turned || flying) return;
		orientation = LBTQ;
		flying = true;
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === country ? 1 : 0]));
		const talents = drawTalents();
		setTimeout(() => goToScreen('HOUSING', { ...nationality, LBTQ, talents }), 2400);
	}
</script>

<PlazaCityBackground {flying} {turned} />

<!-- Country selection renders straight onto the retro TV's screen (see
     PlazaCityBackground.svelte for the 3D prop) instead of a floating sign --
     positioned/sized to line up with the screen glass at this scene's fixed
     camera framing, phosphor-green CRT terminal styling instead of the
     cyberpunk neon board look. -->
<div class="crt-screen" class:hidden={turned || flying} class:entering={!settled}>
	<div class="scanlines" aria-hidden="true"></div>
	<div class="crt-glow" aria-hidden="true"></div>
	<h2 class="crt-prompt">&gt; SELECT COUNTRY OF BIRTH_</h2>
	<div class="crt-grid">
		{#each COUNTRIES as { code, name } (code)}
			<button type="button" class="crt-item" class:chosen={country === code} onclick={() => chooseCountry(code)}>
				[{name}]
			</button>
		{/each}
	</div>
</div>

<!-- No second TV on the far side of the street -- same green/Courier CRT
     language carried over (per the standing "keep the styles consistent"
     rule from Plaza's orientation step), just back to a standalone panel
     since there's no screen prop to align to over there. -->
<div class="content" class:hidden={!turned || flying}>
	<div class="billboard">
		<h2 class="crt-prompt">&gt; SELECT ORIENTATION_</h2>
		<div class="crt-grid orientation-grid">
			{#each ORIENTATIONS as { value, label } (value)}
				<button
					type="button"
					class="crt-item"
					class:chosen={orientation === value}
					onclick={() => chooseOrientation(value)}
				>
					[{label}]
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	/* Phosphor-green CRT terminal look, shared by both the TV screen overlay
	   and the standalone orientation panel. */
	:global(.crt-screen),
	:global(.billboard) {
		font-family: 'Courier New', Courier, monospace;
	}

	.crt-screen {
		position: fixed;
		left: 13.5%;
		top: 10.5%;
		width: 57%;
		height: 43%;
		padding: 3% 4%;
		background: radial-gradient(ellipse 90% 80% at 50% 40%, #0c1c0c 0%, #050a05 100%);
		color: #39ff6a;
		overflow: hidden;
		box-shadow: inset 0 0 3vw rgba(0, 0, 0, 0.85);
		transition: opacity 500ms ease;
	}
	.crt-screen.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.crt-screen.entering {
		opacity: 0;
	}

	/* classic scanline texture, plus a soft central glow to sell "lit CRT
	   glass" rather than a flat green rectangle */
	.scanlines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.35) 0px,
			rgba(0, 0, 0, 0.35) 1px,
			transparent 2px,
			transparent 3px
		);
		mix-blend-mode: multiply;
	}
	.crt-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(57, 255, 106, 0.14), transparent 70%);
	}

	.crt-prompt {
		position: relative;
		font-size: 1rem;
		margin: 0 0 0.6rem;
		text-align: left;
		letter-spacing: 0.03em;
		text-shadow:
			0 0 4px rgba(57, 255, 106, 0.95),
			0 0 14px rgba(57, 255, 106, 0.6);
	}
	.crt-grid {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.3em 0.5em;
	}
	.orientation-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6em;
		max-width: 22rem;
	}

	.crt-item {
		border: none;
		background: none;
		color: #39ff6a;
		font-family: inherit;
		font-size: 0.72rem;
		text-align: left;
		padding: 0.2em 0.1em;
		cursor: pointer;
		text-shadow: 0 0 5px rgba(57, 255, 106, 0.75);
		transition: color 120ms ease, text-shadow 120ms ease;
	}
	.crt-item:hover {
		color: #baffc9;
		text-shadow:
			0 0 6px rgba(186, 255, 201, 0.95),
			0 0 16px rgba(57, 255, 106, 0.8);
	}
	.crt-item.chosen {
		color: #fff;
		text-shadow:
			0 0 8px #fff,
			0 0 20px rgba(57, 255, 106, 1);
	}
	.orientation-grid .crt-item {
		font-size: 1.1rem;
		padding: 0.5em 0.2em;
	}

	/* the standalone orientation panel -- same green/Courier language, plain
	   dark glass instead of a screen-aligned overlay since there's no TV
	   prop on this side of the street. */
	.content {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: 2rem 1.25rem 3rem;
		transition: opacity 600ms ease;
	}
	.content.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.billboard {
		width: 100%;
		max-width: 23rem;
		padding: 1.3rem 1.4rem 1.6rem;
		background: radial-gradient(ellipse 90% 80% at 50% 20%, #0c1c0c 0%, #050a05 100%);
		border: 2px solid rgba(57, 255, 106, 0.55);
		border-radius: 0.4rem;
		box-shadow:
			inset 0 0 0 1px rgba(57, 255, 106, 0.12),
			inset 0 3px 20px rgba(0, 0, 0, 0.7),
			0 0 2px rgba(57, 255, 106, 0.8),
			0 0 34px rgba(57, 255, 106, 0.3),
			0 40px 45px -15px rgba(0, 0, 0, 0.75);
	}
</style>
