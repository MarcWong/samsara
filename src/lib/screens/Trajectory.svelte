<script>
	import { onMount, onDestroy } from 'svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import Button from '../components/Button.svelte';
	import StairwellBackground from '../components/parallax/StairwellBackground.svelte';
	import COUNTRIES from '../game/functions/countries.js';
	import { onSkip } from '../skip.js';

	const types = core.PropertyTypes;
	// Wealth first, matching this session's stat-ordering fix applied
	// everywhere else in the app.
	const STAT_KEYS = ['MNY', 'CHR', 'INT', 'STR', 'SPR'];
	const STAT_LABELS = { MNY: 'Wealth', CHR: 'Appearance', INT: 'IQ', STR: 'Health', SPR: 'EQ' };

	// Internal age (0-102, how age.json's content density is indexed) maps to
	// a sparser, more realistic-looking display age -- more life happens in
	// youth, time compresses in old age. Ported verbatim from trajectory.js;
	// this table is load-bearing for how the story reads, not decorative.
	const AGE = {
		0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6,
		11: 7, 12: 8, 13: 9, 14: 10, 15: 10, 16: 11, 17: 11, 18: 12, 19: 12,
		20: 13, 21: 13, 22: 14, 23: 15, 24: 15, 25: 16, 26: 17, 27: 17, 28: 18,
		29: 18, 30: 19, 31: 19, 32: 20, 33: 20, 34: 21, 35: 21, 36: 22, 37: 23,
		38: 23, 39: 24, 40: 25, 41: 25, 42: 26, 43: 26, 44: 27, 45: 27, 46: 28,
		47: 28, 48: 29, 49: 29, 50: 30, 51: 31, 52: 31, 53: 32, 54: 33, 55: 34,
		56: 34, 57: 35, 58: 36, 59: 37, 60: 37, 61: 38, 62: 39, 63: 40, 64: 41,
		65: 41, 66: 42, 67: 42, 68: 43, 69: 43, 70: 44, 71: 44, 72: 45, 73: 46,
		74: 47, 75: 48, 76: 48, 77: 49, 78: 51, 79: 53, 80: 54, 81: 54, 82: 55,
		83: 56, 84: 59, 85: 60, 86: 61, 87: 62, 88: 63, 89: 64, 90: 65, 91: 66,
		92: 68, 93: 70, 94: 77, 95: 78, 96: 80, 97: 89, 98: 97, 102: 102,
	};

	// total>=9 && max>7 stat-rebalance rule from this session's earlier work,
	// carried over from the old trajectory.js (it lived in the UI layer, not
	// src/modules/, so Phase 1's game-logic port didn't touch it).
	//
	// Low-starting-point countries (e.g. Afghanistan's 6) can never satisfy
	// max>7 even if every point goes into one stat -- so the other four
	// stats were left at a hard 0 with no rebalance ever kicking in. Added
	// a second trigger: if every allocated point landed on a single stat
	// (the rest are all 0), the same top-up applies regardless of the
	// total/max thresholds above.
	function initProperty(propertyAllocate) {
		let max = 0;
		let nonZeroCount = 0;
		for (const key of STAT_KEYS) {
			const t = types[key];
			if (propertyAllocate[t] > max) max = propertyAllocate[t];
			if (propertyAllocate[t] > 0) nonZeroCount++;
		}
		const total = STAT_KEYS.reduce((s, key) => s + propertyAllocate[types[key]], 0);
		const allPointsInOneStat = total > 0 && nonZeroCount === 1;
		if ((total >= 9 && max > 7) || allPointsInOneStat) {
			for (const key of STAT_KEYS) {
				const t = types[key];
				if (propertyAllocate[t] < 8) {
					propertyAllocate[t] = propertyAllocate[t] < 4 ? propertyAllocate[t] + 5 : 8;
				}
			}
		}
		return propertyAllocate;
	}

	// Country/orientation arrive as plain draft fields now (Plaza no longer
	// resolves them into a full propertyAllocate object itself -- stat
	// allocation happens here instead, once 5.mp4 ends, so the country's
	// point budget and the "initial -> final" rebalance can't be computed
	// until that allocation is actually made).
	const talents = $draft.talents;
	const countryCode = $draft.countryCode;
	const countryData = COUNTRIES.find(({ code }) => code === countryCode);
	const country = countryData?.name;
	const sex = $draft.orientation == 1 ? 'LBTQ' : 'Straight';

	// -- stat allocation (ported verbatim from Plaza's old property step,
	// now shown over the stairwell's frozen sky highlight instead of a DOS
	// popup -- see `allocating` below) --
	const [allocMin, allocMax] = core.propertyAllocateLimit;
	const propertyPoints = core.getPropertyPoints(countryData?.points);
	const ALLOC_ROWS = STAT_KEYS.map(key => ({ type: types[key], label: STAT_LABELS[key] }));
	let allocate = $state({ [types.CHR]: 0, [types.INT]: 0, [types.STR]: 0, [types.MNY]: 0, [types.SPR]: 0 });
	let allocTotal = $derived(
		allocate[types.CHR] + allocate[types.INT] + allocate[types.STR] + allocate[types.MNY] + allocate[types.SPR]
	);
	let allocLeft = $derived(propertyPoints - allocTotal);

	function clampAlloc(type, rawValue) {
		let value = Math.trunc(rawValue) || 0;
		value = Math.max(allocMin, Math.min(allocMax, value));
		const otherTotal = allocTotal - allocate[type];
		value = Math.min(value, propertyPoints - otherTotal);
		return Math.max(value, allocMin);
	}
	function adjustStat(type, delta) {
		allocate = { ...allocate, [type]: clampAlloc(type, allocate[type] + delta) };
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

	let propertyAllocate = null;
	let printText = '';
	let stats = $state(null);
	let effects = $state({ CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 });
	let entries = $state([]);
	let isEnd = $state(false);
	let logEl = $state(null);

	function scrollToEnd() {
		requestAnimationFrame(() => {
			logEl?.scrollTo({ top: logEl.scrollHeight, behavior: 'smooth' });
		});
	}

	// Auto-plays age-by-age instead of waiting on clicks -- a click still
	// advances immediately (and reschedules from there), but the story
	// progresses on its own by default now. The dwell time scales with how
	// much there is to read instead of being one fixed duration: a fixed
	// 3.6s made short entries (age 0's single sentence, most of all) sit on
	// screen far longer than needed to read them, while cramming longer
	// entries into the same window. ~230wpm reading speed, clamped to a
	// floor (never flashes by too fast to register) and a ceiling (a long
	// entry still eventually advances on its own).
	const CHARS_PER_MS = 1000 / ((230 * 5) / 60); // ~230 wpm, ~5 chars/word
	const MIN_ADVANCE_MS = 1800;
	const MAX_ADVANCE_MS = 6000;
	let autoTimer = null;

	function clearAutoTimer() {
		if (autoTimer) {
			clearTimeout(autoTimer);
			autoTimer = null;
		}
	}

	function scheduleAutoAdvance(delay = MIN_ADVANCE_MS) {
		clearAutoTimer();
		if (isEnd) return;
		autoTimer = setTimeout(onNext, delay);
	}

	function onNext() {
		if (isEnd) return;
		const { age, content, isEnd: ended } = core.next();
		isEnd = ended;

		// Some ages tick with no narrative content -- still worth scheduling
		// the next auto-advance regardless, or an empty tick would silently
		// stall the whole auto-play loop until someone happens to click.
		const hasContent = Array.isArray(content) ? content.length > 0 : Object.keys(content || {}).length > 0;
		let delay = MIN_ADVANCE_MS;
		if (hasContent) {
			const text = renderTrajectory(age, content);
			stats = core.propertys;
			scrollToEnd();
			delay = Math.min(MAX_ADVANCE_MS, Math.max(MIN_ADVANCE_MS, text.length * CHARS_PER_MS));
		}

		scheduleAutoAdvance(delay);
	}

	function renderTrajectory(age, content) {
		const realAge = AGE[age];
		const newEffects = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };
		const statChanges = [];

		const text = content
			.map(({ type, description, effect, name, postEvent }) => {
				if (effect) {
					for (const key of STAT_KEYS) {
						if (effect[key]) {
							newEffects[key] = effect[key];
							statChanges.push([key, effect[key]]);
						}
					}
				}
				switch (type) {
					case 'EVT':
						return description + (postEvent ? `\n${postEvent}` : '');
					case 'TLT':
						return `Lucky Charm {${name}}: ${description}`;
					default:
						return '';
				}
			})
			.filter(Boolean)
			.join('\n');

		effects = newEffects;

		const statChangesText = statChanges
			.map(([prop, value]) => `${STAT_LABELS[prop]} ${value > 0 ? '+' : ''}${value}`)
			.join('  ');

		printText += `Year ${2022 + realAge}, age: ${realAge}\n${text}${statChangesText ? `\n${statChangesText}` : ''}\n`;

		const fatal = content.some(c => (c.effect?.LIF ?? 0) < 0);

		entries = [
			...entries,
			{
				id: entries.length,
				year: 2022 + realAge,
				age: realAge,
				text,
				statChanges,
				fatal,
			},
		];

		return text;
	}

	// View Summary no longer cuts straight to the SUMMARY screen: it hides
	// this screen's UI and plays 7.mp4 (opening on the same stair view the
	// walking loop holds, fading out to black) -- only when that clip ends
	// (onExited below) does the actual screen switch happen, from under
	// full black.
	function goSummary() {
		exit = true;
	}

	function onExited() {
		// Country/orientation/final display age travel along so Summary can
		// show them without re-deriving the AGE display mapping (the raw HAGE
		// property is the internal 0-102 index, not the age the player saw).
		const age = entries.length ? entries[entries.length - 1].age : 0;
		// The starting (post-rebalance) allocation, so Summary can show
		// "initial -> final" per stat.
		const initial = Object.fromEntries(STAT_KEYS.map(key => [key, propertyAllocate[types[key]]]));
		goToScreen('SUMMARY', { printText, talents, country, sex, age, initial });
	}

	onDestroy(clearAutoTimer);

	// Debug double-space skip (see skip.js): while an event's reading pause
	// is pending, jump straight to the next one instead of waiting out the
	// dwell time -- a no-op once the story has ended (no pending timer).
	onDestroy(
		onSkip(() => {
			if (autoTimer) onNext();
		}),
	);

	// Tracks the viewport so the stat-allocation panel can be pinned to
	// 5.mp4's exact cover-fit rectangle (same formula CityIntro/Plaza use
	// for their own door overlays) -- needed because that panel sits in
	// the frame's sky highlight, not inside a fixed on-screen box.
	const VIDEO_W = 1280;
	const VIDEO_H = 720;
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
		return () => window.removeEventListener('resize', resize);
	});

	// Staged against StairwellBackground's own three acts: the allocation
	// panel appears only once 5.mp4 has ended (its frame frozen and
	// motionless under the panel); confirming the allocation flips
	// `advance`, which plays 6.mp4 (the descent to the stair flights); and
	// the statbar/log/life-sim start only when that clip ends and the
	// stair-climb walking loop begins (onWalking) -- so events always play
	// over the loop, never over a clip still in motion.
	let allocating = $state(false);
	let advance = $state(false);
	let started = $state(false);
	let exit = $state(false);
	function onAllocReady() {
		allocating = true;
	}

	function confirmAllocation() {
		if (allocLeft > 0) return;
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === countryCode ? 1 : 0]));
		propertyAllocate = initProperty({ ...nationality, [types.LBTQ]: $draft.orientation, ...allocate });
		printText =
			(country ? `Country: ${country}\n` : '') +
			`Sex orientation: ${sex}\n` +
			`Family wealth: ${propertyAllocate[types.MNY]}\n` +
			`Appearance: ${propertyAllocate[types.CHR]}\n` +
			`IQ: ${propertyAllocate[types.INT]}\n` +
			`Healthy: ${propertyAllocate[types.STR]}\n` +
			`EQ: ${propertyAllocate[types.SPR]}\n`;
		core.start(propertyAllocate);
		stats = core.propertys;
		allocating = false;
		advance = true;
	}

	function onWalking() {
		started = true;
		onNext();
	}
</script>

<StairwellBackground {onAllocReady} {advance} {onWalking} {exit} {onExited} />

{#if allocating}
	<!-- 5.mp4 has ended and its last frame is frozen and motionless; the
	     stat-allocation panel is a tall rounded glass card hugging the
	     stairwell's central void (per the reference mockup -- straight
	     sides, large corner radii, no perspective warp), pinned to the
	     video's cover-fit rectangle and sized in cq units so it scales
	     with the footage. -->
	<div class="corridor-overlay alloc-overlay" style={overlayStyle}>
		<div class="alloc-panel">
			<p class="alloc-title">Allocate your attributes</p>
			<p class="alloc-tokens">Tokens: {propertyPoints} &nbsp; Remaining: {allocLeft}</p>
			<div class="alloc-stats">
				{#each ALLOC_ROWS as { type, label } (type)}
					<div class="alloc-row">
						<span class="alloc-label">{label}</span>
						<button
							type="button"
							class="alloc-step"
							disabled={allocate[type] <= allocMin}
							onclick={() => adjustStat(type, -1)}
							aria-label="Decrease {label}"
						>
							−
						</button>
						<span class="alloc-value">{allocate[type]}</span>
						<button
							type="button"
							class="alloc-step"
							disabled={allocate[type] >= allocMax || allocLeft <= 0}
							onclick={() => adjustStat(type, 1)}
							aria-label="Increase {label}"
						>
							+
						</button>
					</div>
				{/each}
			</div>
			<div class="alloc-actions">
				<button type="button" class="alloc-action" onclick={randomAllocate}>Random</button>
				<button type="button" class="alloc-action start" disabled={allocLeft > 0} onclick={confirmAllocation}>
					Start
				</button>
			</div>
		</div>
		<!-- Hidden-in-plain-sight strategy tip: hovering the foreground
		     railing along the frame's bottom edge (below the panel's quad)
		     reveals it, floating just above the balusters. -->
		<div class="rail-hint">
			<p class="rail-hint-tip">See what will happen to put all tokens into one attribute</p>
		</div>
	</div>
{/if}

{#if started && !exit}
<div class="trajectory">
	<div class="statbar">
		<div class="country">
			<span class="country-name">{country}</span>
			<span class="sex">{sex}</span>
		</div>
		{#each STAT_KEYS as key (key)}
			<div class="stat">
				<span class="stat-label">{STAT_LABELS[key]}</span>
				<span class="stat-value">{stats[types[key]] - effects[key]}</span>
				<!-- Always rendered (never conditionally removed) so the row's
				     total width -- and thus whether flex-wrap kicks in and
				     the bar's own height -- never depends on whether a delta
				     happens to be showing this frame. Zero-effect frames get
				     a transparent placeholder occupying the exact same box. -->
				<span
					class="stat-delta"
					class:placeholder={!effects[key]}
					class:positive={effects[key] > 0}
					class:negative={effects[key] < 0}
				>
					{effects[key] ? `${effects[key] > 0 ? '+' : ''}${effects[key]}` : '+0'}
				</span>
			</div>
		{/each}
	</div>

	<!-- Both pieces of the event display sit inside the video frame's own
	     geometry (no panels/borders -- the stair structure is the frame):
	     the CURRENT age lies flat on the foreground staircase's treads
	     (perspective-pitched into that plane, slightly slanted along the
	     steps' own rise), and the event text runs on the vertical plane
	     to the right (rotated about Y to match the receding wall). Pinned
	     to the walking loop's cover-fit rectangle so both stay glued to
	     the footage regardless of viewport shape. -->
	<div class="scene" style={overlayStyle}>
		{#if entries.length}
			<div class="age-tread" aria-hidden="true">
				{entries[entries.length - 1].year} · Age {entries[entries.length - 1].age}
			</div>
		{/if}
		<div class="log" bind:this={logEl}>
			{#each entries as entry (entry.id)}
				<div class="entry" class:fatal={entry.fatal}>
					<p class="entry-text">{entry.text}</p>
					{#if entry.statChanges.length}
						<div class="entry-deltas">
							{#each entry.statChanges as [prop, value] (prop)}
								<span class:positive={value > 0} class:negative={value < 0}>
									{STAT_LABELS[prop]} {value > 0 ? '+' : ''}{value}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if isEnd}
		<div class="controls">
			<Button onclick={goSummary}>View Summary</Button>
		</div>
	{/if}
</div>
{/if}

<style>
	.trajectory {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		/* Local overrides of the app's global cyberpunk-neon palette (see
		   app.css), scoped to this screen only: sampled from 5.mp4's own
		   stairwell footage (average RGB across its first/mid/last frames
		   landed between #244455 and #63798c) so the statbar and log panels
		   read as part of that cool, desaturated blue-grey stairwell rather
		   than clashing with it. */
		--bg-raised: rgba(27, 40, 48, 0.88);
		--text-dim: #82a0ad;
		--positive: #7fd9b6;
		--negative: #e8776a;
	}
	/* Fixed height (not just min-height): flex-wrap is off and every stat
	   column always reserves the same delta-row height (see .stat-delta
	   below), so this box's height genuinely never changes as effects
	   appear/disappear -- both are needed, since either alone still leaves
	   a path for the row to reflow. */
	.statbar {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		max-width: 42rem;
		height: 5.25rem;
		margin: 0 auto;
		padding: 0 1.25rem;
		background: var(--bg-raised);
		flex-wrap: nowrap;
		overflow: hidden;
		font-size: 1rem;
	}
	/* Stacked into two lines (name, then orientation) instead of one inline
	   run, and centered like the 5 stat columns beside it, so this block
	   reads as one more column in the same row rather than a differently-
	   shaped label bolted onto the front of it. */
	.country {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-right: auto;
		white-space: nowrap;
	}
	.country-name {
		font-size: 1.3rem;
		font-weight: bold;
	}
	.sex {
		font-weight: normal;
		font-size: 0.8rem;
		color: var(--text-dim);
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3.5rem;
	}
	.stat-label {
		font-size: 0.8rem;
		color: var(--text-dim);
	}
	.stat-value {
		font-size: 1.3rem;
	}
	.stat-delta {
		font-size: 0.85rem;
		line-height: 1.2;
	}
	.stat-delta.placeholder {
		visibility: hidden;
	}
	.positive {
		color: var(--positive);
	}
	.negative {
		color: var(--negative);
	}

	/* The event display's stage: the walking loop's cover-fit rectangle
	   (position/size injected via overlayStyle), sized as a container so
	   children can use cq units -- everything below scales with the
	   footage, not the viewport. */
	.scene {
		position: fixed;
		pointer-events: none;
		container-type: size;
	}

	/* The current age, lying flat on the foreground staircase's treads:
	   perspective-pitched into the horizontal plane and slightly slanted
	   (rotateZ) to run along the steps' own rise. Values tuned live
	   against stairwell.jpg at 1280x720. */
	.age-tread {
		position: absolute;
		left: 20%;
		top: 47%;
		transform: translate(-50%, -50%) perspective(40em) rotateX(50deg) rotateZ(-9deg);
		font-size: 6cqh;
		white-space: nowrap;
		color: rgba(240, 248, 252, 0.92);
		text-shadow: 0 2px 10px rgba(5, 12, 18, 0.8);
	}

	/* The event log, on the vertical plane: rotated about Y (left edge
	   nearer) so the text recedes with the right-hand wall the way a
	   painted notice would. No cards, no borders -- the stair structure
	   itself frames the text; a strong dark glow keeps it legible over
	   the busy railings. Top-masked so scrolled-past entries dissolve
	   rather than clip; scrollbar hidden (auto-advances). */
	.log {
		position: absolute;
		left: 56%;
		top: 8%;
		width: 30%;
		max-height: 64%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 3.2cqh;
		transform: perspective(60em) rotateY(-16deg);
		transform-origin: left center;
		mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 100%);
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.log::-webkit-scrollbar {
		display: none;
	}
	.entry {
		font-size: 2.8cqh;
	}
	.entry.fatal .entry-text {
		color: #ffc4bb;
		text-shadow:
			0 1px 6px rgba(5, 12, 18, 0.9),
			0 0 14px rgba(180, 40, 30, 0.55);
	}
	.entry-text {
		margin: 0;
		white-space: pre-line;
		line-height: 1.5;
		color: rgba(235, 244, 249, 0.95);
		text-shadow:
			0 1px 6px rgba(5, 12, 18, 0.9),
			0 0 14px rgba(5, 12, 18, 0.6);
	}
	.entry-deltas {
		margin-top: 0.5em;
		display: flex;
		gap: 1em;
		flex-wrap: wrap;
		font-size: 0.85em;
		text-shadow: 0 1px 6px rgba(5, 12, 18, 0.9);
	}
	/* Pinned to the very bottom of the viewport. No background band -- the
	   glass button floats over the climb scene on its own. */
	.controls {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}

	/* Pinned to 5.mp4's own cover-fit rectangle (see overlayStyle in the
	   script block), same technique CityIntro/Plaza use for their door
	   overlays -- positions the panel in the frozen frame's sky highlight
	   regardless of viewport shape. */
	.corridor-overlay {
		position: fixed;
	}
	/* Sized as a container so the panel's children can use cq units --
	   everything scales with the footage's drawn rectangle, matching how
	   the reference mockup was drawn against the frame itself. */
	.alloc-overlay {
		container-type: size;
	}
	/* "Liquid Glass" panel -- same recipe as Button.svelte's own pills
	   (backdrop-blur + saturate, a soft white tint instead of an opaque
	   fill, a gloss highlight, real depth via shadow), scaled up to a
	   card. Per the reference mockup: a tall straight-sided card hugging
	   the stairwell's central void, with large rounded corners --
	   position/size measured off the mockup as fractions of the frame. */
	.alloc-panel {
		position: absolute;
		left: 36.3%;
		top: 13.6%;
		width: 26.2%;
		height: 62.8%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		/* Content clusters from the top with tight margins; only the
		   actions stay pinned to the bottom edge, via their own
		   margin-top: auto. */
		justify-content: flex-start;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, rgba(210, 228, 236, 0.16) 100%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		backdrop-filter: blur(24px) saturate(180%);
		border: none;
		border-radius: 8cqh;
		padding: 3.4cqh 2.4cqw 3cqh;
		color: #17262e;
		text-align: center;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.75),
			inset 0 -12px 18px rgba(20, 40, 55, 0.08);
	}
	/* Gloss cap, same trick as Button.svelte's ::before. */
	.alloc-panel::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(120% 80% at 50% -10%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(255, 255, 255, 0) 70%);
		mix-blend-mode: screen;
		pointer-events: none;
	}
	.alloc-title,
	.alloc-tokens,
	.alloc-stats,
	.alloc-actions {
		position: relative;
	}
	.alloc-title {
		margin: 0 0 0.3cqh;
		font-size: 3.4cqh;
		font-weight: bold;
	}
	.alloc-tokens {
		margin: 0 0 2cqh;
		font-size: 2.1cqh;
		color: #3c5563;
	}
	.alloc-stats {
		display: flex;
		flex-direction: column;
		gap: 2.4cqh;
		margin-bottom: 2cqh;
	}
	.alloc-row {
		display: flex;
		align-items: center;
		gap: 1cqw;
	}
	.alloc-label {
		flex: 1;
		text-align: left;
		font-size: 2.6cqh;
	}
	.alloc-value {
		width: 1.6em;
		text-align: center;
		font-size: 2.8cqh;
		font-weight: bold;
	}
	/* Mini liquid-glass pills, same recipe as .alloc-panel/Button.svelte
	   scaled down to a circle: translucent white fill + blur (not the flat
	   steel-blue tint used elsewhere), so these read as glass beads on the
	   glass card rather than a differently-styled control bolted on. */
	.alloc-step {
		position: relative;
		overflow: hidden;
		width: 1.9em;
		height: 1.9em;
		line-height: 1;
		border: 1px solid rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.28);
		-webkit-backdrop-filter: blur(8px) saturate(180%);
		backdrop-filter: blur(8px) saturate(180%);
		color: #17262e;
		border-radius: 50%;
		cursor: pointer;
		font-size: 2.4cqh;
		padding: 0;
		box-shadow:
			0 2px 6px rgba(10, 20, 28, 0.18),
			inset 0 1px 1px rgba(255, 255, 255, 0.85);
		transition: background 150ms ease, transform 150ms ease;
	}
	.alloc-step:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.alloc-step:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.42);
	}
	.alloc-step:not(:disabled):active {
		transform: scale(0.92);
	}
	.alloc-actions {
		display: flex;
		gap: 2.2rem;
		justify-content: center;
		/* Keeps the two actions on the quad's bottom edge while the rest
		   of the content clusters at the top. */
		margin-top: auto;
	}
	/* Plain text, no border/background/pill -- same type family as every
	   other label on this panel, just a size up. Only Start carries the
	   color blink (slowed to a calm breath); Random stays a steady light
	   tone so the blink singles out the one action that moves the story
	   forward. Disabled Start: dim and steady, no blink. */
	.alloc-action {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		font-size: 1.5rem;
		letter-spacing: 0.06em;
		/* Light base: this row lands on the quad's bottom edge, over the
		   dark railing texture, where the panel's other (dark) text color
		   would vanish. */
		color: #cfe7f2;
		text-shadow: 0 1px 4px rgba(8, 18, 26, 0.55);
	}
	/* Blinks in every state (gating it on :not(:disabled) made the panel
	   open with no blink anywhere until all tokens were spent, which read
	   as the animation being missing) -- disabled just dims the whole
	   thing, the pulse continuing faintly underneath. */
	.alloc-action.start {
		animation: action-blink 3.2s ease-in-out infinite;
	}
	.alloc-action:disabled {
		opacity: 0.45;
		cursor: default;
	}
	@keyframes action-blink {
		0%,
		100% {
			color: #9fcfe3;
		}
		50% {
			color: #ffffff;
			text-shadow:
				0 1px 4px rgba(8, 18, 26, 0.55),
				0 0 12px rgba(255, 255, 255, 0.85);
		}
	}

	/* Hover zone over the foreground railing along the frame's bottom edge
	   (below the panel's quad) -- invisible itself; pointing at it fades in
	   the strategy tip just above the balusters. Same type treatment as
	   the other in-footage prompts (orientation-prompt etc.). */
	.rail-hint {
		position: absolute;
		left: 22%;
		top: 86%;
		width: 56%;
		height: 14%;
	}
	/* Sits flat on the handrail's own white strip (the bright band
	   crossing the void's bottom, ~89% down the frame), horizontal and
	   small per the reference mockup -- below the panel's rounded bottom
	   edge, never overlapping it. */
	.rail-hint-tip {
		position: absolute;
		left: 50%;
		top: 24%;
		transform: translate(-50%, -50%);
		margin: 0;
		white-space: nowrap;
		font-size: 1.9cqh;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.85);
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
		opacity: 0;
		transition: opacity 300ms ease;
		pointer-events: none;
	}
	.rail-hint:hover .rail-hint-tip {
		opacity: 1;
	}
</style>
