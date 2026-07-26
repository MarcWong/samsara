<script>
	import { notifications, dismiss } from '../notify.js';
</script>

<div class="host">
	{#each $notifications as n (n.id)}
		<button type="button" class="toast {n.kind}" onclick={() => dismiss(n.id)}>
			{n.text}
		</button>
	{/each}
</div>

<style>
	.host {
		position: fixed;
		top: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		pointer-events: none;
		width: min(90vw, 32rem);
	}
	.toast {
		pointer-events: auto;
		cursor: pointer;
		background: rgba(34, 40, 49, 0.95);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 0.75rem 1.25rem;
		font-family: inherit;
		font-size: 1.2rem;
		color: inherit;
		text-align: center;
		white-space: pre-line;
		animation: drop 200ms ease;
	}
	.toast.achievement {
		border-color: #84ff55;
		color: #84ff55;
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
