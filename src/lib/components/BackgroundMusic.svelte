<script>
	// The one continuous audio layer: static/audios/bg.opus, started as early
	// as the browser allows and looped for the rest of the session.
	//
	// Mounted once by +page.svelte alongside VideoStage, and for the same
	// reason: mounting it per-screen would tear the element down and restart
	// the track from zero on every navigation. It also sits outside +page's
	// `{#if ready}` gate so the bed starts during the loading screen rather
	// than waiting on initGame().
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { BG_VOLUME, BG_RAMP_MS, BG_RESTORE_RAMP_MS } from '../audio.js';
	import { bgMusicScale } from '../stores.js';

	let el = $state(null);
	let disarm = null;
	let rampRaf = 0;

	// Ease the element's own volume toward a new level. Plain <audio>.volume
	// (no Web Audio graph) keeps the autoplay-retry path above working exactly
	// as it does -- routing through an AudioContext would add a second thing
	// that needs unblocking by a user gesture, for no gain at one static level
	// change per run.
	function rampTo(target) {
		cancelAnimationFrame(rampRaf);
		if (!el) return;
		const from = el.volume;
		if (Math.abs(target - from) < 0.001) {
			el.volume = target;
			return;
		}
		// Direction picks the duration: ducking has to be done before the clip
		// soundtrack it makes room for gets going (600ms), but the restore on
		// Summary has nothing to hurry for -- a slow 3s swell instead of the
		// music suddenly stepping up. Linear on purpose: perceived loudness of
		// a linear volume ramp already back-loads (equal volume steps sound
		// bigger near the top), which is the swell shape wanted here anyway.
		const ms = target > from ? BG_RESTORE_RAMP_MS : BG_RAMP_MS;
		const t0 = performance.now();
		const step = now => {
			const k = Math.min(1, (now - t0) / ms);
			el.volume = from + (target - from) * k;
			if (k < 1) rampRaf = requestAnimationFrame(step);
		};
		rampRaf = requestAnimationFrame(step);
	}

	// Trajectory's Start click and Summary's arrival drive this. The first run
	// lands the level instantly instead of ramping: it is the initial state,
	// not a change, and $effect ordering against onMount is not something to
	// depend on -- ramping there could otherwise slide down from the element
	// default of 1 and open the page loud.
	let levelApplied = false;
	$effect(() => {
		const target = BG_VOLUME * $bgMusicScale;
		if (!el) return;
		if (!levelApplied) {
			levelApplied = true;
			el.volume = target;
			return;
		}
		rampTo(target);
	});

	onMount(() => {
		el.volume = BG_VOLUME * $bgMusicScale;

		// Autoplay with sound is refused until the page has seen a user
		// gesture. Try immediately anyway (a browser with prior engagement on
		// this origin allows it), and otherwise keep capture-phase listeners
		// armed until a gesture lets a play() through.
		//
		// Unlike CityIntro's one-shot retry these stay armed until playback
		// actually starts, rather than using {once: true}: play() can also
		// reject for reasons that have nothing to do with the gesture (the
		// element still fetching, a decode not ready yet), and a one-shot
		// listener would have spent itself on that failed attempt and left the
		// track silent for the whole session.
		const start = () => {
			el?.play().then(stopArming).catch(() => {});
		};
		const stopArming = () => {
			window.removeEventListener('pointerdown', start, true);
			window.removeEventListener('keydown', start, true);
		};
		window.addEventListener('pointerdown', start, true);
		window.addEventListener('keydown', start, true);
		disarm = stopArming;
		start();
	});

	onDestroy(() => {
		disarm?.();
		cancelAnimationFrame(rampRaf);
		el?.pause();
	});
</script>

<!-- Two encodes of the same 64s bed, first playable one wins. Ogg Opus is the
     smaller, better-sounding master but needs Safari 17.4+; the AAC/m4a
     transcode covers everything older. Each carries an explicit `type` so a
     browser that cannot play Opus skips it on the declared codec instead of
     fetching 1.3 MB to find out. -->
<audio bind:this={el} loop preload="auto">
	<source src="{base}/audios/bg.opus" type="audio/ogg; codecs=opus" />
	<source src="{base}/audios/bg.m4a" type="audio/mp4; codecs=mp4a.40.2" />
</audio>
