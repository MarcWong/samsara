<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import { goToScreen } from '../stores.js';
	import { core } from '../game/core.js';

	let drawnTalents = $state(null);

	function drawTalents() {
		const listTalents = core.talentRandom();
		const selected = new Set();
		// listTalents holds every grade-0 talent; index 5 and 7 are a specific
		// pair the original game never lets land together (see talent.js's
		// content for why — the two overlap thematically). Ported verbatim.
		while (selected.size < 3) {
			const id = Math.floor(Math.random() * 10);
			if (selected.has(5) && id == 7) continue;
			if (selected.has(7) && id == 5) continue;
			if (!selected.has(id)) selected.add(id);
		}
		return [...selected].map(index => listTalents[index]);
	}

	function onClickDrawCard() {
		if (drawnTalents) {
			goToScreen('PROPERTYTEXT', { talents: drawnTalents });
			return;
		}
		drawnTalents = drawTalents();
	}
</script>

<Screen>
	{#if drawnTalents}
		<ul class="talents">
			{#each drawnTalents as talent (talent.id)}
				<li>{talent.name}</li>
			{/each}
		</ul>
	{:else}
		<p class="intro">Draw three lucky charms to carry into this life.</p>
	{/if}
	<Button onclick={onClickDrawCard}>{drawnTalents ? 'Continue' : 'Draw Cards'}</Button>
</Screen>

<style>
	.intro {
		font-size: 1.8rem;
		margin: 0;
	}
	.talents {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 1.6rem;
	}
	.talents li {
		background: var(--bg-raised);
		border-radius: 0.75rem;
		padding: 0.75em 1.25em;
	}
</style>
