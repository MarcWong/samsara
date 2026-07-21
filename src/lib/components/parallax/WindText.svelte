<script>
	// Words drift across the screen like they're being carried on wind --
	// staggered per word so it reads as one gust rather than a typewriter.
	let { text = '', play = false } = $props();
	let words = $derived(text.split(' '));
</script>

{#if play}
	<div class="wind-text" aria-live="polite">
		{#each words as word, i (word + i)}
			<span class="word" style="animation-delay:{i * 160}ms">{word}</span>
		{/each}
	</div>
{/if}

<style>
	.wind-text {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.6ch;
		padding: 0 10vw;
		pointer-events: none;
		z-index: 5;
	}
	.word {
		font-size: clamp(1.6rem, 4vw, 2.8rem);
		font-weight: bold;
		color: #f4efe6;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
		opacity: 0;
		filter: blur(6px);
		animation: gust 2.6s ease-out forwards;
	}
	@keyframes gust {
		0% {
			opacity: 0;
			transform: translateX(-2.5em) skewX(-8deg);
			filter: blur(10px);
		}
		25% {
			opacity: 1;
			filter: blur(0);
		}
		70% {
			opacity: 1;
			transform: translateX(0.3em) skewX(0deg);
			filter: blur(0);
		}
		100% {
			opacity: 0;
			transform: translateX(2.5em) skewX(6deg);
			filter: blur(8px);
		}
	}
</style>
