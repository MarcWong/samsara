<script>
	import { onMount, onDestroy } from 'svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import Button from '../components/Button.svelte';
	import StairwellBackground from '../components/parallax/StairwellBackground.svelte';
	import COUNTRIES from '../game/functions/countries.js';
	import { onSkip } from '../skip.js';
	import { drawTalents as drawTalentsFrom } from '../game/talentDraw.js';

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

	// Country/orientation arrive as plain draft fields now (Plaza no longer
	// resolves them into a full propertyAllocate object itself -- stat
	// allocation happens here instead, once 5.mp4 ends, so the country's
	// point budget and the "initial -> final" rebalance can't be computed
	// until that allocation is actually made).
	// Reassigned in confirmAllocation() if the free-allocation bonus
	// triggers -- see GOOD_TALENT_POOL below.
	let talents = $draft.talents;
	const countryCode = $draft.countryCode;
	const countryData = COUNTRIES.find(({ code }) => code === countryCode);
	const country = countryData?.name;
	const sex = $draft.orientation == 1 ? 'LBTQ' : 'Straight';

	// -- stat allocation (ported verbatim from Plaza's old property step,
	// now shown over the stairwell's frozen sky highlight instead of a DOS
	// popup -- see `allocating` below) --
	const [allocMin] = core.propertyAllocateLimit;
	const propertyPoints = core.getPropertyPoints(countryData?.points);
	// Per-stat ceiling is the country's own point budget, not the app-wide
	// config's fixed cap -- that fixed cap (13) is too low for high-budget
	// countries (Japan 14, USA/UK 15, Denmark 17) and blocks free single-stat
	// allocation for them.
	const allocMax = propertyPoints;
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
	let triedAllInOneStat = false;
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
	// entry still eventually advances on its own). Everything here is scaled
	// by /1.5 (a flat 1.5x speedup of how fast events appear) on top of the
	// underlying ~230wpm reading-speed model.
	const SPEEDUP = 1.5;
	const CHARS_PER_MS = 1000 / ((230 * 5) / 60) / SPEEDUP; // ~230 wpm, ~5 chars/word
	const MIN_ADVANCE_MS = 1800 / SPEEDUP;
	const MAX_ADVANCE_MS = 6000 / SPEEDUP;
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

		printText += `Age: ${realAge}\n${text}${statChangesText ? `\n${statChangesText}` : ''}\n`;

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
		goToScreen('SUMMARY', { printText, talents, country, sex, age, initial, triedAllInOneStat });
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

	// The single-stat trigger is scaled to each country's own point budget
	// (a flat 8 either never fired for low-budget countries or fired too
	// easily for high-budget ones) -- grouped into three tiers by budget,
	// per explicit request. Denmark (17 pts, the single highest budget in
	// the game) wasn't named in any of the three groups; it's folded into
	// the top tier (same as Japan/UK/USA, 14-15 pts) since that's the only
	// one its budget is actually close to.
	const BONUS_TRIGGER = {
		// Haiti, Afghanistan, Iran, North Korea (6-8 pts)
		HTI: 5, AF: 5, IRN: 5, PRK: 5,
		// India, Ukraine, Egypt, China (9-12 pts)
		IND: 7, UKR: 7, EGY: 7, CH: 7,
		// Japan, UK, USA (14-15 pts), plus Denmark (17 pts)
		JAP: 9, GBR: 9, US: 9, DNK: 9,
	};

	// The rail hint's "see what happens" promise, and the Summary hint's own
	// "+5 on all stats" line, are a real mechanic: reaching this country's
	// own trigger value in any single stat adds +5 to all five attributes,
	// each capped at 17 (per the attribute-pool design doc's privilege
	// rule -- this replaced the earlier top-up-to-5, so poorer countries'
	// privileged runs can actually reach the higher attribute bands).
	// Every group's trigger value is at or below that group's own point
	// budget, so dumping every point into one stat always meets it -- no
	// separate "all in one stat" fallback needed.
	// Returns {propertyAllocate, triggered} -- confirmAllocation() needs the
	// flag too, to decide whether to re-roll this life's lucky charms.
	function applyBonus(propertyAllocate) {
		const trigger = BONUS_TRIGGER[countryCode] ?? 8;
		let max = 0;
		for (const key of STAT_KEYS) {
			const value = propertyAllocate[types[key]];
			if (value > max) max = value;
		}
		const triggered = max >= trigger;
		if (triggered) {
			for (const key of STAT_KEYS) {
				const t = types[key];
				propertyAllocate[t] = Math.min(propertyAllocate[t] + 5, 17);
			}
		}
		return { propertyAllocate, triggered };
	}

	// Talent-list indices (see talentDraw.js) of the 4 lucky charms with a
	// purely positive effect and nothing else attached: Helen of Troy
	// (CHR+10), Job opportunity (MNY+3), A miracle of life (STR+3),
	// Queen's gambit (INT+3). Earthquake, Airplane Crash, Bankruptcy and
	// Farewell Mom are excluded -- they harm/kill outright. Rape carries no
	// stat effect of its own kind here but is unambiguously a bad turn for
	// the character. You are beautiful is excluded too: its CHR+3 now comes
	// bundled with MNY-1 (the lucky-charm doc's cosmetic-procedure cost),
	// not a clean positive.
	const GOOD_TALENT_POOL = [5, 6, 8, 9];

	function confirmAllocation() {
		if (allocLeft > 0) return;
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === countryCode ? 1 : 0]));
		// Captured from the player's raw choices, before applyBonus tops
		// everything up to 5 -- Summary needs this to know whether the
		// trick was actually used (post-bonus, every stat reads nonzero).
		triedAllInOneStat = STAT_KEYS.filter(key => allocate[types[key]] > 0).length === 1;
		const bonus = applyBonus({ ...nationality, [types.LBTQ]: $draft.orientation, ...allocate });
		propertyAllocate = bonus.propertyAllocate;
		// Persisted as a real property (not just this function's own local
		// flag) so event conditions can key an entire alternate storyline
		// off it, the same way LBTQ already does for orientation -- see
		// the country-tree events gated "<CODE>>0&TLR>0" / "...&TLR=0".
		propertyAllocate[types.TLR] = bonus.triggered ? 1 : 0;
		if (bonus.triggered) {
			// The free-allocation trick already handed her an easier start --
			// re-roll this life's 3 lucky charms from the good-only pool so
			// none of the random misfortunes (earthquake, bankruptcy, rape,
			// a plane crash) can also land on top of it. core.remake() was
			// already called once in Plaza with the original draw; calling
			// it again here fully replaces that selection before core.start()
			// ever applies any of it.
			talents = drawTalentsFrom(core.talentRandom(), { pool: GOOD_TALENT_POOL });
			core.remake(talents.map(t => t.id));
		}
		printText =
			(country ? `Country: ${country}\n` : '') +
			`Sex orientation: ${sex}\n` +
			`Family wealth: ${propertyAllocate[types.MNY]}\n` +
			`Appearance: ${propertyAllocate[types.CHR]}\n` +
			`IQ: ${propertyAllocate[types.INT]}\n` +
			`Healthy: ${propertyAllocate[types.STR]}\n` +
			`EQ: ${propertyAllocate[types.SPR]}\n\n`;
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
			<!-- The trapezoid clip lives on .alloc-panel itself; the actual
			     glass fill (background + backdrop-filter) is this separate
			     layer instead of sharing the clipped element directly --
			     Chromium doesn't crop a backdrop-filter by its own
			     clip-path (confirmed live: the shape only appeared once
			     backdrop-filter was removed from the same element), so the
			     blur has to sit on an absolutely-positioned child that the
			     parent's overflow:hidden + clip-path can crop from outside. -->
			<div class="alloc-glass" aria-hidden="true"></div>
			<p class="alloc-title">Allocate your attributes</p>
			<p class="alloc-tokens">
				<span>Tokens: {propertyPoints}</span>
				<span>Remaining: {allocLeft}</span>
			</p>
			<!-- Mirrors .alloc-row's own structure (empty label, ghost step,
			     value-width slot, ghost step) purely so the Random button's
			     slot lands in the exact same column as .alloc-value below --
			     matching that by hand-tuned margins would drift the moment
			     either row's sizing changes; sharing the row's own layout
			     can't drift out of sync with it. -->
			<div class="alloc-row random-align" aria-hidden="true">
				<span class="alloc-label"></span>
				<span class="alloc-step-ghost"></span>
				<span class="value-slot">
					<button
						type="button"
						class="alloc-action random-row"
						aria-hidden="false"
						onclick={randomAllocate}
					>
						Random
					</button>
				</span>
				<span class="alloc-step-ghost"></span>
			</div>
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
			<button
				type="button"
				class="alloc-action start start-row"
				disabled={allocLeft > 0}
				onclick={confirmAllocation}
			>
				Start
			</button>
			<!-- Moved inside the glass panel, below Start, but keeping the
			     original hover-to-reveal discovery -- invisible until this
			     strip itself is hovered, same "hidden in plain sight" tip as
			     before, just relocated off the background footage's rail
			     band (nothing back there to hover once it's on the glass)
			     and onto its own reserved spot under Start instead. -->
			<div class="alloc-hint-zone" aria-hidden="true">
				<p class="alloc-hint">See what will happen to put all tokens into one attribute</p>
			</div>
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
				<!-- stats is reassigned to core.propertys right after effects
				     is set to this same tick's delta (see onNext/
				     renderTrajectory) -- it already includes this tick's own
				     change, so subtracting effects[key] here showed the
				     value from BEFORE this tick instead of the current one.
				     The number then silently jumped up a full tick later to
				     catch up, unsynced from the +N badge that had already
				     moved on -- read as the statbar randomly flashing/
				     re-rendering on its own. -->
				<span class="stat-value">{stats[types[key]]}</span>
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

	<!-- The event log reads as the foreground staircase itself: each entry
	     is one step, age set on its tread (the teal-green horizontal
	     surface underfoot in stairwell.jpg) and that year's events on the
	     riser directly below (the white vertical face), the pair sharing
	     one rotateZ tilt so they read as a single step rather than two
	     unrelated bars. Successive steps nudge sideways (a repeating
	     sawtooth via --step, since a real ascending flight alternates
	     which way each tread outsets) so the list reads as climbing, not
	     a plain vertical list; scrollToEnd() then drives the whole thing
	     upward as each new step appends at the bottom -- the same motion
	     a film's end credits make. Pinned to the walking loop's cover-fit
	     rectangle so it stays glued to the footage regardless of viewport
	     shape. -->
	<div class="scene" style={overlayStyle}>
		<!-- Hard clip boundary for the scrolling log below, kept as its own
		     plain (untransformed) element so its overflow:hidden edge is a
		     reliable, predictable rectangle regardless of anything the log
		     itself does visually. -->
		<div class="stair-log-viewport">
			<div class="stair-log" bind:this={logEl}>
				{#each entries as entry, i (entry.id)}
					<div class="step" class:fatal={entry.fatal} style="--step: {i % 5}">
						<div class="step-tread">Age {entry.age}</div>
						<div class="step-riser">
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
					</div>
				{/each}
			</div>
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
		/* Unified with the allocation screen's own "liquid glass" language
		   (see .alloc-panel/.alloc-glass) instead of the old dark cyberpunk
		   statbar + flat cream cards: dark-navy text on a frosted, light
		   glass tint reads as one continuous UI system across both screens
		   now, rather than two different visual treatments bolted together. */
		--positive: #1a7a5c;
		--negative: #b8382a;
	}
	/* Positioned (not static) and stacked above .scene below purely so it
	   can never end up rendered under a scrolled-up step card -- .scene is
	   position:fixed, and a fixed sibling paints over a static one in DOM
	   order regardless of who's visually "first" on screen, which is
	   exactly the covering bug this fixes. Fixed height (not just
	   min-height): flex-wrap is off and every stat column always reserves
	   the same delta-row height (see .stat-delta below), so this box's
	   height genuinely never changes as effects appear/disappear -- both
	   are needed, since either alone still leaves a path for the row to
	   reflow. */
	.statbar {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 1.25rem;
		max-width: 42rem;
		height: 5.25rem;
		margin: 1rem auto 0;
		padding: 0 1.5rem;
		border-radius: 1.1rem;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(210, 228, 236, 0.62) 100%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		backdrop-filter: blur(20px) saturate(160%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.55),
			inset 0 -10px 16px rgba(20, 40, 55, 0.06),
			0 6px 18px rgba(5, 12, 18, 0.3);
		flex-wrap: nowrap;
		overflow: hidden;
		font-size: 1rem;
		color: #17262e;
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
		color: #4b6068;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3.5rem;
	}
	.stat-label {
		font-size: 0.8rem;
		color: #4b6068;
	}
	.stat-value {
		font-size: 1.3rem;
		font-weight: bold;
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

	/* Hard clip boundary for the log below. Starts well below .statbar's own
	   screen position (a fixed rem offset stacked on top of the existing
	   5%, not just 5% alone) -- .statbar's height is a fixed rem value
	   pinned to the viewport, but this box's own top is a percent of the
	   (often taller, overscanned) cover-fit rect, so on most aspect ratios
	   5% alone landed above the statbar's actual bottom edge. Stops well
	   short of .scene's own bottom edge (80%, not 95%) to leave real
	   clearance above .controls' fixed-position View Summary button --
	   .controls sits at a fixed rem distance from the viewport bottom, not
	   from this box, so the two need enough of a permanent gap that the
	   button can never sit over the newest, most-recently-scrolled-into-
	   view step. */
	.stair-log-viewport {
		position: absolute;
		left: 6%;
		top: calc(5% + 6.5rem);
		width: 58%;
		height: calc(80% - 6.5rem);
		overflow: hidden;
	}
	/* The climb log itself: one step per entry, scrolled to the bottom as
	   new ones arrive (scrollToEnd()). Previously carried a 3D
	   perspective+rotateY tilt for a "receding staircase" look, but a
	   rotated element's own on-screen bounding box is provably larger than
	   its flat layout box (measured live: 886px wide vs. a real 742px, on
	   an element with no explicit width past its container) -- neither
	   overflow:hidden here nor on the wrapper above clips it at the
	   intended edge, which is what let entry text visibly run past the
	   right edge of the screen. Each step's own small 2D rotateZ tilt
	   (below) still reads as "stairs" without that problem: it's a
	   same-plane rotation, so its bounding box matches its layout box and
	   normal clipping/wrapping behaves exactly as authored. Scrollbar
	   hidden since scrollToEnd() drives it. Fills its clipping wrapper
	   exactly (inset:0) rather than repeating that wrapper's own
	   position/size. */
	.stair-log {
		position: absolute;
		inset: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.6cqh;
		mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.stair-log::-webkit-scrollbar {
		display: none;
	}
	/* One step = one entry: the tread (age) and riser (event) share a
	   single tilt so they read as one physical step, and each step
	   outsets sideways from the last on a 5-step sawtooth -- a real
	   ascending flight alternates which way a tread juts relative to the
	   one below it; a plain vertical stack read as a list, not stairs. A
	   same-plane rotateZ only (no perspective/rotateY -- see .stair-log
	   above), so it can't inflate this card's own clipped/wrapped width. */
	.step {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-left: calc(var(--step, 0) * 2.6cqw);
		transform: rotateZ(-2.5deg);
		font-size: 2.6cqh;
		max-width: 100%;
	}
	/* Same frosted-glass recipe as .alloc-glass (tint + backdrop-blur +
	   inset highlight), just tinted teal instead of neutral so the tread
	   still reads as the stair's own surface rather than a UI chrome
	   sitting on top of it. */
	.step-tread {
		background: linear-gradient(180deg, rgba(129, 214, 191, 0.55) 0%, rgba(37, 79, 71, 0.62) 100%);
		-webkit-backdrop-filter: blur(14px) saturate(160%);
		backdrop-filter: blur(14px) saturate(160%);
		color: #f2fbf7;
		font-weight: bold;
		font-size: 0.9em;
		white-space: nowrap;
		padding: 0.25em 0.9em;
		border-radius: 0.3em 0.9em 0 0;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.4),
			0 2px 8px rgba(5, 12, 18, 0.5);
	}
	.step-riser {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(210, 228, 236, 0.66) 100%);
		-webkit-backdrop-filter: blur(16px) saturate(160%);
		backdrop-filter: blur(16px) saturate(160%);
		padding: 0.6em 1em 0.7em;
		border-radius: 0 0.6em 0.6em 0.6em;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.5),
			inset 0 -8px 14px rgba(20, 40, 55, 0.05),
			0 3px 10px rgba(5, 12, 18, 0.35);
	}
	.step.fatal .step-tread {
		background: linear-gradient(180deg, rgba(216, 106, 89, 0.55) 0%, rgba(101, 38, 28, 0.62) 100%);
	}
	.step.fatal .entry-text {
		color: #7a1c12;
	}
	.entry-text {
		margin: 0;
		white-space: pre-line;
		line-height: 1.4;
		color: #17262e;
	}
	.entry-deltas {
		margin-top: 0.5em;
		display: flex;
		gap: 1em;
		flex-wrap: wrap;
		font-size: 0.85em;
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
	   fill, a gloss highlight), cut as a trapezoid: top edge wide, bottom
	   edge narrow, matching the stairwell void's own receding shape in
	   this frame so the card reads as wedged into that space rather than
	   floating over it. Tint/blur are dialed well down from the earlier
	   card so the stairwell stays visible through it. */
	.alloc-panel {
		position: absolute;
		/* Measured against the live stairwell footage (canvas pixel-scanned,
		   not eyeballed): the void's outer opening sits at roughly x 28.8%-
		   61.7%, y ~6% of the cover-fit frame at its widest (top), narrowing
		   fast toward the vanishing point well below the card's own bottom
		   edge -- a literal pixel match to that vanishing point would leave
		   no room for legible content, so the box below hugs the top opening
		   closely and the taper (in the clip-path) only approximates the
		   rest of the convergence. */
		left: 32%;
		top: 8.5%;
		width: 27%;
		height: 72.5%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		border: none;
		/* The trapezoid itself: 18% taper per side at the bottom (up from
		   the previous 10%, to read as a much more deliberate wide-top/
		   narrow-bottom wedge), corners chamfered with a fixed pixel offset
		   at each vertex (calc(% ± px), resolved against this element's own
		   box) to soften them into an approximate rounded corner -- true
		   arcs aren't expressible in a clip-path polygon without knowing
		   the box's pixel size, and this reads as rounded at the card's
		   actual on-screen size without needing a JS-measured radius. Only
		   crops .alloc-glass/::before below -- see the note on .alloc-glass
		   for why the blur itself can't live on this same clipped element. */
		--chamfer: 16px;
		clip-path: polygon(
			var(--chamfer) 0%,
			calc(100% - var(--chamfer)) 0%,
			100% var(--chamfer),
			85% calc(100% - var(--chamfer)),
			calc(85% - var(--chamfer)) 100%,
			calc(15% + var(--chamfer)) 100%,
			15% calc(100% - var(--chamfer)),
			0% var(--chamfer)
		);
		padding: 3.4cqh 3cqw 3cqh;
		color: #17262e;
		text-align: center;
	}
	/* The actual glass fill -- background tint + backdrop-blur + inset
	   shadow -- separated from .alloc-panel's own box because Chromium
	   doesn't crop a backdrop-filter by clip-path on the same element
	   (confirmed live: the trapezoid only rendered once backdrop-filter
	   was removed from .alloc-panel directly). .alloc-panel's own
	   overflow:hidden + clip-path crop this absolutely-positioned child
	   from the outside instead, which does work. */
	.alloc-glass {
		position: absolute;
		inset: 0;
		/* Split the difference between the earlier, heavier glass (too
		   opaque to read the stairwell through) and the 14px/0.18 pass that
		   followed it (too clear -- the card stopped reading as glass at
		   all). */
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(210, 228, 236, 0.6) 100%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		backdrop-filter: blur(20px) saturate(160%);
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.55),
			inset 0 -12px 18px rgba(20, 40, 55, 0.06);
		pointer-events: none;
	}
	/* Gloss cap, same trick as Button.svelte's ::before -- softened to
	   match the thinner glass. */
	.alloc-panel::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(120% 80% at 50% -10%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.14) 40%, rgba(255, 255, 255, 0) 70%);
		mix-blend-mode: screen;
		pointer-events: none;
	}
	.alloc-title,
	.alloc-tokens,
	.alloc-stats {
		position: relative;
	}
	.alloc-title {
		margin: 0 0 0.3cqh;
		font-size: 3.4cqh;
		font-weight: bold;
	}
	.alloc-tokens {
		display: flex;
		justify-content: center;
		gap: 1.4em;
		margin: 0 0 2cqh;
		font-size: 2.1cqh;
		color: #17262e;
	}
	.alloc-stats {
		display: flex;
		flex-direction: column;
		gap: 2.4cqh;
		width: 80%;
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
	/* The Random row: same width as .alloc-stats (its sibling below) so the
	   shared .alloc-row flex math lines up identically, and the same ghost
	   step/value-slot sizes so the slot Random sits in is pixel-identical
	   to .alloc-value's own box -- see the markup comment for why this
	   mirrors the row instead of computing an offset by hand. */
	.random-align {
		width: 80%;
		margin: 0 0 1cqh;
	}
	.alloc-step-ghost {
		/* em is relative to *this* element's own font-size, not .alloc-step's
		   -- without matching font-size here, 1.9em resolves to a different
		   px width than the real step buttons use and the slot drifts off
		   .alloc-value's actual center. */
		font-size: 2.4cqh;
		width: 1.9em;
		height: 1.9em;
		visibility: hidden;
	}
	.value-slot {
		position: relative;
		font-size: 2.8cqh;
		width: 1.6em;
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
		/* Was 0.35 -- close enough to the glass panel's own tint that a
		   disabled step nearly vanished into the background instead of
		   reading as "present but not clickable right now". */
		opacity: 0.6;
		cursor: default;
	}
	.alloc-step:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.42);
	}
	.alloc-step:not(:disabled):active {
		transform: scale(0.92);
	}
	/* Random sits on its own row between the tokens line and the stat
	   rows, per the requested reading order; Start sits on its own row
	   below the stats, centered on the trapezoid's own axis via the
	   parent's text-align/align-items: center -- neither needs the old
	   flex-row wrapper now that they're stacked instead of paired.
	   Random itself is absolutely centered on .value-slot (its ghost-row
	   parent) rather than sized to it -- "Random" is far wider than the
	   1.6em a digit needs, so it has to be free to overflow that slot
	   while still sharing its center, which is what actually needs to
	   land on the same vertical line as the stat values below. */
	.alloc-action.random-row {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		white-space: nowrap;
		font-size: 1.2rem;
		/* Sits higher on the card now, over the bright sky/skylight rather
		   than the dark railing the base .alloc-action color was tuned
		   for -- dark text (matching the stat labels around it) instead of
		   the light one Start still uses lower down. Same specificity as
		   .alloc-action alone, so the compound selector (not source order)
		   is what makes this win. */
		color: #17262e;
		text-shadow: none;
	}
	/* Liquid-glass pill -- the same recipe Button.svelte's .btn uses for
	   Print/Restart Life/View Summary elsewhere (backdrop-blur + saturate,
	   an inset highlight, a screen-blended gloss cap, a real drop shadow),
	   just recolored for this panel's own light theme and sized in cq
	   units instead of Button.svelte's rem/em -- pasting that component's
	   literal dark, white-glow-text tint onto this bright glass card would
	   clash with it; unifying the LANGUAGE (an actual pill button, not
	   bare text) is what actually needed to match, not the exact palette. */
	.alloc-action.start-row {
		position: relative;
		overflow: hidden;
		margin: 2cqh 0 2cqh;
		padding: 0.9cqh 4.5cqw;
		font-size: 1.8rem;
		border: 1px solid rgba(23, 38, 46, 0.22);
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(210, 228, 236, 0.58) 100%);
		-webkit-backdrop-filter: blur(14px) saturate(160%);
		backdrop-filter: blur(14px) saturate(160%);
		box-shadow:
			0 8px 18px rgba(5, 12, 18, 0.22),
			inset 0 1px 1px rgba(255, 255, 255, 0.6),
			inset 0 -8px 14px rgba(20, 40, 55, 0.08);
		transition: transform 150ms ease, box-shadow 150ms ease;
	}
	/* Gloss cap, same trick as Button.svelte's ::before -- a bright ellipse
	   hugging the top, screen-blended so it reads as light catching a
	   convex surface rather than a flat highlight bar. */
	.alloc-action.start-row::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(120% 100% at 50% -20%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.16) 40%, rgba(255, 255, 255, 0) 70%);
		mix-blend-mode: screen;
		pointer-events: none;
	}
	.alloc-action.start-row:not(:disabled):hover {
		transform: translateY(-1px);
		box-shadow:
			0 11px 22px rgba(5, 12, 18, 0.26),
			inset 0 1px 1px rgba(255, 255, 255, 0.7),
			inset 0 -8px 14px rgba(20, 40, 55, 0.08);
	}
	.alloc-action.start-row:not(:disabled):active {
		transform: scale(0.97) translateY(0);
		box-shadow:
			0 4px 10px rgba(5, 12, 18, 0.2),
			inset 0 1px 1px rgba(255, 255, 255, 0.45),
			inset 0 -5px 8px rgba(20, 40, 55, 0.1);
	}
	/* Plain text, no border/background/pill -- same type family as every
	   other label on this panel, just a size up. Only Start carries the
	   color blink (slowed to a calm breath); Random stays a steady dark
	   tone so the blink singles out the one action that moves the story
	   forward. Disabled Start: dim and steady, no blink. */
	.alloc-action {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		letter-spacing: 0.06em;
		/* Light base kept as the fallback for any row that doesn't override
		   it; both Random and Start now sit over the glass card's own
		   near-white tint (not the dark railing this was originally tuned
		   for) and override to a dark color below. */
		color: #cfe7f2;
		text-shadow: 0 1px 4px rgba(8, 18, 26, 0.55);
	}
	/* Blinks in every state (gating it on :not(:disabled) made the panel
	   open with no blink anywhere until all tokens were spent, which read
	   as the animation being missing) -- disabled just dims the whole
	   thing, the pulse continuing faintly underneath. Darkened (was a
	   light-blue-to-white blink, tuned for the dark railing background)
	   since the panel's own semi-transparent glass reads as near-white --
	   white-on-white was nearly invisible. */
	.alloc-action.start {
		animation: action-blink 3.2s ease-in-out infinite;
		color: #17262e;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
	}
	.alloc-action:disabled {
		/* Was 0.45 -- fine for the +/- steps, but on Start it read as
		   barely different from the enabled blink's own dim phase (see
		   the more specific override below for why Start needs more than
		   just an opacity bump). */
		opacity: 0.6;
		cursor: default;
	}
	/* Swaps Start's whole color story instead of just dimming it: enabled
	   Start blinks between dark navy and a saturated teal (see
	   action-blink below); at only an opacity difference, disabled Start's
	   dimmed navy read too close to that same blink's own dark phase to
	   register as "not clickable yet" at a glance. A flat, desaturated
	   gray-blue with no color animation reads as inert on sight, which a
	   dimmer version of the same blinking color didn't. More specific than
	   .alloc-action.start above (three selectors vs. two), so this wins
	   regardless of source order. */
	.alloc-action.start:disabled {
		animation: none;
		color: #7c8a90;
		text-shadow: none;
	}
	@keyframes action-blink {
		0%,
		100% {
			color: #17262e;
		}
		50% {
			color: #0d5f78;
			text-shadow:
				0 1px 2px rgba(255, 255, 255, 0.5),
				0 0 10px rgba(13, 95, 120, 0.5);
		}
	}

	/* Strategy tip, now living inside the glass panel below Start instead
	   of floating over the background footage -- the hover-zone needs its
	   own reserved padding here (there's no bright rail band to lean on
	   anymore) so there's still something to find by hovering. */
	.alloc-hint-zone {
		position: relative;
		margin-top: 1cqh;
		padding: 1cqh 2cqw;
	}
	.alloc-hint {
		position: relative;
		margin: 0;
		max-width: 90%;
		font-size: 1.5cqh;
		letter-spacing: 0.06em;
		line-height: 1.4;
		color: rgba(23, 38, 46, 0.72);
		opacity: 0;
		transition: opacity 300ms ease;
		pointer-events: none;
	}
	.alloc-hint-zone:hover .alloc-hint {
		opacity: 1;
	}
</style>
