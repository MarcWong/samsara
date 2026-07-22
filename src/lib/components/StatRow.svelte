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
	/* Same "Liquid Glass" recipe as the shared Button component (blurred
	   translucent glass, top highlight/bottom shadow for a convex-dome
	   look, Courier + phosphor green) -- these +/- steppers are buttons
	   too, and living right next to Button-driven controls elsewhere in
	   this flow, they read as a mismatched leftover style otherwise. */
	.step {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		border: 1px solid rgba(238, 238, 238, 0.22);
		background: linear-gradient(180deg, rgba(238, 238, 238, 0.16) 0%, rgba(57, 62, 70, 0.22) 100%);
		color: #39ff6a;
		font-family: 'Courier New', Courier, monospace;
		font-size: 1.4rem;
		font-weight: bold;
		line-height: 1;
		cursor: pointer;
		-webkit-backdrop-filter: blur(14px) saturate(160%);
		backdrop-filter: blur(14px) saturate(160%);
		text-shadow:
			0 0 4px rgba(57, 255, 106, 0.85),
			0 0 10px rgba(57, 255, 106, 0.45);
		box-shadow:
			0 4px 10px rgba(0, 0, 0, 0.3),
			inset 0 1px 1px rgba(255, 255, 255, 0.35),
			inset 0 -5px 8px rgba(0, 0, 0, 0.22);
		transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease;
	}
	.step:active:not(:disabled) {
		transform: scale(0.94);
	}
	.step:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.step:not(:disabled):hover {
		background: linear-gradient(180deg, rgba(57, 255, 106, 0.22) 0%, rgba(57, 62, 70, 0.3) 100%);
	}
	.value {
		width: 3.5rem;
		text-align: center;
		font-family: 'Courier New', Courier, monospace;
		font-size: 1.4rem;
		font-weight: bold;
		background: rgba(57, 62, 70, 0.55);
		color: #39ff6a;
		text-shadow: 0 0 4px rgba(57, 255, 106, 0.7);
		border: 1px solid rgba(238, 238, 238, 0.16);
		border-radius: 0.5rem;
		padding: 0.4em 0;
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
	}
	.value::-webkit-inner-spin-button,
	.value::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
