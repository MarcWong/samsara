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
	const STAT_LABELS = { MNY: 'Wealth', CHR: 'Appearance', INT: 'IQ', STR: 'Health', SPR: 'Happiness' };

	// The displayed age is age.json's own `age` field, read from the row the
	// tick landed on. It used to be a hardcoded table here, ported from
	// trajectory.js, which drifted badly out of step with the data: that table
	// still described 100 internal ages while age.json defines only 72 rows,
	// so events written for adults were rendering as childhood (a marriage at
	// "13", a university entrance at "11"). Taking the number from the row
	// itself means the two can no longer disagree -- whoever edits age.json
	// sets the age that shows.
	const property = core.request(core.Module.PROPERTY);
	const displayAge = internal => Number(property.getAgeData(internal)?.age ?? internal);

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
	// LGBTQ, not LBTQ -- this string is what the statbar, the print block and
	// Summary's identity row all show. The condition-DSL property key stays
	// `LBTQ` (every events.json include is written against it); only the
	// label the player reads is spelled out in full.
	const sex = $draft.orientation == 1 ? 'LGBTQ' : 'Straight';

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
	// Whether the free-allocation bonus (+5 to every attribute) fired for
	// this life -- read back in renderTrajectory for the privilege coda
	// below. Kept as its own flag rather than re-reading the TLR property,
	// so the two can't drift if TLR ever gains another meaning.
	let bonusTriggered = false;
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

	// The log's top edge carries a fade so entries dissolve as they scroll
	// up out of view -- but at rest (scrollTop 0) there is nothing above the
	// first entry to dissolve, so that same fade just ate the top of it: the
	// "Age 0" tread and its first line of text rendered nearly invisible.
	// Only apply the fade once something is actually scrolled past.
	let scrolledFromTop = $state(false);
	function onLogScroll() {
		scrolledFromTop = (logEl?.scrollTop ?? 0) > 4;
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
		const realAge = displayAge(age);
		const newEffects = { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 0 };

		const joined = content
			.map(({ type, description, effect, name, postEvent }) => {
				if (effect) {
					for (const key of STAT_KEYS) {
						// Accumulate rather than overwrite. One tick can carry
						// several contents that touch the same stat -- a talent
						// alongside an event, an event plus the branch target
						// doEvent() recurses into, or a zero-state cascade rung
						// (those carry 2-4 stat effects each). Assigning here
						// showed only the last one in the stat bar, and pushing
						// a row per content produced two `SPR` entries in the
						// keyed each below, which Svelte rejects outright:
						// each_key_duplicate.
						if (effect[key]) newEffects[key] += effect[key];
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

		// One row per stat that actually moved this year, in STAT_KEYS order.
		// Deriving it from the totals is what guarantees the keyed each block
		// below sees each stat name once; it also makes the row order stable
		// instead of depending on which content happened to come first.
		const statChanges = STAT_KEYS.filter(key => newEffects[key]).map(key => [key, newEffects[key]]);

		const statChangesText = statChanges
			.map(([prop, value]) => `${STAT_LABELS[prop]} ${value > 0 ? '+' : ''}${value}`)
			.join('  ');

		const fatal = content.some(c => (c.effect?.LIF ?? 0) < 0);

		// A year that both changes a stat and kills reads wrong with the
		// numbers last: the standardized "You are DEAD..." declaration is the
		// closing beat of the whole life, so a "Health -1" printed under it
		// buries it. Split that one trailing line off the joined text so it
		// can render BELOW the stat deltas -- i.e. the attribute change moves
		// up and the death has the last word:
		//
		//   Medicine keeps a serious congenital condition compatible with...
		//   The condition overwhelms your remaining physical reserve.
		//   Health -1
		//   You are DEAD again, mortal.
		//
		// Every death event in events.json now carries that marker as its own
		// final line, so this matches on all of them. Fatal content is sorted
		// last by life.js's next(), which is why the marker is reliably the
		// last line of the joined text.
		const deathMatch = fatal ? joined.match(/\n(You are DEAD[^\n]*)$/i) : null;
		const text = deathMatch ? joined.slice(0, deathMatch.index) : joined;
		let deathLine = deathMatch ? deathMatch[1] : '';

		// Privilege coda: a life that triggered the free-allocation bonus
		// (+5 to every attribute) and still died young gets one extra line
		// under the death. The pairing is the whole point -- the bonus is
		// this game's "born lucky" lever, so the earlier it fails the more
		// pointed the line is. Runtime-conditional on purpose: it depends on
		// this run's bonus flag and death age, not on which event killed
		// her, so it can't live in events.json (the same event is reachable
		// by unprivileged lives and at any age). realAge is the DISPLAYED
		// age -- the number the player actually watched her die at -- not
		// the internal 0-102 content index.
		if (fatal && bonusTriggered && realAge < 75) {
			const coda = 'Relax, even when you are privileged, nothing is in control';
			deathLine = deathLine ? `${deathLine}\n${coda}` : coda;
		}

		printText +=
			`Age: ${realAge}\n${text}` +
			(statChangesText ? `\n${statChangesText}` : '') +
			(deathLine ? `\n${deathLine}` : '') +
			'\n';

		entries = [
			...entries,
			{
				id: entries.length,
				year: 2022 + realAge,
				age: realAge,
				text,
				deathLine,
				statChanges,
				fatal,
			},
		];

		return joined;
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

	// How much the free-allocation bonus is worth. A flat +5 for every
	// country, per the attribute-pool design doc's privilege rule.
	// This was briefly a per-country table (JAP/CH 9, IRN 10, ... HTI 5),
	// fitted so that privileged life expectancy ranked the way real-world
	// life expectancy does. That made the bonus mean something different
	// depending on where you were born, which is not what the mechanic is:
	// the privilege top-up is the same gift everywhere, and only the world
	// you spend it in differs. Ranking privileged lifespans is the event
	// tree's job, not this constant's.
	const BONUS_AMOUNT = 5;

	// The rail hint's "see what happens" promise, and the Summary hint's own
	// line about a boost, are a real mechanic: reaching this country's own
	// trigger value in any single stat adds BONUS_AMOUNT to
	// all five attributes, each capped at 17 (the attribute-pool design
	// doc's privilege rule -- this replaced the earlier top-up-to-5, so
	// poorer countries' privileged runs can actually reach the higher
	// attribute bands).
	// Every group's trigger value is at or below that group's own point
	// budget, so dumping every point into one stat always meets it -- no
	// separate "all in one stat" fallback needed.
	// Returns {propertyAllocate, triggered} -- confirmAllocation() needs the
	// flag too, to decide whether to re-roll this life's lucky charms.
	function applyBonus(propertyAllocate) {
		const trigger = BONUS_TRIGGER[countryCode] ?? 8;
		const amount = BONUS_AMOUNT;
		let max = 0;
		for (const key of STAT_KEYS) {
			const value = propertyAllocate[types[key]];
			if (value > max) max = value;
		}
		const triggered = max >= trigger;
		if (triggered) {
			for (const key of STAT_KEYS) {
				const t = types[key];
				propertyAllocate[t] = Math.min(propertyAllocate[t] + amount, 17);
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
	// The five outright misfortunes (Earthquake, Airplane Crash, Farewell
	// Mom, Bankruptcy, Rape). The privileged re-draw is no longer fully
	// insulated from them: they stay in the pool at a weight that gives the
	// bad five ~5% of each pick between them (5 x 0.042 vs 4 good at 1 --
	// 0.21 / 4.21 ~ 4.99%), against ~95% good. With the Poisson charm count
	// (~0.98 draws per life) that lands at roughly one privileged life in
	// twenty catching a misfortune anyway -- including, rarely, the plane
	// crash the privilege coda was written for.
	const BAD_TALENT_POOL = [0, 1, 2, 3, 4];
	const TLR_TALENT_POOL = [...BAD_TALENT_POOL, ...GOOD_TALENT_POOL];
	const TLR_TALENT_WEIGHTS = Object.fromEntries(BAD_TALENT_POOL.map(i => [i, 0.042]));

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
		bonusTriggered = bonus.triggered;
		if (bonus.triggered) {
			// The free-allocation trick already handed her an easier start --
			// re-roll this life's lucky charms from a pool that is ~95% the
			// four clean positives, with the five misfortunes kept in at a
			// sliver of weight (see TLR_TALENT_WEIGHTS): privilege shields
			// her from bad luck, it does not repeal it. How MANY are drawn
			// is Poisson (see talentDraw.js), so this re-roll often yields
			// one charm and sometimes none -- it is not a guaranteed set.
			// core.remake() was
			// already called once in Plaza with the original draw; calling
			// it again here fully replaces that selection before core.start()
			// ever applies any of it.
			talents = drawTalentsFrom(core.talentRandom(), { pool: TLR_TALENT_POOL, weights: TLR_TALENT_WEIGHTS });
			core.remake(talents.map(t => t.id));
		}
		printText =
			(country ? `Country: ${country}\n` : '') +
			`Sex orientation: ${sex}\n` +
			`Family wealth: ${propertyAllocate[types.MNY]}\n` +
			`Appearance: ${propertyAllocate[types.CHR]}\n` +
			`IQ: ${propertyAllocate[types.INT]}\n` +
			`Healthy: ${propertyAllocate[types.STR]}\n` +
			`Happiness: ${propertyAllocate[types.SPR]}\n\n`;
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
			<!-- Start sits inside its own hover ring: the 0.5cqh of padding
			     around the button is a second trigger for the hint below,
			     while the button's own face is excluded (see the :has()
			     rule in the stylesheet). Wrapping rather than growing the
			     button keeps Start's hit area exactly what it looks like --
			     a click 0.5cqh outside the pill must not start the run. -->
			<div class="start-hover-zone">
				<button
					type="button"
					class="alloc-action start start-row"
					disabled={allocLeft > 0}
					onclick={confirmAllocation}
				>
					Start
				</button>
			</div>
			<!-- Moved inside the glass panel, below Start, but keeping the
			     original hover-to-reveal discovery -- invisible until this
			     strip itself is hovered, same "hidden in plain sight" tip as
			     before, just relocated off the background footage's rail
			     band (nothing back there to hover once it's on the glass)
			     and onto its own reserved spot under Start instead. -->
			<div class="alloc-hint-zone" aria-hidden="true">
				<p class="alloc-hint">See what happens if you put all tokens <br> in to one attribute.</p>
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
				<!-- Floored at 0 for display only; the model keeps the real
				     value. A no-bonus life runs a deficit for decades before a
				     fatal branch fires (see the TLR=0 thresholds in
				     events.json), so the raw number spends most of a run
				     negative, reaching -19. That deficit is load-bearing for
				     how long these lives last -- clamping the property itself
				     would collapse the no-bonus lifespan from ~50 to ~8 -- so
				     the floor lives here instead. The delta badge below still
				     reports what the year actually did, which is the intended
				     read once the bar hits bottom: it cannot get lower, and it
				     keeps being taken from anyway. -->
				<span class="stat-value">{Math.max(0, stats[types[key]])}</span>
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
		<div
			class="stair-log-viewport"
			class:scrolled={scrolledFromTop}
			bind:this={logEl}
			onscroll={onLogScroll}
		>
			<div class="stair-log">
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
							<!-- Below the deltas on purpose -- see renderTrajectory: the
							     death declaration is the entry's last word, so the
							     year's stat changes sit above it rather than after. -->
							{#if entry.deathLine}
								<p class="entry-text death-line">{entry.deathLine}</p>
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
		/* clip, not hidden: `hidden` makes this a scroll container (it can be
		   scrolled programmatically and can absorb a wheel/touch gesture even
		   with no visible scrollbar), which is wrong for a fixed readout --
		   `clip` crops identically but is not scrollable at all. Paired with
		   pointer-events:none so a wheel over the bar falls through to the
		   event log behind it instead of dying here. Nothing in the bar is
		   interactive, so nothing is lost. */
		overflow: clip;
		pointer-events: none;
		overscroll-behavior: none;
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
	/* This box is also the scroll container, so the player can wheel/drag
	   back through earlier years while the run is still going. The inner
	   .stair-log below is a plain content column that grows past this
	   height; scrolling the clip boundary itself (rather than a separate
	   absolutely-positioned child) is what makes the scrollable area
	   exactly equal to the visible area. .scene is pointer-events:none so
	   the huge cover-fit rect it spans can't swallow clicks meant for
	   anything over the footage, so this one element opts back in --
	   without that, wheel and touch never reach it. */
	.stair-log-viewport {
		position: absolute;
		left: 6%;
		top: calc(5% + 6.5rem);
		width: 58%;
		height: calc(80% - 6.5rem);
		overflow-y: auto;
		overflow-x: hidden;
		pointer-events: auto;
		/* Don't hand the wheel off to an ancestor once this hits its end --
		   the log is the only thing on this screen meant to scroll. */
		overscroll-behavior: contain;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.stair-log-viewport::-webkit-scrollbar {
		display: none;
	}
	/* Applied only while scrolled (see onLogScroll) -- at rest this fade
	   had nothing above the first entry to dissolve and simply erased its
	   own top edge, taking the "Age 0" tread and first text line with it. */
	.stair-log-viewport.scrolled {
		/* Short band (was 15%, ~70px -- a full line of text plus its age
		   chip): enough to soften an entry leaving the top, not enough to
		   render the topmost readable line illegible. */
		mask-image: linear-gradient(to bottom, transparent 0%, black 7%, black 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 7%, black 100%);
	}
	/* The climb log itself: one step per entry, scrolled to the bottom as
	   new ones arrive (scrollToEnd()). Previously carried a 3D
	   perspective+rotateY tilt for a "receding staircase" look, but a
	   rotated element's own on-screen bounding box is provably larger than
	   its flat layout box (measured live: 886px wide vs. a real 742px, on
	   an element with no explicit width past its container) -- neither
	   overflow:hidden on the wrapper above nor on this element clips it at
	   the intended edge, which is what let entry text visibly run past the
	   right edge of the screen. Each step's own sideways stagger (below)
	   reads as "stairs" without that problem, and without even the
	   milder rotateZ tilt this used to carry -- no rotation at all means
	   its bounding box always matches its layout box, so clipping/
	   wrapping behaves exactly as authored. Plain in-flow content now (it
	   used to be absolutely positioned and own the scrolling itself): the
	   wrapper above is the scroll container, so this just grows past it
	   and gets scrolled. */
	.stair-log {
		display: flex;
		flex-direction: column;
		gap: 1.6cqh;
	}
	/* One step = one entry, outset sideways from the last on a 5-step
	   sawtooth -- a real ascending flight alternates which way a tread
	   juts relative to the one below it; a plain vertical stack read as a
	   list, not stairs. That sideways stagger alone reads as "stairs";
	   the earlier rotateZ(-2.5deg) tilt on top of it made the whole card
	   look crooked/tilted up rather than like a level flight, so each
	   step now sits flat like the rest of the staircase. */
	.step {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-left: calc(var(--step, 0) * 2.6cqw);
		font-size: 2.6cqh;
		max-width: 100%;
	}
	/* Same frosted-glass recipe as .alloc-glass (tint + backdrop-blur +
	   inset highlight), just tinted teal instead of neutral so the tread
	   still reads as the stair's own surface rather than a UI chrome
	   sitting on top of it. */
	.step-tread {
		/* Was 0.55/0.62 -- too see-through over the walking loop's brightest
		   frames (the pale stair treads), where the age chip washed out to
		   near-invisible while the same chip over a darker part of the
		   footage read solid. Opaque enough now to read the same wherever a
		   step happens to land. */
		background: linear-gradient(180deg, rgba(129, 214, 191, 0.82) 0%, rgba(37, 79, 71, 0.9) 100%);
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
		/* A touch more opaque than the original 0.26/0.66 -- the walking
		   loop's own footage was still showing through enough to make
		   entry-text harder to read than it should be. */
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(210, 228, 236, 0.8) 100%);
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
	/* After .entry-text so its margin:0 shorthand doesn't win on source
	   order -- both are single-class selectors on the same element. */
	.death-line {
		margin-top: 0.5em;
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
		/* Same liquid-glass pill recipe as .start-row below (see its own
		   comment for why: matching the LANGUAGE, an actual pill button
		   rather than bare text, is what unifies these two rather than
		   copying Button.svelte's dark palette verbatim). Sized down from
		   Start's own padding/font-size -- Random is a secondary action on
		   this panel, so it reads as the smaller of the two pills instead
		   of competing with Start for attention. transform above still
		   centers it on .value-slot regardless of this added padding. */
		overflow: hidden;
		/* clamp(), not a bare cqw -- .alloc-overlay's container basis is
		   5.mp4's 16:9 cover-fit rect, which on a narrow/portrait viewport
		   has to overshoot far wider than the screen itself to cover the
		   height, so a plain cqw padding ends up huge there even though it
		   looks right on a landscape viewport. The clamp keeps the cqw
		   scaling for normal aspect ratios but caps how far it can grow. */
		padding: 0.5cqh clamp(0.7em, 3cqw, 1.3em);
		border: 1px solid rgba(23, 38, 46, 0.16);
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(210, 228, 236, 0.32) 100%);
		-webkit-backdrop-filter: blur(10px) saturate(150%);
		backdrop-filter: blur(10px) saturate(150%);
		box-shadow:
			0 3px 8px rgba(5, 12, 18, 0.1),
			inset 0 1px 1px rgba(255, 255, 255, 0.35),
			inset 0 -3px 5px rgba(20, 40, 55, 0.05);
		transition: transform 150ms ease, box-shadow 150ms ease;
	}
	.alloc-action.random-row::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(120% 100% at 50% -20%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0) 70%);
		mix-blend-mode: screen;
		pointer-events: none;
	}
	.alloc-action.random-row:hover {
		box-shadow:
			0 4px 10px rgba(5, 12, 18, 0.13),
			inset 0 1px 1px rgba(255, 255, 255, 0.4),
			inset 0 -3px 5px rgba(20, 40, 55, 0.05);
	}
	.alloc-action.random-row:active {
		transform: translate(-50%, -50%) scale(0.97);
		box-shadow:
			0 2px 5px rgba(5, 12, 18, 0.1),
			inset 0 1px 1px rgba(255, 255, 255, 0.3),
			inset 0 -2px 4px rgba(20, 40, 55, 0.06);
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
		/* clamp(), same reasoning as .random-row above -- a bare 4.5cqw
		   stretches this into a badly distorted pill on a narrow/portrait
		   viewport, since the overlay's cq basis is the video's overshot
		   16:9 cover-fit width rather than the screen's own width. */
		padding: 0.9cqh clamp(1.6em, 4.5cqw, 2.4em);
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
	/* The hover target, deliberately larger than the text it reveals. Every
	   extra padding step is cancelled by an equal negative margin, so the box
	   grows for hit-testing while its footprint in this flex column -- and so
	   the hint's on-screen position -- is unchanged.
	   The growth is capped by what is actually reachable rather than chosen
	   freely: .alloc-panel clips with BOTH overflow:hidden and a tapering
	   clip-path, and clipping applies to pointer events too, so anything
	   past the panel edge would be dead area. Measured at the zone's own
	   height there are ~22px to the Start button above, ~22px to the panel
	   floor below, and ~24px to the taper on each side; +2.5cqh / +1.5cqw
	   (~19px) stays inside all three. Staying clear of Start also matters
	   because this div follows it in the DOM and both are positioned, so an
	   overlap would paint on top and swallow the button's clicks. */
	.alloc-hint-zone {
		position: relative;
		margin: -1.5cqh -1.5cqw -2.5cqh;
		padding: 3.5cqh 3.5cqw;
	}
	/* Two different transition speeds, one per direction. The duration
	   declared here is the one that runs on the way BACK to this state --
	   i.e. after the pointer leaves -- so the hint takes a slow 3s to
	   dissolve, staying readable long enough to finish the sentence after
	   you've moved on. The :hover rule below overrides it with a short
	   duration for the reveal, which should feel immediate. */
	.alloc-hint {
		position: relative;
		margin: 0;
		max-width: 100%;
		font-size: 1.5cqh;
		letter-spacing: 0.06em;
		line-height: 1.4;
		color: rgba(23, 38, 46, 0.72);
		opacity: 0;
		transition: opacity 3000ms ease;
		pointer-events: none;
	}
	.alloc-hint-zone:hover .alloc-hint {
		opacity: 1;
		transition: opacity 300ms ease;
	}
	/* Second trigger: a 0.5cqh ring around Start. The padding grows the
	   wrapper for hit-testing and the equal negative margin takes the growth
	   back out of the flex column, so Start's on-screen position and the
	   panel's spacing are byte-identical to before. The button keeps its own
	   box, so what is clickable as Start is still exactly the pill. */
	.start-hover-zone {
		display: flex;
		justify-content: center;
		/* Vertical: the 2cqh that used to be Start's own margin, minus the
		   0.5cqh now spent on padding, so the gap above and below the pill is
		   unchanged. Horizontal: a plain -0.5cqh cancelling the padding.
		   Start's margin has to move up here rather than stay on the button --
		   left in place it would sit INSIDE the ring, making the ring 2.5cqh
		   tall on those two edges instead of 0.5cqh (measured: 19.5px vs the
		   3.9px the sides get). */
		margin: 1.5cqh -0.5cqh;
		padding: 0.5cqh;
	}
	.start-hover-zone > .alloc-action.start-row {
		margin: 0;
	}
	/* Hovering the ring reveals the hint; hovering Start itself does not.
	   :has() is what draws that line -- the wrapper is hovered in both cases
	   (the button is inside it), so the button's own :hover has to veto.
	   The hint lives in a later sibling, hence `~`. Leaving the ring for the
	   button falls back to .alloc-hint's own 3s dissolve, the same slow fade
	   as moving the pointer away entirely. */
	.start-hover-zone:hover:not(:has(.alloc-action:hover)) ~ .alloc-hint-zone .alloc-hint {
		opacity: 1;
		transition: opacity 300ms ease;
	}
</style>
