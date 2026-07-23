<script>
	import { onMount, onDestroy } from 'svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import Button from '../components/Button.svelte';
	import TowerClimbBackground from '../components/parallax/TowerClimbBackground.svelte';
	import COUNTRIES from '../game/functions/countries.js';

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

	function countryName(property) {
		return COUNTRIES.find(({ code }) => property[code] == 1)?.name;
	}

	const propertyAllocate = initProperty({ ...$draft.propertyAllocate });
	const talents = $draft.talents;
	const country = countryName(propertyAllocate);
	const sex = propertyAllocate[types.LBTQ] == 1 ? 'LBTQ' : 'Straight';

	let printText =
		(country ? `Country: ${country}\n` : '') +
		`Sex orientation: ${sex}\n` +
		`Family wealth: ${propertyAllocate[types.MNY]}\n` +
		`Appearance: ${propertyAllocate[types.CHR]}\n` +
		`IQ: ${propertyAllocate[types.INT]}\n` +
		`Healthy: ${propertyAllocate[types.STR]}\n` +
		`EQ: ${propertyAllocate[types.SPR]}\n`;

	core.start(propertyAllocate);

	let stats = $state(core.propertys);
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

	function goSummary() {
		// Country/orientation/final display age travel along so Summary can
		// show them without re-deriving the AGE display mapping (the raw HAGE
		// property is the internal 0-102 index, not the age the player saw).
		const age = entries.length ? entries[entries.length - 1].age : 0;
		// The starting (post-rebalance) allocation, so Summary can show
		// "initial -> final" per stat.
		const initial = Object.fromEntries(STAT_KEYS.map(key => [key, propertyAllocate[types[key]]]));
		goToScreen('SUMMARY', { printText, talents, country, sex, age, initial });
	}

	onMount(onNext);
	onDestroy(clearAutoTimer);
</script>

<TowerClimbBackground />

<div class="trajectory">
	<div class="statbar">
		<span class="country">{country} <span class="sex">{sex}</span></span>
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

	<div class="log" bind:this={logEl}>
		{#each entries as entry (entry.id)}
			<div class="entry" class:fatal={entry.fatal}>
				<div class="entry-age">{entry.year} · Age {entry.age}</div>
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

	{#if isEnd}
		<div class="controls">
			<Button onclick={goSummary}>View Summary</Button>
		</div>
	{/if}
</div>

<style>
	.trajectory {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		/* Shared by .log and .log-scrim so the two stay pixel-aligned --
		   narrower than before (was min(52rem, 68vw)): that width read fine
		   at a normal window but produced single huge-run-on-line entries
		   on a wide desktop monitor, and pushed close enough to the right
		   statbar/climb column to risk covering the stairs on some sizes. */
		--log-width: min(32rem, 42vw);
		--log-right: 4.5rem;
		--log-max-height: 46dvh;
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
	.country {
		font-weight: bold;
		margin-right: auto;
		white-space: nowrap;
	}
	.sex {
		font-weight: normal;
		font-size: 0.85rem;
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

	/* Pinned to the right edge instead of centered -- the climbing figure
	   sits left-of-center in TowerClimbBackground's framing, so a centered
	   log used to sit right on top of them. Capped well short of full
	   height (roughly two and a half entries) and top-masked so
	   scrolled-past entries dissolve rather than get clipped, leaving the
	   3D climb visible everywhere else. Scrollbar hidden (still scrolls,
	   just no visible track/thumb) since this now auto-advances rather
	   than being a manually-scrolled reading pane.

	   The mask's own top stop floors at 85% opacity rather than fully
	   transparent -- a separate solid scrim layered behind .log to darken
	   this fade band was tried first, but it rendered as its own visible
	   translucent box (worse than the problem it fixed). Raising the
	   floor keeps entries readably "dissolving" as they scroll past
	   without ever going fully see-through, so the bright neon shaft-light
	   behind the climb can't shine through at full strength either --
	   solved directly in the existing mask, no extra layer needed. */
	.log {
		position: fixed;
		top: 50%;
		right: var(--log-right);
		transform: translateY(-50%);
		width: var(--log-width);
		max-height: var(--log-max-height);
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, black 20%, black 100%);
		-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, black 20%, black 100%);
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.log::-webkit-scrollbar {
		display: none;
	}
	@media (max-width: 640px) {
		/* No room for a side column on narrow/portrait viewports -- falls
		   back to a bottom band instead of overlapping the climb. */
		.log {
			position: static;
			top: auto;
			right: auto;
			transform: none;
			width: auto;
			max-width: 64rem;
			margin: auto 1rem 0;
		}
	}
	.entry {
		background: var(--bg-raised);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		border: 1px solid transparent;
	}
	.entry.fatal {
		border-color: var(--negative);
	}
	.entry-age {
		font-size: 0.9rem;
		color: var(--text-dim);
		margin-bottom: 0.35rem;
	}
	.entry-text {
		margin: 0;
		white-space: pre-line;
		line-height: 1.5;
	}
	.entry-deltas {
		margin-top: 0.6rem;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.95rem;
	}
	/* Pinned to the very bottom of the viewport (the log column is fixed
	   to the right, so normal flow would have floated this just under the
	   statbar at the top instead). No background band -- the glass button
	   floats over the climb scene on its own. */
	.controls {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}
</style>
