<!-- Portrait gate for PHONES: the whole piece is composed inside 16:9
     footage (every overlay is pixel-anchored to the frame -- the allocation
     panel to the stairwell void, the orientation handles to the corridor
     doors), so portrait cover-fit crops the very pixels the UI is anchored
     to. Rather than shipping a degraded portrait layout, phones get a
     full-screen prompt to turn the device.

     Mechanism is pure CSS: the overlay exists in the DOM at all times and a
     media query decides whether it shows. No JS orientation listeners --
     matchMedia churn during rotation is exactly the kind of thing that
     half-applies; a media query re-evaluates atomically with the rotation.

     TABLETS ARE EXEMPT on purpose: a 3:4 slab in portrait only crops ~25%
     of the frame and the stairwell void stays on screen, so the piece is
     playable both ways there. The phone/tablet line is drawn at 600px of
     portrait width -- every mainstream phone's short side is <=480 logical
     px (iPhone Pro Max 430, large Samsungs/Huaweis ~412-480), every
     mainstream tablet's is >=600 (MatePad 600(ish), iPad mini 744, Tab S
     753+). Unfolded foldables land tablet-side, which matches how their
     inner screens are used.

     Known limitation, accepted for v1: the game underneath keeps running
     (auto-advance timers, video playback). The gate is for arriving in
     portrait; rotating mid-run is transient and self-corrects. -->
<div class="rotate-gate" aria-hidden="true">
	<div class="device">
		<div class="screen"></div>
	</div>
	<p class="title">&#9792;Samsara</p>
	<p class="hint">turn your phone sideways&nbsp;&mdash;<br />this life plays out in landscape</p>
</div>

<style>
	.rotate-gate {
		display: none;
		position: fixed;
		inset: 0;
		/* Above everything the app can produce -- NotificationHost and the
		   video overlays stay in the low hundreds. */
		z-index: 10000;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		background: #0b141a;
		color: #cfe7f2;
		text-align: center;
		/* Covers interaction with the game underneath while shown. */
		pointer-events: auto;
		/* Keep the content out of the notch/home-indicator regions. */
		padding: calc(1rem + env(safe-area-inset-top)) calc(1rem + env(safe-area-inset-right))
			calc(1rem + env(safe-area-inset-bottom)) calc(1rem + env(safe-area-inset-left));
	}
	/* Phones only: portrait AND a phone-sized short edge. */
	@media (orientation: portrait) and (max-width: 599px) {
		.rotate-gate {
			display: flex;
		}
	}

	/* A phone outline that tips over on a loop -- says "rotate me" without
	   a word of copy, for players who don't read English. */
	.device {
		width: 3.2rem;
		height: 5.4rem;
		border: 2px solid #cfe7f2;
		border-radius: 0.55rem;
		padding: 0.35rem;
		animation: tip 2.6s ease-in-out infinite;
	}
	.screen {
		width: 100%;
		height: 100%;
		border-radius: 0.25rem;
		background: rgba(207, 231, 242, 0.18);
	}
	@keyframes tip {
		0%,
		15% {
			transform: rotate(0deg);
		}
		45%,
		70% {
			transform: rotate(-90deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	.title {
		margin: 0.4rem 0 0;
		font-size: 1.6rem;
		font-weight: bold;
		letter-spacing: 0.08em;
	}
	.hint {
		margin: 0;
		font-size: 1rem;
		letter-spacing: 0.06em;
		line-height: 1.6;
		color: rgba(207, 231, 242, 0.75);
	}

	@media (prefers-reduced-motion: reduce) {
		.device {
			animation: none;
			transform: rotate(-90deg);
		}
	}
</style>
