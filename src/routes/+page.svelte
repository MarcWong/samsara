<script>
	import { onMount } from 'svelte';
	import { screen } from '$lib/stores.js';
	import { initGame } from '$lib/game/core.js';
	import { wireNotifications } from '$lib/notify.js';
	import SCREENS from '$lib/screens.js';
	import Background from '$lib/components/Background.svelte';
	import NotificationHost from '$lib/components/NotificationHost.svelte';
	import TransitionFlash from '$lib/components/parallax/TransitionFlash.svelte';

	let ready = $state(false);
	let Current = $derived(SCREENS[$screen]);

	onMount(async () => {
		wireNotifications();
		await initGame();
		ready = true;
	});
</script>

{#if $screen === 'SUMMARY'}
	<Background screen={$screen} />
{/if}

{#if ready}
	<Current />
{:else}
	<div class="loading">♀Samsara</div>
{/if}

{#if ready}
	<TransitionFlash screen={$screen} />
{/if}

<NotificationHost />

<style>
	.loading {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		font-weight: bold;
	}
</style>
