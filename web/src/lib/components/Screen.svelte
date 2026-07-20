<script>
	let { title = '♀Samsara', children } = $props();
</script>

<div class="screen">
	{#if title}<h1 class="title">{title}</h1>{/if}
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.screen {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		gap: 2.5rem;
		text-align: center;
	}
	.title {
		font-size: clamp(2.5rem, 7vw, 4rem);
		margin: 0;
		font-weight: bold;
	}
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 40rem;
	}
</style>
