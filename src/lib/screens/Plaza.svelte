<script>
	import { onMount } from 'svelte';
	import PlazaCityBackground from '../components/parallax/PlazaCityBackground.svelte';
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
	let flying = $state(false);
	let quad = $state(null);

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
		flying = true;
		// Trajectory reads country/LBTQ back out of propertyAllocate itself
		// (countryName(propertyAllocate), propertyAllocate[types.LBTQ]), so
		// they need to be merged into that one object, not left alongside
		// it -- same shape the old Housing screen produced.
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === country ? 1 : 0]));
		const propertyAllocate = { ...nationality, [types.LBTQ]: orientation, ...allocate };
		setTimeout(() => goToScreen('TRAJECTORY', { propertyAllocate, talents }), 2400);
	}
</script>

<PlazaCityBackground {flying} onScreenQuad={q => (quad = q)} />

<!-- Everything renders straight onto the retro TV's screen (see
     PlazaCityBackground.svelte for the 3D prop and the homography that
     keeps this warped onto its glass) -- one persistent screen, `step`
     just swaps which window is showing on it, phosphor-green CRT/DOS
     styling throughout instead of a scene cut or a separate 2.5D parallax
     background. -->
<div
	class="crt-screen"
	class:hidden={flying || !quad}
	class:entering={!settled}
	style={quad ? `width: ${quad.width}px; height: ${quad.height}px; transform: ${quad.matrix3d};` : ''}
>
	<div class="scanlines" aria-hidden="true"></div>
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

<style>
	/* Phosphor-green CRT/DOS terminal look, shared by the full-screen
	   country list and the DOS-style popup windows for orientation/property
	   allocation -- one consistent style for everything that now lives on
	   this one screen. */
	:global(.crt-screen) {
		font-family: 'Courier New', Courier, monospace;
	}

	/* Position/size/transform all come from PlazaCityBackground's per-frame
	   homography (see `quad` in the script block and its `style` binding
	   above) -- this fixes the div at the viewport origin with its
	   transform-origin pinned there too, so the matrix3d alone places it
	   exactly on the TV's screen glass, tilt and all. */
	.crt-screen {
		position: fixed;
		left: 0;
		top: 0;
		transform-origin: 0 0;
		padding: 2.5% 3.5%;
		background: radial-gradient(ellipse 90% 80% at 50% 40%, #0c1c0c 0%, #050a05 100%);
		color: #39ff6a;
		overflow: hidden;
		/* Rounded so this flat quad's own corners tuck in from the physical
		   tube's real corner curvature. */
		border-radius: 4% / 6%;
		box-shadow: inset 0 0 2vh rgba(0, 0, 0, 0.85);
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
		font-size: 0.62rem;
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
		font-size: 0.5rem;
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
		font-size: 0.42rem;
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
		font-size: 0.46rem;
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
		font-size: 0.46rem;
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
		font-size: 0.44rem;
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
		font-size: 0.44rem;
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
</style>
