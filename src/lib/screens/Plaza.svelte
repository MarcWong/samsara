<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import { loadMp4, webCodecsSupported } from '../components/videoPlayer.js';
	import COUNTRIES from '../game/functions/countries.js';

	const ORIENTATIONS = [
		{ value: 0, label: 'Straight' },
		{ value: 1, label: 'LBTQ' },
	];

	// Orientation selection now happens right on the corridor photo itself
	// (4.mp4's final frame / corridor.jpg) instead of a DOS popup: the
	// double doors' two crash-bar handles carry the two choices, and the
	// prompt sits just below them. Same 1280x720 frame CityIntro's own door
	// overlay uses; coordinates below are percentages of that frame,
	// measured directly off the bars in corridor.jpg (left bar center
	// ~x545/y392, right bar center ~x735/y392 out of 1280x720).
	const VIDEO_W = 1280;
	const VIDEO_H = 720;
	const HANDLE_Y = 54.4;
	const HANDLE_LEFT_X = 42.6;
	const HANDLE_RIGHT_X = 57.4;
	const PROMPT_Y = 64;

	// Tracks the viewport so the orientation step's door-handle overlay can
	// be pinned to corridor.jpg's exact cover-fit rectangle -- same formula
	// CityIntro uses for its own door overlay, needed here because that
	// step renders straight over the full-bleed corridor image instead of
	// inside the fixed-aspect crt-screen panel.
	let cw = $state(0);
	let ch = $state(0);
	let overlayStyle = $derived.by(() => {
		if (!cw || !ch) return 'display: none;';
		const s = Math.max(cw / VIDEO_W, ch / VIDEO_H);
		const dw = VIDEO_W * s;
		const dh = VIDEO_H * s;
		return `left: ${(cw - dw) / 2}px; top: ${(ch - dh) / 2}px; width: ${dw}px; height: ${dh}px;`;
	});

	onMount(() => {
		const resize = () => {
			cw = window.innerWidth;
			ch = window.innerHeight;
		};
		resize();
		window.addEventListener('resize', resize);

		// Kicked off as early as this screen mounts (not on the orientation
		// click) so 5.mp4 has the longest possible head start -- StairwellBackground's
		// own loadMp4() call for the same URL then just awaits this same
		// cached promise instead of starting a fresh fetch, closing the gap
		// that used to show as a black flash while Trajectory waited on it.
		if (webCodecsSupported()) loadMp4(`${base}/videos/5.mp4`).catch(() => {});

		return () => window.removeEventListener('resize', resize);
	});

	// Country -> orientation -> property used to be three separate scenes
	// (Mode -> SexOrientation -> Property), then two (a camera turn to a
	// second billboard, then a hard cut to Housing's own 2.5D parallax
	// scene). Per explicit request, all three now play out as different
	// window content on this one same TV screen, in this one same camera
	// shot, with no turn and no scene cut at all -- `step` just picks which
	// window is showing.
	// The country is now normally chosen on the intro's morgue-wall frame
	// (CityIntro passes it in as draft.countryCode), so this screen starts
	// straight at the orientation window; its own country list remains only
	// as a fallback for a draft without one.
	let step = $state($draft.countryCode ? 'orientation' : 'country');
	let country = $state($draft.countryCode ?? null);
	let orientation = $state(null);
	let talents = [];

	function chooseCountry(code) {
		if (step !== 'country') return;
		country = code;
		step = 'orientation';
	}

	// Talent pool indices (order matches talents.json: 0=Earthquake,
	// 1=Airplane Crash, 2=Farewell Mom, 3=Bankruptcy, 4=Rape, 5=Helen of
	// Troy, 6=Job opportunity, 7=You are beautiful, 8=A miracle of life,
	// 9=Queen's gambit) -- a real plane crash is vastly rarer in a single
	// life than the other events on this list, so it's drawn at 1/100th
	// the weight of everything else instead of an equal 1-in-10 shot.
	const TALENT_WEIGHTS = { 1: 0.01 };

	// Ported from the old drawTalentsSilently (the lucky-charm draw has
	// always happened immediately after the orientation choice, just
	// silently, no dedicated UI), reworked from uniform-without-replacement
	// to weighted-without-replacement so TALENT_WEIGHTS can bias the draw.
	// Each of the 3 picks re-derives its candidate pool (respecting both
	// what's already been picked and the 5/7 mutual-exclusion rule) and
	// samples from it proportional to weight.
	function drawTalents() {
		const listTalents = core.talentRandom();
		const selected = [];
		const available = new Set(listTalents.map((_, i) => i));
		while (selected.length < 3) {
			const candidates = [...available].filter(id => {
				if (selected.includes(5) && id === 7) return false;
				if (selected.includes(7) && id === 5) return false;
				return true;
			});
			const totalWeight = candidates.reduce((sum, id) => sum + (TALENT_WEIGHTS[id] ?? 1), 0);
			let r = Math.random() * totalWeight;
			let pick = candidates[candidates.length - 1];
			for (const id of candidates) {
				const w = TALENT_WEIGHTS[id] ?? 1;
				if (r < w) {
					pick = id;
					break;
				}
				r -= w;
			}
			selected.push(pick);
			available.delete(pick);
		}
		return selected.map(index => listTalents[index]);
	}

	// Stat allocation used to happen here too (a third DOS popup after
	// orientation), but now happens in Trajectory instead, over the
	// stairwell frame's own sky highlight -- picking an
	// orientation is the last thing this screen does; it goes straight to
	// Trajectory (and 5.mp4) afterward, no transition animation.
	function chooseOrientation(LBTQ) {
		if (step !== 'orientation') return;
		orientation = LBTQ;
		talents = drawTalents();
		const replace = core.remake(talents.map(t => t.id));
		if (replace.length > 0) {
			globalThis.$$event('message', [replace.map(v => ['F_TalentReplace', v])]);
		}
		goToScreen('TRAJECTORY', { countryCode: country, orientation: LBTQ, talents });
	}
</script>

<!-- The final frame of 4.mp4 (the hospital corridor CityIntro just walked
     into), same still used as CityIntro's own handoff frame so there's no
     visible cut arriving here. The computer prop that used to stand in
     this corridor (and the screen-glass homography that warped the DOS
     UI onto it) is gone -- the UI below is now a plain centered panel. -->
<div class="corridor-bg" style="background-image: url('{base}/images/corridor.jpg');"></div>

<!-- One persistent phosphor-green CRT/DOS panel, floating centered over
     the corridor backdrop -- `step` just swaps which window is showing.
     Hidden entirely during 'orientation': that step now renders straight
     onto the corridor photo itself (see the overlay below) instead of in
     this popup. -->
{#if step !== 'orientation'}
<div class="crt-screen">
	<div class="scanlines" aria-hidden="true"></div>
	<div class="crt-pixels" aria-hidden="true"></div>
	<div class="crt-glow" aria-hidden="true"></div>
	<div class="crt-curve" aria-hidden="true"></div>

	{#if step === 'country'}
		<h2 class="crt-prompt">&gt; SELECT COUNTRY OF BIRTH_</h2>
		<div class="crt-grid">
			{#each COUNTRIES as { code, name } (code)}
				<button type="button" class="crt-item" onclick={() => chooseCountry(code)}>
					[{name}]
				</button>
			{/each}
		</div>
	{/if}
</div>
{/if}

{#if step === 'orientation'}
	<!-- Straight onto the corridor photo itself: the two crash-bar handles
	     on the double doors carry the two choices, pinned to corridor.jpg's
	     exact cover-fit rectangle so they land on the actual handles
	     regardless of viewport shape (same technique as CityIntro's own
	     door overlay). -->
	<div class="corridor-overlay" style={overlayStyle}>
		{#each ORIENTATIONS as { value, label } (value)}
			<button
				type="button"
				class="handle-label"
				style="left: {value === 0 ? HANDLE_LEFT_X : HANDLE_RIGHT_X}%; top: {HANDLE_Y}%;"
				onclick={() => chooseOrientation(value)}
			>
				{label === 'LBTQ' ? 'LGBTQ' : label}
			</button>
		{/each}
		<p class="orientation-prompt" style="left: 50%; top: {PROMPT_Y}%;">Select your orientation</p>
	</div>
{/if}

<style>
	/* Phosphor-green CRT/DOS terminal look, shared by the full-screen
	   country list and the DOS-style popup windows for orientation/property
	   allocation -- one consistent style for everything that now lives on
	   this one screen. */
	:global(.crt-screen) {
		font-family: 'Courier New', Courier, monospace;
		/* Enhances the blocky, unhinted terminal-font look (classic Unix
		   console / BIOS setup utility) instead of the browser's default
		   antialiased smoothing, which softened every glyph's edges into a
		   blur at this font size. */
		-webkit-font-smoothing: none;
		font-smooth: never;
		text-rendering: optimizeSpeed;
	}

	/* Static backdrop -- no more WebGL scene behind this screen, just the
	   corridor still (cover-fit, matching how CityIntro's own video canvas
	   filled the frame, so the handoff has no jump). */
	.corridor-bg {
		position: fixed;
		inset: 0;
		z-index: -1;
		background-color: #0a0710;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	/* Pinned to corridor.jpg's own cover-fit rectangle (see overlayStyle in
	   the script block) so the handle labels and prompt land on the actual
	   photo regardless of viewport shape -- same technique CityIntro uses
	   for its door nameplates, which this reuses the exact palette of
	   (sampled off that same corridor's door hardware) for visual
	   continuity between the two consecutive corridor-based screens. */
	.corridor-overlay {
		position: fixed;
	}
	/* Text color sampled directly off the corridor's own EXIT sign glow
	   (~#72fd99) instead of the plain steel-plate white used elsewhere --
	   these two buttons read as lit signage on the door, not engraved
	   metal, so no border either (the glow does the framing). */
	.handle-label {
		position: absolute;
		transform: translate(-50%, -50%);
		cursor: pointer;
		font-family: inherit;
		font-size: 1rem;
		letter-spacing: 0.12em;
		padding: 0.35em 0.9em;
		color: #72fd99;
		text-shadow:
			0 0 4px rgba(114, 253, 153, 0.85),
			0 0 12px rgba(114, 253, 153, 0.5);
		background: none;
		border: none;
		transition: filter 150ms ease;
	}
	.handle-label:hover {
		filter: brightness(1.25);
	}
	/* Same type treatment as CityIntro's own floor prompt/hint text --
	   consistent font family, tracking, color, and shadow across both
	   corridor-based screens. */
	.orientation-prompt {
		position: absolute;
		transform: translate(-50%, -50%);
		margin: 0;
		font-size: 1rem;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.75);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
	}

	/* A plain centered panel now (used to be perspective-warped onto the
	   removed computer prop's screen glass via a per-frame homography) --
	   4:3, the classic old-CRT-monitor/BIOS-utility aspect ratio (was a
	   widescreen-ish 340:175, tuned to that removed prop's own glass
	   proportions, no longer relevant now that it's a flat panel). Bezel
	   corners squared off (was lightly rounded) -- BIOS/DOS setup screens
	   are sharp rectangles, not curved glass. A blue BIOS-blue background
	   was tried first, but that clashed against the green phosphor text --
	   monochrome green (deepened slightly from the original CRT gradient,
	   toward a flatter, more uniform "BIOS setup utility" fill) keeps the
	   whole panel one coherent color family instead of two competing ones. */
	.crt-screen {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(92vw, 44rem);
		aspect-ratio: 4 / 3;
		padding: 2.5% 3.5%;
		background: radial-gradient(ellipse 90% 80% at 50% 40%, #0a2410 0%, #041006 100%);
		color: #39ff6a;
		overflow: hidden;
		box-shadow:
			0 2vh 4vh rgba(0, 0, 0, 0.55),
			inset 0 0 2vh rgba(0, 0, 0, 0.85);
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
	/* Fine dot-matrix grid over the scanlines -- individual "pixel cells"
	   rather than just horizontal scan bands, reinforcing the low-res
	   terminal look the doubled font size and unhinted text now call for. */
	.crt-pixels {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			repeating-linear-gradient(to right, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 2px, transparent 3px),
			repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 2px, transparent 3px);
		mix-blend-mode: multiply;
	}
	.crt-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(57, 255, 106, 0.14), transparent 70%);
	}
	/* Sells "curved tube glass": a vignette darkening the corners the way a
	   convex CRT surface naturally does, plus a soft diagonal sheen like a
	   reflection sliding across curved glass. */
	.crt-curve {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(115deg, rgba(255, 255, 255, 0.1) 0%, transparent 22%, transparent 78%, rgba(255, 255, 255, 0.06) 100%),
			radial-gradient(ellipse 75% 65% at 50% 48%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
	}

	.crt-prompt {
		position: relative;
		font-size: 1.24rem;
		margin: 0 0 0.4em;
		text-align: left;
		letter-spacing: 0.03em;
		white-space: nowrap;
		text-shadow:
			0 0 4px rgba(57, 255, 106, 0.95),
			0 0 14px rgba(57, 255, 106, 0.6);
	}
	.crt-grid {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.15em 0.4em;
	}
	.crt-item {
		border: none;
		background: none;
		color: #39ff6a;
		font-family: inherit;
		font-size: 1rem;
		text-align: left;
		padding: 0.1em 0.1em;
		cursor: pointer;
		text-shadow: 0 0 5px rgba(57, 255, 106, 0.75);
		transition: color 120ms ease, text-shadow 120ms ease;
		white-space: nowrap;
	}
	.crt-item:hover {
		color: #baffc9;
		text-shadow:
			0 0 6px rgba(186, 255, 201, 0.95),
			0 0 16px rgba(57, 255, 106, 0.8);
	}

</style>
