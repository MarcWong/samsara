<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import COUNTRIES from '../game/functions/countries.js';

	const types = core.PropertyTypes;
	const ORIENTATIONS = [
		{ value: 0, label: 'Straight' },
		{ value: 1, label: 'LBTQ' },
	];
	const STATS = [
		{ type: types.MNY, label: 'Wealth' },
		{ type: types.CHR, label: 'Appearance' },
		{ type: types.INT, label: 'IQ' },
		{ type: types.STR, label: 'Health' },
		{ type: types.SPR, label: 'EQ' },
	];
	const [allocMin, allocMax] = core.propertyAllocateLimit;

	// Settles in a beat after mount, same arrival cue every screen in this
	// flow uses, independent of whatever the WebGL background behind it is
	// doing.
	let settled = $state(false);
	onMount(() => {
		requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
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
	let blinking = $state(false);

	// Blink-out timing (see the lid keyframes below): two quick blinks, then
	// the lids close for good -- the screen switch happens under full black,
	// and Trajectory opens its own lids on mount ("eyes open" on the stairs).
	const BLINK_TOTAL_MS = 2100;

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

	// -- property allocation (verbatim Property/Housing logic) --
	let propertyPoints = $state(0);
	let allocate = $state({ [types.CHR]: 0, [types.INT]: 0, [types.STR]: 0, [types.MNY]: 0, [types.SPR]: 0 });
	let total = $derived(
		allocate[types.CHR] + allocate[types.INT] + allocate[types.STR] + allocate[types.MNY] + allocate[types.SPR]
	);
	let left = $derived(propertyPoints - total);

	function clamp(type, rawValue) {
		let value = Math.trunc(rawValue) || 0;
		value = Math.max(allocMin, Math.min(allocMax, value));
		const otherTotal = total - allocate[type];
		value = Math.min(value, propertyPoints - otherTotal);
		return Math.max(value, allocMin);
	}
	function adjustStat(type, delta) {
		allocate = { ...allocate, [type]: clamp(type, allocate[type] + delta) };
	}
	function randomAllocate() {
		let t = propertyPoints;
		const arr = new Array(5).fill(allocMax);
		while (t > 0) {
			const sub = Math.round(Math.random() * (Math.min(t, allocMax) - 1)) + 1;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const select = Math.floor(Math.random() * 5) % 5;
				if (arr[select] - sub < 0) continue;
				arr[select] -= sub;
				t -= sub;
				break;
			}
		}
		allocate = {
			[types.CHR]: allocMax - arr[0],
			[types.INT]: allocMax - arr[1],
			[types.STR]: allocMax - arr[2],
			[types.MNY]: allocMax - arr[3],
			[types.SPR]: allocMax - arr[4],
		};
	}

	function chooseOrientation(LBTQ) {
		if (step !== 'orientation') return;
		orientation = LBTQ;
		talents = drawTalents();
		const replace = core.remake(talents.map(t => t.id));
		if (replace.length > 0) {
			globalThis.$$event('message', [replace.map(v => ['F_TalentReplace', v])]);
		}
		const countryData = COUNTRIES.find(({ code }) => code === country);
		propertyPoints = core.getPropertyPoints(countryData?.points);
		step = 'property';
	}

	function next() {
		if (left > 0) {
			globalThis.$$event('message', ['F_PropertyPointLeft', left]);
			return;
		}
		blinking = true;
		// Trajectory reads country/LBTQ back out of propertyAllocate itself
		// (countryName(propertyAllocate), propertyAllocate[types.LBTQ]), so
		// they need to be merged into that one object, not left alongside
		// it -- same shape the old Housing screen produced.
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === country ? 1 : 0]));
		const propertyAllocate = { ...nationality, [types.LBTQ]: orientation, ...allocate };
		setTimeout(() => goToScreen('TRAJECTORY', { propertyAllocate, talents }), BLINK_TOTAL_MS);
	}
</script>

<!-- The final frame of 4.mp4 (the hospital corridor CityIntro just walked
     into), same still used as CityIntro's own handoff frame so there's no
     visible cut arriving here. The computer prop that used to stand in
     this corridor (and the screen-glass homography that warped the DOS
     UI onto it) is gone -- the UI below is now a plain centered panel. -->
<div class="corridor-bg" style="background-image: url('{base}/images/corridor.jpg');"></div>

<!-- One persistent phosphor-green CRT/DOS panel, floating centered over
     the corridor backdrop -- `step` just swaps which window is showing. -->
<div class="crt-screen" class:entering={!settled}>
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
	{:else if step === 'orientation'}
		<div class="dos-backdrop">
			<div class="dos-window">
				<div class="dos-titlebar">C:\SETUP\ORIENTATION.EXE</div>
				<div class="dos-body">
					<p class="dos-prompt">Select orientation:</p>
					<div class="dos-menu dos-menu-2col">
						{#each ORIENTATIONS as { value, label } (value)}
							<button type="button" class="dos-item" onclick={() => chooseOrientation(value)}>
								[{label}]
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{:else if step === 'property'}
		<div class="dos-backdrop">
			<div class="dos-window dos-window-wide">
				<div class="dos-titlebar">C:\SETUP\ALLOCATE.EXE</div>
				<div class="dos-body">
					<p class="dos-prompt">Tokens: {propertyPoints}  Remaining: {left}</p>
					<div class="dos-stats">
						{#each STATS as { type, label } (type)}
							<div class="dos-stat-row">
								<span class="dos-stat-label">{label}</span>
								<button
									type="button"
									class="dos-step"
									disabled={allocate[type] <= allocMin}
									onclick={() => adjustStat(type, -1)}
									aria-label="Decrease {label}"
								>
									-
								</button>
								<span class="dos-stat-value">{allocate[type]}</span>
								<button
									type="button"
									class="dos-step"
									disabled={allocate[type] >= allocMax || left <= 0}
									onclick={() => adjustStat(type, 1)}
									aria-label="Increase {label}"
								>
									+
								</button>
							</div>
						{/each}
					</div>
					<div class="dos-menu">
						<button type="button" class="dos-item" onclick={randomAllocate}>[Random]</button>
						<button type="button" class="dos-item" onclick={next}>[Start]</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if blinking}
	<!-- Falling asleep where you stand: two quick blinks, then the lids
	     stay shut -- the switch to Trajectory happens under full black,
	     which opens its own lids on the stairs ("waking up" there). -->
	<div class="blink" aria-hidden="true">
		<div class="lid lid-top"></div>
		<div class="lid lid-bottom"></div>
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
		transition: opacity 500ms ease;
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

	/* DOS-style popup window: a bordered, double-lined "dialog" centered on
	   the same green screen, reverse-video title bar, for the orientation
	   and property steps -- distinct from the full-bleed country list
	   above, but sharing its exact font/color language. */
	.dos-backdrop {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dos-window {
		width: 78%;
		background: #04140a;
		border: 3px double #39ff6a;
		box-shadow: 0 0 1.5vh rgba(57, 255, 106, 0.35);
	}
	.dos-window-wide {
		width: 92%;
	}
	.dos-titlebar {
		background: #39ff6a;
		color: #04140a;
		font-size: 0.84rem;
		font-weight: bold;
		letter-spacing: 0.04em;
		padding: 0.25em 0.5em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dos-body {
		padding: 0.5em 0.6em 0.6em;
	}
	.dos-prompt {
		margin: 0 0 0.5em;
		font-size: 0.92rem;
		white-space: nowrap;
		text-shadow: 0 0 4px rgba(57, 255, 106, 0.8);
	}
	.dos-menu {
		display: flex;
		gap: 0.6em;
	}
	.dos-menu-2col {
		gap: 1.2em;
	}
	.dos-item {
		border: 1px solid rgba(57, 255, 106, 0.5);
		background: rgba(57, 255, 106, 0.06);
		color: #39ff6a;
		font-family: inherit;
		font-size: 0.92rem;
		padding: 0.3em 0.7em;
		cursor: pointer;
		text-shadow: 0 0 5px rgba(57, 255, 106, 0.75);
		transition: background 120ms ease, color 120ms ease;
	}
	.dos-item:hover {
		background: rgba(57, 255, 106, 0.18);
		color: #baffc9;
	}

	.dos-stats {
		display: flex;
		flex-direction: column;
		gap: 0.28em;
		margin-bottom: 0.6em;
	}
	.dos-stat-row {
		display: flex;
		align-items: center;
		gap: 0.4em;
		font-size: 0.88rem;
	}
	.dos-stat-label {
		flex: 1;
	}
	.dos-stat-value {
		width: 1.6em;
		text-align: center;
	}
	.dos-step {
		width: 1.1em;
		height: 1.1em;
		line-height: 1;
		border: 1px solid rgba(57, 255, 106, 0.5);
		background: rgba(57, 255, 106, 0.06);
		color: #39ff6a;
		font-family: inherit;
		font-size: 0.88rem;
		cursor: pointer;
		padding: 0;
	}
	.dos-step:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.dos-step:not(:disabled):hover {
		background: rgba(57, 255, 106, 0.18);
	}

	/* Blink-out: each lid is a half-screen black panel sliding in from its
	   own edge. Percentages below map onto BLINK_TOTAL_MS (2100ms; the
	   keyframe animation itself runs 2000ms, leaving a beat of full black
	   before the screen switch): closed at 12%, open, closed at 40%, open,
	   then closed for good from 78% on. The lids overlap the viewport
	   center slightly (52vh each) so no seam line shows when shut. */
	.blink {
		position: fixed;
		inset: 0;
		z-index: 20;
		pointer-events: none;
	}
	.lid {
		position: absolute;
		left: 0;
		right: 0;
		height: 52vh;
		background: #000;
	}
	.lid-top {
		top: 0;
		transform: translateY(-101%);
		animation: lid-top-blink 2000ms ease-in-out forwards;
	}
	.lid-bottom {
		bottom: 0;
		transform: translateY(101%);
		animation: lid-bottom-blink 2000ms ease-in-out forwards;
	}
	@keyframes lid-top-blink {
		0% { transform: translateY(-101%); }
		12% { transform: translateY(0); }
		26% { transform: translateY(-101%); }
		40% { transform: translateY(0); }
		54% { transform: translateY(-101%); }
		78%, 100% { transform: translateY(0); }
	}
	@keyframes lid-bottom-blink {
		0% { transform: translateY(101%); }
		12% { transform: translateY(0); }
		26% { transform: translateY(101%); }
		40% { transform: translateY(0); }
		54% { transform: translateY(101%); }
		78%, 100% { transform: translateY(0); }
	}
</style>
