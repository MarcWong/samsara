<script>
	import CitySkyboxBackground from '../components/parallax/CitySkyboxBackground.svelte';
	import WindText from '../components/parallax/WindText.svelte';
	import { goToScreen } from '../stores.js';

	let flying = $state(false);
	let showWind = $state(false);

	function start() {
		flying = true;
		showWind = true;
		setTimeout(() => goToScreen('PLAZA'), 2400);
	}
</script>

<CitySkyboxBackground {flying} />
<WindText text="You are reborn today as a female" play={showWind} />

<div class="content" class:hidden={flying}>
	<h1 class="title">♀Samsara</h1>
	<button type="button" class="start" onclick={start}>Start</button>
</div>

<style>
	.content {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 12vh;
		gap: 2rem;
		transition: opacity 600ms ease;
	}
	.content.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.title {
		font-size: clamp(2.5rem, 7vw, 4rem);
		margin: 0;
		text-shadow: 0 2px 16px rgba(0, 0, 0, 0.6);
	}
	.start {
		border: none;
		border-radius: 999px;
		padding: 0.9em 2.5em;
		font-size: 1.5rem;
		font-family: inherit;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
		transition: background 150ms ease, transform 100ms ease;
	}
	.start:hover {
		background: var(--accent-hover);
	}
	.start:active {
		transform: scale(0.97);
	}
</style>
