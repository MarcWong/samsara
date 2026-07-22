<script>
	let { onclick, disabled = false, variant = 'primary', children, ...rest } = $props();
</script>

<button class="btn {variant}" {disabled} {onclick} {...rest}>
	{@render children()}
</button>

<style>
	/* "Liquid Glass" pill: a translucent, backdrop-blurred slab with a
	   bright inset highlight along the top edge and a soft inset shadow
	   along the bottom -- the two together read as a convex glass dome
	   catching light from above, the way iOS's current system controls
	   do, rather than a flat tinted rectangle. The tint itself leans on
	   this app's own --accent/--bg-raised blue-greys (not neutral white)
	   so the glass reads as *this UI's* glass, not a generic iOS control
	   pasted on top of a sci-fi scene. Text is uniformly Courier + the
	   same phosphor green used by the CRT terminal screens elsewhere
	   (Plaza's country/orientation pickers), so every clickable surface
	   in the app now shares one accent color instead of blue pills next
	   to green terminal text. */
	.btn {
		position: relative;
		border: 1px solid rgba(238, 238, 238, 0.22);
		border-radius: 999px;
		padding: 0.9em 2em;
		font-family: 'Courier New', Courier, monospace;
		font-size: 1.5rem;
		font-weight: bold;
		letter-spacing: 0.02em;
		color: #39ff6a;
		text-shadow:
			0 0 4px rgba(57, 255, 106, 0.85),
			0 0 12px rgba(57, 255, 106, 0.45);
		cursor: pointer;
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		backdrop-filter: blur(18px) saturate(160%);
		box-shadow:
			0 8px 20px rgba(0, 0, 0, 0.35),
			inset 0 1px 1px rgba(255, 255, 255, 0.4),
			inset 0 -8px 14px rgba(0, 0, 0, 0.22);
		transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease, opacity 150ms ease;
	}
	.btn:active:not(:disabled) {
		transform: scale(0.97);
		box-shadow:
			0 3px 8px rgba(0, 0, 0, 0.3),
			inset 0 1px 1px rgba(255, 255, 255, 0.3),
			inset 0 -4px 8px rgba(0, 0, 0, 0.3);
	}
	.btn:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.primary {
		background: linear-gradient(180deg, rgba(135, 206, 250, 0.32) 0%, rgba(100, 149, 237, 0.22) 45%, rgba(57, 62, 70, 0.4) 100%);
	}
	.primary:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(135, 206, 250, 0.42) 0%, rgba(100, 149, 237, 0.3) 45%, rgba(57, 62, 70, 0.46) 100%);
	}

	.ghost {
		background: linear-gradient(180deg, rgba(238, 238, 238, 0.14) 0%, rgba(57, 62, 70, 0.18) 100%);
	}
	.ghost:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(238, 238, 238, 0.22) 0%, rgba(57, 62, 70, 0.26) 100%);
	}

	.print {
		background: linear-gradient(180deg, rgba(57, 255, 106, 0.16) 0%, rgba(7, 48, 101, 0.4) 55%, rgba(7, 48, 101, 0.55) 100%);
	}
	.print:hover:not(:disabled) {
		background: linear-gradient(180deg, rgba(57, 255, 106, 0.24) 0%, rgba(10, 63, 130, 0.46) 55%, rgba(10, 63, 130, 0.6) 100%);
	}
</style>
