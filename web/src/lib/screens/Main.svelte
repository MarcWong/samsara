<script>
	import Screen from '../components/Screen.svelte';
	import Button from '../components/Button.svelte';
	import { goToScreen } from '../stores.js';
</script>

<Screen>
	<Button onclick={() => goToScreen('REBORN')}>Start</Button>
</Screen>
