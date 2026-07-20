<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import { goToScreen } from '../stores.js';

	function choose(LBTQ) {
		goToScreen('TALENT', { LBTQ });
	}
</script>

<Screen>
	<p class="intro">What's your choice of sexual orientation?</p>
	<div class="choices">
		<Button onclick={() => choose(0)}>Straight</Button>
		<Button onclick={() => choose(1)}>LBTQ</Button>
	</div>
</Screen>

<style>
	.intro {
		font-size: 1.8rem;
		margin: 0;
	}
	.choices {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
</style>
