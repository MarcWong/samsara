<script>
	import Screen from '../components/Screen.svelte';
	import { goToScreen } from '../stores.js';
	import COUNTRIES from '../game/functions/countries.js';

	function choose(code) {
		const nationality = Object.fromEntries(COUNTRIES.map(({ code: c }) => [c, c === code ? 1 : 0]));
		goToScreen('SEXORIENTATION', nationality);
	}
</script>

<Screen>
	<p class="intro">Which country would you choose to be born in?</p>
	<div class="grid">
		{#each COUNTRIES as { code, name } (code)}
			<button class="country" onclick={() => choose(code)}>{name}</button>
		{/each}
	</div>
</Screen>

<style>
	.intro {
		font-size: 1.8rem;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		width: 100%;
	}
	@media (max-width: 30rem) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	.country {
		border: none;
		border-radius: 0.75rem;
		background: var(--bg-raised);
		color: var(--text);
		font-family: inherit;
		font-size: 1.3rem;
		padding: 1.1em 0.75em;
		cursor: pointer;
		transition: background 150ms ease, transform 100ms ease;
	}
	.country:hover {
		background: var(--accent);
	}
	.country:active {
		transform: scale(0.97);
	}
</style>
