<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import StatRow from '../components/StatRow.svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import COUNTRIES from '../game/functions/countries.js';

	const types = core.PropertyTypes;
	// Wealth first, per this session's earlier "Wealth, Appearance, IQ,
	// Health, EQ" ordering fix, applied here directly rather than via a
	// runtime box-reorder like the old screen needed.
	const STATS = [
		{ type: types.MNY, label: 'Wealth' },
		{ type: types.CHR, label: 'Appearance' },
		{ type: types.INT, label: 'IQ' },
		{ type: types.STR, label: 'Health' },
		{ type: types.SPR, label: 'EQ' },
	];

	const [allocMin, allocMax] = core.propertyAllocateLimit;
	const country = COUNTRIES.find(({ code }) => $draft[code] == 1);

	const replace = core.remake($draft.talents.map(t => t.id));
	if (replace.length > 0) {
		globalThis.$$event('message', [replace.map(v => ['F_TalentReplace', v])]);
	}

	// country points, not a hardcoded 13 — the earlier hardcoded-intro bug
	// this session found and fixed for the LayaAir screen.
	const propertyPoints = core.getPropertyPoints(country?.points);

	let allocate = $state({
		[types.CHR]: 0,
		[types.INT]: 0,
		[types.STR]: 0,
		[types.MNY]: 0,
		[types.SPR]: 0,
	});

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

	function setStat(type, value) {
		allocate = { ...allocate, [type]: clamp(type, value) };
	}

	function adjustStat(type, delta) {
		setStat(type, allocate[type] + delta);
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

	function next() {
		if (left > 0) {
			globalThis.$$event('message', ['F_PropertyPointLeft', left]);
			return;
		}
		const { talents, ...rest } = $draft;
		goToScreen('TRAJECTORY', { propertyAllocate: { ...rest, ...allocate }, talents });
	}
</script>

<Screen title={null}>
	<p class="points">Remaining Property: {left}</p>
	<div class="stats">
		{#each STATS as { type, label } (type)}
			<StatRow
				{label}
				value={allocate[type]}
				canDecrease={allocate[type] > allocMin}
				canIncrease={allocate[type] < allocMax && left > 0}
				onincrease={() => adjustStat(type, 1)}
				ondecrease={() => adjustStat(type, -1)}
				onset={v => setStat(type, v)}
			/>
		{/each}
	</div>
	<div class="actions">
		<Button variant="ghost" onclick={randomAllocate}>Random</Button>
		<Button onclick={next}>Start</Button>
	</div>
</Screen>

<style>
	.points {
		font-size: 1.6rem;
		margin: 0;
	}
	.stats {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
</style>
