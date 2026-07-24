// Debug-only shortcut: press Space twice quickly (within DOUBLE_TAP_MS) to
// skip whatever's currently auto-playing -- a video clip mid-transition, or
// Trajectory's per-event reading pause -- instead of waiting it out. Not
// wired to any game logic; purely a QA aid for getting through the app's
// several long, unskippable clips and auto-advance timers while testing.
//
// Pub-sub rather than a single global handler: whichever component is
// actively "playing an animation" registers a listener for the duration of
// that playback and unregisters when it's done, so a double-space is a
// no-op whenever nothing's actually mid-playback (e.g. sitting on a loop
// waiting for a click).
const DOUBLE_TAP_MS = 400;
const listeners = new Set();
let lastSpaceAt = 0;

export function onSkip(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

// Svelte action for a plain <video> element (the non-WebCodecs paths):
// on skip, jumps playback to just before the end so the browser's own
// 'ended' event fires within a frame or two -- same net effect as
// CanvasVideoPlayer's skip, without needing a second decode pass since a
// real <video> already supports seeking directly.
export function skippable(node) {
	const off = onSkip(() => {
		// A looping clip (the title ambience) has no "end" to skip to --
		// it's an idle wait for a click, not a blocking animation.
		if (node.paused || node.loop || !Number.isFinite(node.duration)) return;
		node.currentTime = Math.max(0, node.duration - 0.05);
	});
	return { destroy: off };
}

if (typeof window !== 'undefined') {
	window.addEventListener('keydown', e => {
		if (e.code !== 'Space') return;
		// Space is a native activation key for buttons/links -- don't hijack
		// it there, only when nothing interactive has focus.
		const tag = /** @type {HTMLElement} */ (e.target)?.tagName;
		if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA') return;
		const now = performance.now();
		if (now - lastSpaceAt < DOUBLE_TAP_MS) {
			lastSpaceAt = 0;
			e.preventDefault();
			for (const fn of [...listeners]) fn();
		} else {
			lastSpaceAt = now;
		}
	});
}
