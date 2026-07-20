<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import { draft, goToScreen } from '../stores.js';
	import COUNTRIES from '../game/functions/countries.js';

	let country = $derived(COUNTRIES.find(({ code }) => $draft[code] == 1));
	let points = $derived(country?.points ?? 13);
</script>

<Screen>
	<p class="intro">
		You have {points} tokens to allocate into the following 5 categories to restart your life as
		you desire: Wealth, Appearance, IQ, Health, and EQ. Choose carefully!
	</p>
	<Button onclick={() => goToScreen('PROPERTY')}>Continue</Button>
</Screen>

<style>
	.intro {
		font-size: 1.6rem;
		margin: 0;
		line-height: 1.5;
	}
</style>
