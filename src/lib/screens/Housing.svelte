<script>
	// Consolidates the old SexOrientation -> Talent -> PropertyText -> Property
	// chain into one persistent "housing cluster" scene with two visible
	// steps, so the background doesn't remount/flash between them. The
	// lucky-charm draw (formerly its own Talent screen) now runs silently
	// between the two steps -- same selection logic, verbatim, just no UI.
	import ParallaxScene from '../components/parallax/ParallaxScene.svelte';
	import { skyline, housingCluster, DUSK_SKY } from '../components/parallax/art.js';
	import { countryTone } from '../components/parallax/countryTones.js';
	import Button from '../components/Button.svelte';
	import StatRow from '../components/StatRow.svelte';
	import { draft, goToScreen } from '../stores.js';
	import { core } from '../game/core.js';
	import COUNTRIES from '../game/functions/countries.js';

	const types = core.PropertyTypes;
	const country = COUNTRIES.find(({ code }) => $draft[code] == 1);
	const [silhouette, accent] = countryTone(country?.code);
	const seed = (country?.code?.length ?? 3) * 13;

	const layers = [
		{ id: 'sky', depth: 0.05, svg: '', style: `background: ${DUSK_SKY};` },
		{ id: 'tint', depth: 0.06, svg: '', style: `background: ${accent}; opacity: 0.18; mix-blend-mode: soft-light;` },
		{ id: 'skyline', depth: 0.15, svg: skyline({ seed, color: silhouette, height: 380 }), style: 'bottom:0; top:auto; height:45%;' },
		{ id: 'houses', depth: 0.5, svg: housingCluster({ seed: seed * 2, palette: [silhouette, accent] }), style: 'bottom:0; top:auto; height:40%;' },
	];

	let step = $state('sex');

	// -- step 1: sex orientation --
	function chooseSex(LBTQ) {
		draft.update(d => ({ ...d, LBTQ }));
		drawTalentsSilently();
		step = 'property';
	}

	function drawTalentsSilently() {
		const listTalents = core.talentRandom();
		const selected = new Set();
		while (selected.size < 3) {
			const id = Math.floor(Math.random() * 10);
			if (selected.has(5) && id == 7) continue;
			if (selected.has(7) && id == 5) continue;
			if (!selected.has(id)) selected.add(id);
		}
		const talents = [...selected].map(index => listTalents[index]);
		draft.update(d => ({ ...d, talents }));
	}

	// -- step 2: property allocation (verbatim Property.svelte logic) --
	const STATS = [
		{ type: types.MNY, label: 'Wealth' },
		{ type: types.CHR, label: 'Appearance' },
		{ type: types.INT, label: 'IQ' },
		{ type: types.STR, label: 'Health' },
		{ type: types.SPR, label: 'EQ' },
	];
	const [allocMin, allocMax] = core.propertyAllocateLimit;

	let propertyPoints = $state(0);
	let allocate = $state({ [types.CHR]: 0, [types.INT]: 0, [types.STR]: 0, [types.MNY]: 0, [types.SPR]: 0 });
	let propertyReady = false;

	function enterProperty() {
		if (propertyReady) return;
		propertyReady = true;
		const replace = core.remake($draft.talents.map(t => t.id));
		if (replace.length > 0) {
			globalThis.$$event('message', [replace.map(v => ['F_TalentReplace', v])]);
		}
		propertyPoints = core.getPropertyPoints(country?.points);
	}
	$effect(() => {
		if (step === 'property') enterProperty();
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

	let flying = $state(false);
	function next() {
		if (left > 0) {
			globalThis.$$event('message', ['F_PropertyPointLeft', left]);
			return;
		}
		flying = true;
		const { talents, ...rest } = $draft;
		setTimeout(() => goToScreen('TRAJECTORY', { propertyAllocate: { ...rest, ...allocate }, talents }), 2400);
	}
</script>

<ParallaxScene {layers} {flying} />

<div class="content" class:hidden={flying}>
	{#if step === 'sex'}
		<p class="intro">What's your choice of sexual orientation?</p>
		<div class="choices">
			<Button onclick={() => chooseSex(0)}>Straight</Button>
			<Button onclick={() => chooseSex(1)}>LBTQ</Button>
		</div>
	{:else}
		<p class="intro">
			You have {propertyPoints} tokens to allocate: Wealth, Appearance, IQ, Health, and EQ. Choose carefully.
		</p>
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
	{/if}
</div>

<style>
	.content {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 2rem 1.5rem;
		transition: opacity 600ms ease;
	}
	.content.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.intro {
		font-size: 1.5rem;
		margin: 0;
		text-align: center;
		max-width: 36rem;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
	}
	.points {
		font-size: 1.3rem;
		margin: 0;
	}
	.choices {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.stats {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		width: 100%;
		max-width: 30rem;
		background: rgba(15, 17, 21, 0.5);
		border-radius: 0.75rem;
		padding: 1.5rem;
		backdrop-filter: blur(2px);
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
</style>
