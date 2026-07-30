// One canvas + one CanvasVideoPlayer, shared by every screen that plays a
// clip from videos/ (CityIntro, Trajectory's StairwellBackground). It's
// attached exactly once, by VideoStage.svelte, which +page.svelte renders
// unconditionally so it's never torn down while the app runs -- previously
// each screen created its own canvas + player, so every screen swap
// destroyed the outgoing one and started the incoming one from a blank
// slate. That gap (nothing painted until the new canvas's first frame
// decoded) was the actual black-flash bug: the two screens' frames were
// pixel-identical by design, but the canvas holding them was not the same
// object, so there was a real moment with nothing to show. Routing every
// screen's playback through this one shared instance means the same
// decoder just keeps going across screen boundaries -- nothing is ever
// destroyed at the seam, so there's nothing to flash.
import { webCodecsSupported, loadMp4, CanvasVideoPlayer } from './videoPlayer.js';

const supported = webCodecsSupported();

class VideoStage {
	#canvas = null;
	#stageEl = null;
	#player = null;
	#resizeObserver = null;

	// Fallback (<video>) path reactive state -- VideoStage.svelte's single
	// <video> element reacts to this via an $effect (load + play whenever
	// `key` changes), the same way each screen used to drive its own
	// element directly.
	fallback = $state({ src: '', loop: false, rate: 1, muted: false, key: 0 });
	#fallbackOnEnded = null;

	get supported() {
		return supported;
	}

	attach(canvasEl, stageEl) {
		this.#canvas = canvasEl;
		this.#stageEl = stageEl;
		if (!supported) return;
		this.#player = new CanvasVideoPlayer(canvasEl);
		this.#resizeObserver = new ResizeObserver(() => this.#resize());
		this.#resizeObserver.observe(stageEl);
		this.#resize();
	}

	#resize() {
		if (!this.#stageEl || !this.#canvas || !this.#player) return;
		const w = this.#stageEl.clientWidth;
		const h = this.#stageEl.clientHeight;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.#canvas.width = Math.round(w * dpr);
		this.#canvas.height = Math.round(h * dpr);
		this.#player.redraw(); // resizing clears the canvas -- repaint current frame
	}

	// Loads (via videoPlayer.js's shared URL cache) and plays a clip on the
	// shared canvas. Rejects if this clip fails to fetch/demux; callers keep
	// their existing catch-and-degrade behavior.
	async play(url, { loop = false, onEnded = null, rate = 1, align = null, alignOut = null } = {}) {
		const media = await loadMp4(url);
		this.#player.play(media, { loop, onEnded, rate, align, alignOut });
	}

	// Fallback path: update the shared <video>'s reactive props. `key`
	// always increments so VideoStage.svelte's $effect reruns even if a
	// screen ever plays the same URL twice in a row.
	playFallback(url, { loop = false, rate = 1, muted = false, onEnded = null } = {}) {
		this.#fallbackOnEnded = onEnded;
		this.fallback = { src: url, loop, rate, muted, key: this.fallback.key + 1 };
	}

	fallbackEnded() {
		this.#fallbackOnEnded?.();
	}

	stop() {
		this.#player?.stop();
	}

	detach() {
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
		this.#player?.stop();
		this.#player = null;
	}
}

export const videoStage = new VideoStage();
