<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import { goToScreen } from '../stores.js';
</script>

<Screen>
	<p class="intro">You are reborn today as a female.</p>
	<Button onclick={() => goToScreen('MODE')}>Continue</Button>
</Screen>

<style>
	.intro {
		font-size: 1.8rem;
		margin: 0;
	}
</style>
