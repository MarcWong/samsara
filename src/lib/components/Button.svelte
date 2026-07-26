<script>
	let { onclick, disabled = false, variant = 'primary', children, ...rest } = $props();
</script>

<button class="btn {variant}" {disabled} {onclick} {...rest}>
	{@render children()}
</button>

<style>
	/* "Liquid Glass" pill, take two: real glass reads by its *highlight*,
	   not just its tint -- a soft, screen-blended gloss cap near the top
	   (the `::before`) is what actually sells "light catching a convex
	   surface," on top of a translucent backdrop-blurred body and a real
	   drop shadow lifting it off the scene behind. mix-blend-mode:screen
	   means that highlight brightens whatever tint is under it rather than
	   washing it out to flat white, so it reads consistently across every
	   variant's own color. The tint itself leans on this app's own
	   --accent/--bg-raised blue-greys (not neutral white) so the glass
	   reads as *this UI's* glass. Text is uniformly Courier + the same
	   phosphor green used by the CRT terminal screens elsewhere, so every
	   clickable surface in the app shares one accent color. */
	.btn {
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.35);
		border-radius: 999px;
		padding: 0.9em 2em;
		font-family: 'Courier New', Courier, monospace;
		font-size: 1.5rem;
		font-weight: bold;
		letter-spacing: 0.02em;
		color: #ffffff;
		text-shadow:
			0 0 4px rgba(255, 255, 255, 0.75),
			0 0 12px rgba(255, 255, 255, 0.35);
		cursor: pointer;
		/* Higher saturate than blur radius -- Apple's Control Center tiles
		   are genuinely see-through (the wallpaper's own colors read
		   through clearly, just softened), not a frosted-over dark panel.
		   Confirmed live against a reference screenshot that the previous
		   pass read as too opaque/tinted; the fix is mostly about the tint
		   layer below being much lower-opacity, not the blur itself. */
		-webkit-backdrop-filter: blur(20px) saturate(200%);
		backdrop-filter: blur(20px) saturate(200%);
		box-shadow:
			0 10px 22px rgba(0, 0, 0, 0.3),
			0 1px 2px rgba(0, 0, 0, 0.35),
			inset 0 1px 1px rgba(255, 255, 255, 0.55),
			inset 0 -10px 16px rgba(0, 0, 0, 0.14),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
		transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease;
	}
	/* The gloss cap: a bright ellipse hugging the top of the pill, blurred
	   and blended so it reads as a reflection sliding across a domed
	   surface rather than a flat highlight bar. */
	.btn::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(
			120% 100% at 50% -20%,
			rgba(255, 255, 255, 0.75) 0%,
			rgba(255, 255, 255, 0.22) 35%,
			rgba(255, 255, 255, 0) 65%
		);
		mix-blend-mode: screen;
		pointer-events: none;
	}
	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow:
			0 14px 26px rgba(0, 0, 0, 0.35),
			0 1px 2px rgba(0, 0, 0, 0.4),
			inset 0 1px 1px rgba(255, 255, 255, 0.65),
			inset 0 -10px 16px rgba(0, 0, 0, 0.14),
			inset 0 0 0 1px rgba(255, 255, 255, 0.12);
	}
	.btn:active:not(:disabled) {
		transform: scale(0.97) translateY(0);
		box-shadow:
			0 4px 10px rgba(0, 0, 0, 0.28),
			inset 0 1px 1px rgba(255, 255, 255, 0.4),
			inset 0 -5px 8px rgba(0, 0, 0, 0.18),
			inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}
	.btn:disabled {
		cursor: default;
		opacity: 0.4;
	}

	/* Tint layers dropped to roughly a third of the previous opacity --
	   these exist only to give each variant its own color identity, the
	   same way Apple's tiles read blue/orange/red depending on what's
	   behind them; the actual "glass" body is the backdrop-filter above,
	   which does the real seeing-through. */
	.primary {
		background: linear-gradient(180deg, rgba(135, 206, 250, 0.14) 0%, rgba(100, 149, 237, 0.09) 45%, rgba(57, 62, 70, 0.16) 100%);
	}
	.primary:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(135, 206, 250, 0.2) 0%, rgba(100, 149, 237, 0.13) 45%, rgba(57, 62, 70, 0.2) 100%);
	}

	.ghost {
		background: linear-gradient(180deg, rgba(238, 238, 238, 0.06) 0%, rgba(57, 62, 70, 0.08) 100%);
	}
	.ghost:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(238, 238, 238, 0.1) 0%, rgba(57, 62, 70, 0.12) 100%);
	}

	.print {
		background: linear-gradient(180deg, rgba(57, 255, 106, 0.08) 0%, rgba(7, 48, 101, 0.18) 55%, rgba(7, 48, 101, 0.24) 100%);
	}
	.print:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(57, 255, 106, 0.12) 0%, rgba(10, 63, 130, 0.22) 55%, rgba(10, 63, 130, 0.28) 100%);
	}
</style>
