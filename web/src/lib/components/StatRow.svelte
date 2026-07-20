<script>
	let { label, value, canIncrease, canDecrease, onincrease, ondecrease, onset } = $props();

	function onInput(e) {
		const v = parseInt(e.currentTarget.value, 10);
		onset(Number.isNaN(v) ? 0 : v);
	}

	// The old LayaAir screen only wired this select-all-on-focus behavior to
	// 4 of its 5 stat inputs (Spirit's was missing) because each row was a
	// hand-copy-pasted block. One shared component applies it uniformly.
	function onFocus(e) {
		e.currentTarget.select();
	}
</script>

<div class="row">
	<span class="label">{label}</span>
	<div class="controls">
		<button type="button" class="step" onclick={ondecrease} disabled={!canDecrease} aria-label="Decrease {label}"
			>−</button
		>
		<input
			class="value"
			type="number"
			inputmode="numeric"
			{value}
			oninput={onInput}
			onfocus={onFocus}
			aria-label={label}
		/>
		<button type="button" class="step" onclick={onincrease} disabled={!canIncrease} aria-label="Increase {label}"
			>+</button
		>
	</div>
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
	}
	.label {
		font-size: 1.4rem;
		flex: 1;
		text-align: left;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.step {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		border: 2px solid var(--border);
		background: transparent;
		color: var(--text);
		font-size: 1.4rem;
		line-height: 1;
		cursor: pointer;
	}
	.step:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.step:not(:disabled):hover {
		background: var(--accent);
		border-color: var(--accent);
	}
	.value {
		width: 3.5rem;
		text-align: center;
		font-family: inherit;
		font-size: 1.4rem;
		background: var(--bg-raised);
		color: var(--text);
		border: none;
		border-radius: 0.5rem;
		padding: 0.4em 0;
	}
	.value::-webkit-inner-spin-button,
	.value::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
