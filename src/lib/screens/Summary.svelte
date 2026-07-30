<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { videoStage } from '../components/videoStage.svelte.js';
	import { loadMp4 } from '../components/videoPlayer.js';
	import { draft, goToScreen, emptyDraft, restartProgress, bgMusicScale } from '../stores.js';
	import Button from '../components/Button.svelte';
	import { core } from '../game/core.js';

	const { summary } = core;
	const types = core.PropertyTypes;

	// `initial` is the starting (post-rebalance) allocation passed through
	// from Trajectory, keyed by the plain stat key -- shown as
	// "initial -> final" per row when available.
	const initial = $draft.initial ?? null;
	// The value after the arrow is the stat AT DEATH, taken from the same
	// core.propertys the trajectory stat bar renders and carrying the same
	// floor at 0, so the two screens cannot disagree. It deliberately is NOT
	// the H* high-water mark: those resolve through util.max, so a life that
	// peaked at Health 7 and died at 0 used to report "4 -> 7" -- an arrow
	// claiming a rise the player had just watched being contradicted. No
	// upper clamp either; the stat bar has none, and capping at 13 would put
	// the two screens back out of step for any stat that ended above it.
	// The grade is re-derived from the death value against the H* judgement
	// table (the only table these stats have) instead of inherited from the peak.
	const property = core.request(core.Module.PROPERTY);
	const finals = core.propertys;
	const ROWS = [
		[types.HMNY, 'Wealth', 'MNY'],
		[types.HCHR, 'Appearance', 'CHR'],
		[types.HINT, 'IQ', 'INT'],
		[types.HSTR, 'Health', 'STR'],
		[types.HSPR, 'Happiness', 'SPR'],
	].map(([type, label, key]) => {
		const value = Math.max(0, finals[types[key]] ?? 0);
		return {
			label,
			value,
			grade: property.judgeOf(type, value).grade,
			start: initial ? initial[key] : null,
		};
	});

	// A drawn talent that never actually fired (its trigger count stays 0)
	// means the trajectory ended -- almost always death -- before that
	// talent's own age/condition was ever reached. Listing it under "Random
	// Events" anyway would claim something happened that never did.
	const talents = ($draft.talents ?? []).filter(talent => core.getTalentCurrentTriggerCount(talent.id) > 0);
	const printText = $draft.printText ?? '';

	// Whether every allocated token went into a single attribute at setup --
	// the "what happens if I dump it all in one stat" trick the rail hint on
	// the allocation panel points at. Once discovered there's nothing left to
	// tip the player toward, so the summary hint only shows for playthroughs
	// that didn't try it. Captured in Trajectory from the player's raw
	// choices, before the free-allocation bonus tops every stat under 5 up
	// to 5 -- deriving this from `initial` itself wouldn't work post-bonus,
	// since every stat reads nonzero regardless of whether the trick fired.
	const triedAllInOneStat = $draft.triedAllInOneStat ?? false;

	// Passed through from Trajectory: the country/orientation chosen at setup
	// and the final *display* age (post AGE-table mapping, i.e. the age the
	// player actually watched themselves die at) -- the raw HAGE property is
	// the internal 0-102 content index, kept only as a fallback.
	const country = $draft.country ?? '';
	const sex = $draft.sex ?? '';
	const age = $draft.age ?? summary[types.HAGE].value;

	// '' entries are deliberate blank lines (not line-wraps -- a bare \n
	// inside one string wouldn't render as a break at all under this
	// screen's default white-space, and wouldn't give a full blank line
	// even with pre-line) -- split into their own array entries instead,
	// which works the same way in both places CREDITS gets rendered: the
	// on-screen {#each} (one <p> per entry, so an empty entry is a blank
	// <p>) and the print window's CREDITS.join('<br>') (an empty entry
	// between two real ones doubles up the <br>).
	const CREDITS = [
		'Lead Direction &',
		'Narrative Design: Yuwei Jiang',
		'Developer & Co-Design: Yao Wang',
		'Audio Design: Guanyu Xie',
		'Built upon the open-source codebase',
		'of LifeRestart by VickScarlet',
		'Contact: sabinajiang0505@outlook.com',
		'© 2022 Yuwei Jiang'
	];

	// Restart Life plays videos/8.mp4 -- a purpose-shot transition clip that
	// opens on drifting cloud/sky (the same look Background.svelte's shader
	// paints behind this screen) and pushes through it into the morgue,
	// ending on 1.mp4's own opening framing. Verified against the source:
	// its last frame matches 1.mp4's first frame (NCC 0.89), so handing off
	// to CITYINTRO at the end is a continuation, not a cut.
	//
	// This replaces an earlier CSS approximation of the same move (a
	// locally-outpainted still scaled 1->2 under a growing radial mask).
	// Measuring 8.mp4 frame-by-frame is what retired it: the real move is a
	// CONSTANT-RATE dolly (~1.096x per second, ~1.9x over the full clip;
	// exponential fit rms 0.023) whereas the CSS version eased in and out on
	// a smoothstep (rms 0.067 against the same data) over only 5s. Playing
	// the clip matches length and zoom exactly rather than approximating
	// them, and drops the fake still entirely.
	//
	//   1. Clicking Restart starts 8.mp4 on the shared VideoStage canvas
	//      (which +page.svelte keeps mounted across screen swaps) and drives
	//      restartProgress 0->1 over the clip's own runtime.
	//   2. The summary panel dissolves early; Background.svelte's shader
	//      clouds cross-fade out over the clip's own opening clouds (see its
	//      reading of restartProgress), so the swap from live shader to
	//      footage happens while both are showing cloud.
	//   3. At completion goToScreen('CITYINTRO') mounts the intro, which
	//      starts 1.mp4 on that same canvas. CanvasVideoPlayer keeps the
	//      previous clip's last frame painted across a switch, so there is
	//      no gap to flash.
	//
	// restartProgress is a shared store rather than local state because
	// Background.svelte -- a sibling under +page.svelte, not a child this
	// screen can pass props into -- reads the same per-frame value.
	const RESTART_CLIP = `${base}/videos/8.mp4`;
	// 8.mp4's final frame sits slightly further back than 1.mp4's opening
	// (the woman reads smaller, the whole frame a touch up-right), so the
	// CITYINTRO handoff showed as a small zoom/position snap. This is the
	// inverse of the affine mismatch measured between those two frames
	// (OpenCV ECC, correlation 0.991, shear ~0.0007 so pure scale+offset
	// holds; NCC across the cut 0.883 -> 0.985 with it applied): ramped IN
	// over the clip's last 1.6s by videoPlayer's alignOut, it plays as the
	// tail of the dolly and the final frame lands exactly on 1.mp4's
	// framing. Only the END matters here -- the clip's opening clouds have
	// no alignment reference, so nothing warps the head.
	const ALIGN_OUT_8 = { kx: 1.0263, ky: 1.0369, ux: -16.6, uy: 12.2, durationMs: 1600 };
	// 8.mp4's exact runtime (169 frames @ 24fps + the tail of the last
	// frame), so the screen switch lands on the clip's final frame rather
	// than cutting it short or holding a frozen frame afterwards.
	const DURATION_MS = 7042;
	let restarting = $state(false);

	// The panel dissolves over the clip's first ~20% (~1.4s), which is the
	// stretch 8.mp4 spends in full cloud before the morgue resolves --
	// measured: the sky layer clears between t=1.0s and t=1.7s.
	let fgOpacity = $derived(1 - Math.min(1, $restartProgress / 0.2));
	let blurPx = $derived(Math.min(1, $restartProgress / 0.2) * 16);

	function onAgain() {
		if (restarting) return;
		restarting = true;
		clearTimeout(idleTimer);

		// The clip itself carries the camera move, so nothing here re-times
		// it -- restartProgress is plain elapsed fraction (NOT eased) and is
		// only used to cross-fade this screen's own layers over the footage.
		// Easing it would desynchronise those fades from the picture.
		if (videoStage.supported) videoStage.play(RESTART_CLIP, { alignOut: ALIGN_OUT_8 }).catch(() => {});
		else videoStage.playFallback(RESTART_CLIP, { muted: true });

		const start = performance.now();
		function tick(now) {
			const t = Math.min(1, (now - start) / DURATION_MS);
			restartProgress.set(t);
			if (t < 1) requestAnimationFrame(tick);
			else {
				draft.set(emptyDraft());
				goToScreen('CITYINTRO');
				// Both consumers of this store (this screen and Background)
				// unmount on the line above -- resetting here means the NEXT
				// life's Summary doesn't inherit a finished transition (fg
				// invisible, clouds faded out) from this one.
				restartProgress.set(0);
			}
		}
		requestAnimationFrame(tick);
	}

	// Kiosk-style idle reset: this screen is a dead end otherwise (no
	// auto-advance the way Trajectory has), so a visitor who walks away
	// without pressing anything would leave the app parked on someone
	// else's finished life indefinitely. A minute with neither button touched
	// triggers the exact same Restart Life flow a click would.
	const IDLE_MS = 60000;
	let idleTimer = null;
	function resetIdleTimer() {
		clearTimeout(idleTimer);
		if (restarting) return;
		idleTimer = setTimeout(onAgain, IDLE_MS);
	}
	onMount(() => {
		// The run is over: bring the background bed back up to full from the
		// level Trajectory ducked it to on Start.
		bgMusicScale.set(1);
		resetIdleTimer();
		// Prefetch+demux the restart clip while the player is still reading
		// the summary, so the click starts playback instead of a network
		// wait. loadMp4 is URL-cached, so onAgain's play() reuses this.
		if (videoStage.supported) loadMp4(RESTART_CLIP).catch(() => {});
		return () => clearTimeout(idleTimer);
	});

	// printText's own header block (built in Trajectory.svelte, before any
	// of this screen's "initial -> final" arrow data existed) only has the
	// starting allocation, e.g. "Family wealth: 5" -- rebuild that block
	// here from ROWS so the print page shows the same before/after arrow
	// the on-screen summary does, then splice back in printText's actual
	// year-by-year story (everything from the first "Year " line on),
	// which is untouched.
	function printHeaderAndStory() {
		const lines = printText.split('\n');
		const storyStart = lines.findIndex(l => l.startsWith('Age: '));
		const story = storyStart === -1 ? [] : lines.slice(storyStart);
		const header = [
			country ? `Country: ${country}` : null,
			sex ? `Sex orientation: ${sex}` : null,
			...ROWS.map(r => `${r.label}: ${r.start != null ? `${r.start} → ${r.value}` : r.value}`),
		].filter(Boolean);
		// '' is a receipt-style dashed tear-line marker between the header
		// block (country/sex/stats) and the story, handled specially below
		// since an empty <p> collapses to no visible height -- a real
		// break needs its own element, not just an empty text line.
		return [...header, '', ...story];
	}
	// Receipt-style dashed tear line, reused between the header/story
	// split and again between the story and the QR codes -- a plain <br>
	// read as an arbitrary gap; an actual rule reads as a deliberate
	// section break, the way a real printed receipt tears between parts.
	const DASHED_LINE = "<div style='border-top: 1px dashed #999; width: 280px; margin: 8px 0;'></div>";
	function onPrintTxt() {
		const win = window.open();
		if (!win) return;
		const txts = printHeaderAndStory();
		win.document.write(
			"<p style='margin: 6px 0; width: 280px; font-size: 14px; font-family:Cascadia Code, Consolas, monospace'>Life Summary @Samsara</p>"
		);
		for (const line of txts) {
			if (line === '') {
				win.document.write(DASHED_LINE);
				continue;
			}
			win.document.write(
				`<p style='margin:3px 0; width: 280px; font-size: 12px; font-family:Cascadia Code, Consolas, monospace'>${line}</p>`
			);
		}
		win.document.write(DASHED_LINE);
		const qrOrigin = `${window.location.origin}${base}/images`;
		const qrs = [
			['qrcode.png', 'Play it at home'],
			['qr-code_ins.png', 'Follow on Instagram'],
			['qr-code_coffee.png', 'Buy us a coffee'],
			['qr-code_discord.png', 'Stay updated on Discord'],
		];
		win.document.write(
			`<div style='margin: 0; width: 280px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;'>${qrs
				.map(
					([file, caption]) =>
						`<div style='width: 130px; text-align: center;'>` +
						`<img src='${qrOrigin}/${file}' style='width: 130px; height: 130px;'>` +
						`<p style='margin: 4px 0 0; font-size: 11px; font-family:Cascadia Code, Consolas, monospace;'>${caption}</p>` +
						`</div>`
				)
				.join('')}</div>`
		);
		win.document.write(
			`<p style='margin: 8px 0 0; width: 280px; font-size: 11px; font-family:Cascadia Code, Consolas, monospace; text-align: center;'>${CREDITS.join('<br>')}</p>`
		);
		win.focus();
		win.document.close();
		win.print();
	}
</script>

<div class="summary-outer">
	<!-- Nothing to render for the restart move itself: 8.mp4 plays on the
	     shared VideoStage canvas that +page.svelte keeps mounted behind
	     every screen (see the staging comment in the script block). This
	     screen only fades its own layers out over it. -->
	<div
		class="summary"
		class:restarting
		style="opacity: {fgOpacity}; filter: blur({blurPx}px);"
	>
		<h1 class="title">♀Samsara</h1>

	<!-- Who this life was: country, orientation, and how long it lasted --
	     laid out like the Trajectory statbar (dim caption above, big value
	     below) so the two screens read as one system. -->
	<div class="idcard">
		{#if country}
			<div class="id">
				<span class="id-label">Country</span>
				<span class="id-value">{country}</span>
			</div>
		{/if}
		{#if sex}
			<div class="id">
				<span class="id-label">Orientation</span>
				<span class="id-value">{sex}</span>
			</div>
		{/if}
		<div class="id">
			<span class="id-label">Lived to</span>
			<span class="id-value">Age {age}</span>
		</div>
	</div>

	<!-- Horizontal band, mirroring the Trajectory statbar: label on top,
	     value below -- five columns across instead of five stacked rows,
	     so the whole page fits a 13" MacBook Air fullscreen untouched. -->
	<div class="rows">
		{#each ROWS as row (row.label)}
			<div class="row grade-{row.grade}">
				<span class="stat-label">{row.label}</span>
				<span class="stat-values">
					{#if row.start != null}
						<span class="stat-start">{row.start}</span>
						<span class="stat-arrow">→</span>
					{/if}
					<span class="stat-value">{row.value}</span>
				</span>
			</div>
		{/each}
	</div>

	{#if talents.length}
		<div class="talents">
			<h2>Random Events</h2>
			<ul>
				{#each talents as talent (talent.id)}
					<li>{talent.name} ({talent.description})</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="actions">
		<Button variant="print" onclick={() => { resetIdleTimer(); onPrintTxt(); }}>Print</Button>
		<Button onclick={() => { onAgain(); resetIdleTimer(); }}>Restart Life</Button>
	</div>

	{#if !triedAllInOneStat}
		<!-- Stays unnumbered even though the bonus is a flat +5 again (see
		     BONUS_AMOUNT in Trajectory.svelte): what varies per country is
		     the TRIGGER, so naming a number here would invite reading it as
		     the threshold rather than the reward. -->
		<p class="hint">Throw all your tokens into one attribute,<br/>get a boost on every stat automatically,<br/>and boom -- you've just unlocked easy mode for life.</p>
	{/if}

	<div class="credits">
		{#each CREDITS as line, i (i)}
			<p>{line}</p>
		{/each}
	</div>
	</div>
</div>

<style>
	/* Recolored to match the 5 intro/trajectory clips' own cool, desaturated
	   teal-blue tone (sampled directly from their footage: darkest shadow
	   ~#0e1c2e, mid stairwell wall ~#2c4a57, pale skylight highlight
	   ~#bcdce8 -- same values now driving Background.svelte's SUMMARY
	   shader palette) instead of the previous warm khaki/parchment scheme,
	   so this final screen reads as part of the same world the player just
	   walked through rather than a differently-lit epilogue. Panel
	   background and dim-caption color are shared with Trajectory's own
	   scoped overrides for the same reason (visual continuity between the
	   two screens that both sit over this footage). Grade accents keep
	   the original's "brightest = best" logic, moved into this same cool
	   family via lightness rather than a warm/cool hue split. */
	.summary {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		padding: 1.75rem 1.5rem 1.25rem;
		color: #dce8ee;
		/* opacity/filter are driven per-frame from $restartProgress
		   (see fgOpacity/blurPx in the script) rather than a CSS
		   transition -- a transition would lag a frame behind and fight the
		   already-smooth rAF-driven values. */
	}
	.summary.restarting {
		pointer-events: none;
	}
	.title {
		font-size: clamp(2rem, 6vw, 3rem);
		margin: 0;
		color: #eef6fa;
		text-shadow: 0 2px 14px rgba(8, 16, 24, 0.6);
	}
	.idcard {
		display: flex;
		/* space-between (not center): now that this box is widened to match
		   .rows's own max-width so the two panels' left/right edges align,
		   staying centered would leave the 3 id items bunched in the middle
		   with idle space at both sides -- spreading them out instead
		   mirrors how .rows's 5 columns already fill their shared width. */
		justify-content: space-between;
		gap: 2.5rem;
		width: 100%;
		max-width: 28rem;
		background: rgba(27, 40, 48, 0.88);
		border-radius: 0.6rem;
		padding: 0.8rem 1.5rem;
	}
	.id {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.id-label {
		font-size: 0.8rem;
		color: #82a0ad;
	}
	.id-value {
		font-size: 1.3rem;
		font-weight: bold;
		color: #e4f0f5;
	}
	.rows {
		display: flex;
		flex-direction: row;
		gap: 0.6rem;
		width: 100%;
		max-width: 28rem;
	}
	.row {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		background: rgba(27, 40, 48, 0.88);
		border-radius: 0.6rem;
		padding: 0.55em 0.5em 0.5em;
		border-top: 3px solid #3f5c68;
	}
	.stat-label {
		font-size: 0.85rem;
		color: #82a0ad;
		white-space: nowrap;
	}
	.stat-values {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}
	.stat-start {
		font-size: 0.95rem;
		color: #82a0ad;
	}
	.stat-arrow {
		font-size: 0.85rem;
		color: #5f7d8a;
	}
	.stat-value {
		font-size: 1.35rem;
		font-weight: bold;
		color: #e4f0f5;
	}
	.row.grade-1 {
		border-top-color: #bfe4f0;
	}
	.row.grade-2 {
		border-top-color: #7fa8b8;
	}
	.row.grade-3 {
		border-top-color: #4a6570;
	}
	.talents {
		width: 100%;
		max-width: 28rem;
		text-align: left;
	}
	.talents h2 {
		font-size: 1.1rem;
		color: #82a0ad;
		margin: 0 0 0.5rem;
		font-weight: normal;
	}
	.talents ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.talents li {
		background: rgba(27, 40, 48, 0.88);
		border-radius: 0.6rem;
		padding: 0.6em 1em;
		color: #ffffff;
		font-size: 1.15rem;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	/* Same treatment .title and .credits already use for text floating
	   straight over the cloud background: a near-opaque light tint plus a
	   dark drop shadow, rather than a flat white dimmed with opacity. At
	   0.6 opacity and no shadow this was washing out completely against
	   the shader's bright cloud-lit patches, which is exactly the failure
	   .credits below documents. Sized up too -- it's the one piece of
	   guidance on this screen, so it shouldn't read smaller than the
	   talent rows beside it. */
	.hint {
		margin: 0;
		font-size: 1.2rem;
		line-height: 1.5;
		color: rgba(238, 246, 250, 0.95);
		text-shadow:
			0 1px 3px rgba(6, 12, 18, 0.9),
			0 2px 12px rgba(6, 12, 18, 0.7);
	}
	/* Pinned to the very bottom of the screen (not just after the hint in
	   normal flow) via margin-top: auto -- .summary is a flex column with
	   min-height: 100dvh, so this eats all the leftover vertical space and
	   sits flush against the bottom edge instead of floating right under
	   the hint on tall viewports. */
	.credits {
		margin-top: auto;
		padding-top: 0.5rem;
		text-align: center;
	}
	.credits p {
		margin: 0.15em 0;
		font-size: 0.7rem;
		/* Higher opacity + a dark drop shadow (same treatment as .title)
		   instead of a faint, nearly-see-through tint -- the old
		   rgba(...,0.55) all but vanished against this screen's bright
		   cloud-lit patches. */
		color: rgba(226, 240, 245, 0.85);
		text-shadow: 0 1px 6px rgba(6, 12, 18, 0.75);
	}

</style>
