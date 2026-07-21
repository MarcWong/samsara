<script>
	import ParallaxScene from '../components/parallax/ParallaxScene.svelte';
	import WindText from '../components/parallax/WindText.svelte';
	import { skyline, babelTower, signpost, DUSK_SKY } from '../components/parallax/art.js';
	import { goToScreen } from '../stores.js';

	const layers = [
		{ id: 'sky', depth: 0.05, svg: '', style: `background: ${DUSK_SKY};` },
		{ id: 'skyline-far', depth: 0.15, svg: skyline({ seed: 7, color: '#100f18', height: 460 }), style: 'bottom:0; top:auto; height:60%;' },
		{ id: 'tower', depth: 0.3, svg: babelTower({ color: '#0a0912' }), style: 'bottom:0; top:auto; left:30%; right:30%; height:78%;' },
		{ id: 'skyline-near', depth: 0.45, svg: skyline({ seed: 3, color: '#07070c', height: 340, count: 12 }), style: 'bottom:0; top:auto; height:38%;' },
		{ id: 'signpost', depth: 0.95, svg: signpost({ color: '#050508' }), style: 'bottom:-2%; top:auto; left:38%; right:38%; height:34%;' },
	];

	let flying = $state(false);
	let showWind = $state(false);

	function start() {
		flying = true;
		showWind = true;
		setTimeout(() => goToScreen('PLAZA'), 2400);
	}
</script>

<ParallaxScene {layers} {flying} />
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
