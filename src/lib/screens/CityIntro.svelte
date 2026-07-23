<script>
	// The 3D city panorama (CitySkyboxBackground) is gone -- the intro is
	// now pure video, custom-rendered through WebCodecs onto a canvas (see
	// videoPlayer.js for why not a plain <video>):
	//
	//   1. videos/1.mp4 loops full-screen as the title backdrop.
	//   2. First click anywhere: videos/2.mp4 plays once (2.mp4 was
	//      pre-fetched and pre-demuxed during the loop, so the switch is
	//      seamless -- the canvas holds 1.mp4's current frame until 2.mp4's
	//      first frame lands).
	//   3. The clip freezes on its own final frame -- under WebCodecs we
	//      simply stop presenting new frames, so the freeze is exact.
	//   4. Second click anywhere: on to the computer / country selection.
	//
	// Browsers without WebCodecs fall back to a native <video> driving the
	// same click state machine (with the browser's own last-frame behavior,
	// which is the best available there).
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { goToScreen } from '../stores.js';
	import { CanvasVideoPlayer, loadMp4, webCodecsSupported } from '../components/videoPlayer.js';
	import COUNTRIES from '../game/functions/countries.js';

	const supported = webCodecsSupported();

	// The title loop (1.mp4) plays at half speed -- applied to the WebCodecs
	// presentation clock, its audio track, and the <video> fallback alike.
	// The transition clips (2.mp4, 3.mp4) stay at normal speed.
	const LOOP_RATE = 0.5;

	// All three clips share this frame size; the country overlay maps onto
	// 3.mp4's final frame through the same cover-fit math the canvas uses.
	const VIDEO_W = 1280;
	const VIDEO_H = 720;

	// 3.mp4 ends on a morgue wall of cabinet doors: 5 full door columns
	// across, 3 door rows down, with the center door of the third row
	// standing open (black) -- that cell stays empty. The 12 countries sit
	// on the doors alphabetically, reading left-to-right, top-to-bottom:
	// 3 on the top row (inner columns), 5 across the middle, 4 on the
	// bottom row skipping the open door -- all mirror-symmetric about the
	// frame's vertical centerline. Coordinates are percentages of the
	// 1280x720 frame, measured off the final frame's door centers.
	const DOOR_COLS = [19.2, 34.7, 50, 65.3, 80.8];
	const DOOR_ROWS = [10.4, 30.8, 51.7];
	const DOOR_SLOTS = [
		[1, 0], [2, 0], [3, 0],
		[0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
		[0, 2], [1, 2], [3, 2], [4, 2], // [2, 2] is the open black cabinet
	];
	const COUNTRY_CELLS = [...COUNTRIES]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(({ code, name }, i) => ({
			code,
			name,
			x: DOOR_COLS[DOOR_SLOTS[i][0]],
			y: DOOR_ROWS[DOOR_SLOTS[i][1]],
		}));

	let canvasEl;
	let containerEl;
	let videoEl = $state(null); // fallback path only
	// The WebCodecs path renders video only, so the clips' AAC tracks play
	// through plain <audio> elements alongside the canvas (frame-exact sync
	// isn't needed for ambience; both start together on the same click).
	let audio1El = $state(null);
	let audio2El = $state(null);
	let audio3El = $state(null);

	let player = null;
	let media2Promise = null;
	let media3Promise = null;
	let resizeObserver;

	// 'loading' -> 'loop' -> 'transition' -> 'frozen' -> 'morgue' -> 'select'
	let phase = $state('loading');
	let videoSrc = $state(`${base}/videos/1.mp4`);
	let videoLoop = $state(true);

	// Container size, tracked so the country overlay can be pinned to the
	// exact cover-fit rectangle the video occupies on screen -- the door
	// percentages above are in video space, not viewport space.
	let cw = $state(0);
	let ch = $state(0);
	let overlayStyle = $derived.by(() => {
		if (!cw || !ch) return 'display: none;';
		const s = Math.max(cw / VIDEO_W, ch / VIDEO_H);
		const dw = VIDEO_W * s;
		const dh = VIDEO_H * s;
		return `left: ${(cw - dw) / 2}px; top: ${(ch - dh) / 2}px; width: ${dw}px; height: ${dh}px;`;
	});

	onMount(() => {
		if (!supported) {
			phase = 'loop';
			if (videoEl) videoEl.playbackRate = LOOP_RATE;
			return;
		}

		player = new CanvasVideoPlayer(canvasEl);
		resizeObserver = new ResizeObserver(() => {
			cw = containerEl.clientWidth;
			ch = containerEl.clientHeight;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvasEl.width = Math.round(cw * dpr);
			canvasEl.height = Math.round(ch * dpr);
			player.redraw(); // resizing clears the canvas; repaint current frame
		});
		resizeObserver.observe(containerEl);

		(async () => {
			try {
				const media1 = await loadMp4(`${base}/videos/1.mp4`);
				// Fetch + demux the later clips in the background while the
				// loop plays, so each click switches instantly.
				media2Promise = loadMp4(`${base}/videos/2.mp4`);
				media2Promise.catch(() => {}); // surfaced on click instead
				media3Promise = loadMp4(`${base}/videos/3.mp4`);
				media3Promise.catch(() => {});
				player.play(media1, { loop: true, rate: LOOP_RATE });
				phase = 'loop';
				startLoopAudio();
			} catch (err) {
				// Broken/missing video shouldn't dead-end the whole game --
				// fall straight to the frozen state, where a click advances.
				console.error('[CityIntro] intro video failed', err);
				phase = 'frozen';
			}
		})();
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		player?.stop();
		audio1El?.pause();
		audio2El?.pause();
	});

	// Unmuted autoplay is blocked by every modern browser until the page
	// has seen a user gesture -- try anyway (browsers with prior engagement
	// or relaxed policy will allow it), and if refused, retry on the first
	// pointer/key gesture. pointerdown fires before click, so even when
	// that same gesture is the click that advances to the transition clip,
	// the retry resolves against the right phase.
	function startLoopAudio() {
		if (!audio1El) return;
		audio1El.playbackRate = LOOP_RATE;
		audio1El.play().catch(() => {
			const resume = () => {
				if (phase === 'loop') audio1El?.play().catch(() => {});
			};
			window.addEventListener('pointerdown', resume, { once: true, capture: true });
			window.addEventListener('keydown', resume, { once: true, capture: true });
		});
	}

	async function advance() {
		if (phase === 'loop') {
			phase = 'transition';
			// Running inside a click handler, so unmuted playback is
			// always permitted from here on.
			audio1El?.pause();
			if (audio2El) {
				audio2El.currentTime = 0;
				audio2El.play().catch(() => {});
			}
			if (supported) {
				try {
					const media2 = await media2Promise;
					player.play(media2, {
						loop: false,
						onEnded: () => {
							phase = 'frozen';
						},
					});
				} catch (err) {
					console.error('[CityIntro] transition video failed', err);
					phase = 'frozen';
				}
			} else {
				videoLoop = false;
				videoSrc = `${base}/videos/2.mp4`;
				// src swap needs an explicit load+play on the same element;
				// unmuting is allowed now that a real click happened.
				videoEl?.load();
				if (videoEl) {
					videoEl.muted = false;
					// load() resets playbackRate -- 2.mp4 runs at normal speed
					videoEl.playbackRate = 1;
				}
				videoEl?.play().catch(() => {});
			}
		} else if (phase === 'frozen') {
			// End of 2.mp4: the click rolls 3.mp4 (the morgue wall), whose
			// final frame becomes the country-selection screen -- replacing
			// the computer's own country list entirely.
			phase = 'morgue';
			if (audio3El) {
				audio3El.currentTime = 0;
				audio3El.play().catch(() => {});
			}
			if (supported) {
				try {
					const media3 = await media3Promise;
					player.play(media3, {
						loop: false,
						onEnded: () => {
							phase = 'select';
						},
					});
				} catch (err) {
					console.error('[CityIntro] morgue video failed', err);
					phase = 'select';
				}
			} else {
				videoLoop = false;
				videoSrc = `${base}/videos/3.mp4`;
				videoEl?.load();
				if (videoEl) {
					videoEl.muted = false;
					videoEl.playbackRate = 1;
				}
				videoEl?.play().catch(() => {});
			}
		}
		// clicks during 'loading'/'transition'/'morgue'/'select' are ignored
	}

	function selectCountry(code) {
		if (phase !== 'select') return;
		goToScreen('PLAZA', { countryCode: code });
	}

	function onKeydown(e) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			advance();
		}
	}
</script>

<div
	class="intro"
	class:clickable={phase === 'loop' || phase === 'frozen'}
	bind:this={containerEl}
	onclick={advance}
	onkeydown={onKeydown}
	role="button"
	tabindex="0"
>
	{#if supported}
		<canvas bind:this={canvasEl}></canvas>
		<audio bind:this={audio1El} src="{base}/videos/1.mp4" loop preload="auto"></audio>
		<audio bind:this={audio2El} src="{base}/videos/2.mp4" preload="auto"></audio>
		<audio bind:this={audio3El} src="{base}/videos/3.mp4" preload="auto"></audio>
	{:else}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={videoEl}
			src={videoSrc}
			loop={videoLoop}
			autoplay
			muted
			playsinline
			onended={() => (phase = phase === 'morgue' ? 'select' : 'frozen')}
		></video>
	{/if}

	{#if phase === 'select'}
		<!-- Pinned to the video's cover-fit rectangle so each name lands on
		     its cabinet door regardless of viewport shape. Same type
		     treatment as the title screen's "click anywhere to begin". -->
		<div class="select-overlay" style={overlayStyle}>
			{#each COUNTRY_CELLS as { code, name, x, y } (code)}
				<button
					type="button"
					class="cell"
					style="left: {x}%; top: {y}%;"
					onclick={e => {
						e.stopPropagation();
						selectCountry(code);
					}}
				>
					<span class="cell-label">{name}</span>
				</button>
			{/each}
			<!-- The prompt lies "painted" on the morgue floor: a perspective
			     transform pitches the text block back into the floor plane
			     (the shot is one-point perspective, straight at the wall, so
			     a centered symmetric trapezoid reads correctly), and a
			     failing-fluorescent flicker animates it. -->
			<div class="floor-text" aria-hidden="true">
				Which country would you<br />choose to be born in?
			</div>
		</div>
	{/if}

	<div class="content" class:hidden={phase !== 'loop'}>
		<h1 class="title">♀Samsara</h1>
		<p class="hint">click anywhere to begin</p>
	</div>

	{#if phase === 'frozen'}
		<!-- 2.mp4's own baked-in final frame reads "You are reborn today as
		     a female" -- this sits just below it, same type treatment as
		     .hint, so the two read as one continuous piece of UI. -->
		<p class="continue-hint">continue</p>
	{/if}
</div>

<style>
	.intro {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #000;
		outline: none;
	}
	.intro.clickable {
		cursor: pointer;
	}
	canvas,
	video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	video {
		object-fit: cover;
	}

	.content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 12vh;
		gap: 1rem;
		pointer-events: none;
		transition: opacity 600ms ease;
	}
	.content.hidden {
		opacity: 0;
	}
	.title {
		font-size: clamp(2.5rem, 7vw, 4rem);
		margin: 0;
		text-shadow: 0 2px 16px rgba(0, 0, 0, 0.6);
	}
	.hint {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.75);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
		animation: pulse 2.4s ease-in-out infinite;
	}

	/* Same type treatment as .hint (family/tracking/color/shadow inherited,
	   same breathing pulse) -- sits low, under 2.mp4's own baked-in text,
	   rather than in .content's flex column (which is only laid out for
	   the loop phase's title). */
	.continue-hint {
		position: absolute;
		left: 50%;
		bottom: 14%;
		transform: translateX(-50%);
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.75);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
		animation: pulse 2.4s ease-in-out infinite;
	}

	.select-overlay {
		position: absolute;
		pointer-events: none;
		animation: fade-in 900ms ease both;
		/* Lets children size themselves in cq units, i.e. relative to the
		   video's drawn rectangle -- the floor text must scale with the
		   footage, unlike the fixed-rem door labels. */
		container-type: size;
	}
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	/* Same type family/tracking as .hint, one size up, engraved into a
	   brushed silver-grey metal nameplate riveted to each door -- matching
	   the small blank label plates the doors already carry. */
	/* Every plate is the same fixed size, sized to fit the longest country
	   name ("Afghanistan" / "North Korea", both 11 characters) -- per the
	   reference sketch, shorter names center within that same frame
	   rather than each plate shrink-wrapping its own text. The plate is
	   two nested rectangles (outer bezel + inner engraved label), matching
	   the sketch's double-border look; the brushed-steel gradient/bevel
	   from the door hardware carries over unchanged. */
	.cell {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Width comes from .cell-label's own fixed width below, plus this
		   padding as a uniform outer bezel margin -- letting the label set
		   the size (rather than fixing it here too and having the two
		   paddings compound) is what was clipping "Afghanistan"/"North
		   Korea" before. */
		padding: 0.4em 0.45em;
		cursor: pointer;
		font-family: inherit;
		background: linear-gradient(180deg, #e2e5e8 0%, #b9bec3 45%, #9aa0a6 55%, #c7cbd0 100%);
		border: 1px solid rgba(60, 65, 70, 0.55);
		border-radius: 3px;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			inset 0 -1px 2px rgba(0, 0, 0, 0.25);
		transition: filter 150ms ease;
	}
	.cell:hover {
		filter: brightness(1.12);
	}
	.cell-label {
		display: block;
		/* Sized to the longest name at this font/letter-spacing (measured
		   live: "Afghanistan"/"North Korea" need ~14ch of box, not the 13ch
		   originally guessed) with headroom, and no clipping (overflow
		   visible) as a backstop even if a longer name is ever added. */
		width: 15ch;
		text-align: center;
		padding: 0.2em 0.3em;
		font-size: 1rem;
		letter-spacing: 0.12em;
		white-space: nowrap;
		overflow: visible;
		color: #2e3338;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
		border: 1px solid rgba(50, 55, 60, 0.5);
		border-radius: 1px;
		background: rgba(255, 255, 255, 0.15);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	/* "Painted on the floor": pitched back into the ground plane via a
	   perspective rotateX -- the shot looks straight at the wall
	   (one-point perspective, centered vanishing point), so a symmetric
	   floor trapezoid is the correct projection. Sized in cq units so it
	   scales with the footage; same type family/tracking as the hint. */
	.floor-text {
		position: absolute;
		left: 50%;
		top: 85%;
		width: max-content;
		transform: translate(-50%, -50%) perspective(6em) rotateX(48deg);
		font-size: 4.1cqh;
		line-height: 1.6;
		letter-spacing: 0.12em;
		text-align: center;
		color: rgba(255, 255, 255, 0.85);
		text-shadow:
			0 0 0.4em rgba(180, 210, 230, 0.6),
			0 1px 8px rgba(0, 0, 0, 0.8);
		animation: floor-flicker 4s linear infinite;
	}
	/* Failing-fluorescent flicker: mostly steady, with two short bursts of
	   irregular dropouts per cycle. */
	@keyframes floor-flicker {
		0%,
		100% {
			opacity: 1;
		}
		6% {
			opacity: 1;
		}
		7% {
			opacity: 0.25;
		}
		8% {
			opacity: 0.9;
		}
		9% {
			opacity: 0.35;
		}
		10% {
			opacity: 1;
		}
		54% {
			opacity: 1;
		}
		55% {
			opacity: 0.4;
		}
		56% {
			opacity: 0.95;
		}
		58% {
			opacity: 0.3;
		}
		60% {
			opacity: 1;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.45;
		}
		50% {
			opacity: 1;
		}
	}
</style>
