<script>
	let { onclick, disabled = false, variant = 'primary', children, ...rest } = $props();
</script>

<button class="btn {variant}" {disabled} {onclick} {...rest}>
	{@render children()}
</button>

<style>
	.btn {
		border: none;
		border-radius: 999px;
		padding: 0.9em 2em;
		font-size: 1.5rem;
		cursor: pointer;
		transition: background 150ms ease, transform 100ms ease, opacity 150ms ease;
	}
	.btn:active:not(:disabled) {
		transform: scale(0.97);
	}
	.btn:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.primary {
		background: var(--accent);
		color: #ffffff;
	}
	.primary:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.ghost {
		background: transparent;
		color: var(--text);
		border: 2px solid var(--border);
	}
	.ghost:hover:not(:disabled) {
		background: rgba(238, 238, 238, 0.1);
	}

	.print {
		background: #073065;
		color: #3ec103;
	}
	.print:hover:not(:disabled) {
		background: #0a3f82;
	}
</style>
