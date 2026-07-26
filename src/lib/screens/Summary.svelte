<script>
	import { base } from '$app/paths';
	import { videoStage } from '../components/videoStage.svelte.js';
	import { draft, goToScreen, emptyDraft, restartProgress } from '../stores.js';
	import Button from '../components/Button.svelte';
	import { core } from '../game/core.js';

	const { summary } = core;
	const types = core.PropertyTypes;

	// `initial` is the starting (post-rebalance) allocation passed through
	// from Trajectory, keyed by the plain stat key -- shown as
	// "initial -> final" per row when available.
	const initial = $draft.initial ?? null;
	const ROWS = [
		[types.HMNY, 'Wealth', 'MNY'],
		[types.HCHR, 'Appearance', 'CHR'],
		[types.HINT, 'IQ', 'INT'],
		[types.HSTR, 'Health', 'STR'],
		[types.HSPR, 'EQ', 'SPR'],
	].map(([type, label, key]) => {
		const data = summary[type];
		return {
			label,
			value: data.value > 13 ? 13 : data.value,
			grade: data.grade,
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

	// Restart Life, staged as one continuous ~5s camera move:
	//
	//   1. The reveal layer underneath everything is a STILL -- an
	//      "extreme long shot" built by outpainting 1.mp4's own first
	//      frame (static/images/intro-longshot.png, 2560x1440: the real
	//      1280x720 frame feathered into a blurred, darkened 2x surround,
	//      so the morgue reads as a small lit pocket inside a much larger
	//      dark expanse).
	//   2. Clicking Restart drives restartProgress 0->1 over DURATION_MS.
	//      The camera pushes in the whole time (scale 1 -> 2 on that
	//      still; at exactly 2x, the outpainted image's central region --
	//      the true first frame of 1.mp4 -- fills the viewport, matching
	//      the framing CityIntro opens on).
	//   3. Simultaneously the cloud layer disperses from the CENTER
	//      outward: the reveal still carries a radial mask whose opaque
	//      center disc grows from nothing until it passes the corners, so
	//      Background.svelte's drifting shader clouds (kept fully opaque
	//      underneath, scaling gently outward -- see its own reading of
	//      restartProgress) are swallowed edge-ward and finally slip off
	//      the frame borders.
	//   4. Near the end the shared VideoStage canvas quietly starts 1.mp4
	//      (cached since the intro), so when goToScreen('CITYINTRO') fires
	//      at completion the loop is already painting underneath -- the
	//      push-in's final frame IS 1.mp4's first frame, and playback
	//      continues from there with nothing to flash.
	//
	// restartProgress is a shared store rather than local state because
	// Background.svelte -- a sibling under +page.svelte, not a child this
	// screen can pass props into -- reads the same per-frame value.
	const DURATION_MS = 5000;
	let restarting = $state(false);

	// Derived purely from $restartProgress (already eased -- see the
	// smoothstep in onAgain below) so every visual reads off one number.
	// Foreground summary panel dissolves early (gone by ~35%) so the rest
	// of the move plays out over the clouds alone.
	let fgOpacity = $derived(1 - Math.min(1, $restartProgress / 0.35));
	let blurPx = $derived(Math.min(1, $restartProgress / 0.35) * 16);
	// The push-in: 1 -> 2. At 2x the outpainted still's central 1280x720
	// region (1.mp4's actual first frame) exactly fills the viewport.
	let pushScale = $derived(1 + $restartProgress);
	// Dispersal disc: radius 0% -> 155% of the viewport's larger half-axis
	// (needs to pass ~71% to reach the corners, plus the feather width, so
	// 155% guarantees the soft edge itself has fully left the frame).
	let discR = $derived($restartProgress * 155);
	let revealMask = $derived(
		`radial-gradient(circle at center, black ${Math.max(0, discR - 18)}%, transparent ${discR}%)`
	);

	let prerollStarted = false;
	$effect(() => {
		// Pre-roll 1.mp4 on the shared VideoStage during the last stretch of
		// the push-in (still fully hidden under the reveal still), so the
		// canvas underneath is already painting the loop when the screen
		// switches -- loadMp4's cache makes this a decoder spin-up only.
		if ($restartProgress >= 0.9 && !prerollStarted) {
			prerollStarted = true;
			videoStage.play(`${base}/videos/1.mp4`, { loop: true, rate: 0.5 }).catch(() => {});
		}
	});

	function onAgain() {
		if (restarting) return;
		restarting = true;
		const start = performance.now();
		function tick(now) {
			const t = Math.min(1, (now - start) / DURATION_MS);
			restartProgress.set(t * t * (3 - 2 * t)); // smoothstep
			if (t < 1) requestAnimationFrame(tick);
			else {
				draft.set(emptyDraft());
				goToScreen('CITYINTRO');
				// Both consumers of this store (this screen and Background)
				// unmount on the line above -- resetting here means the NEXT
				// life's Summary doesn't inherit a finished transition (fg
				// invisible, clouds scaled out) from this one.
				restartProgress.set(0);
			}
		}
		requestAnimationFrame(tick);
	}

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
	<!-- The extreme-long-shot still the restart camera pushes into (see the
	     staging comment in the script block). Hidden entirely at rest (the
	     mask disc has zero radius until Restart drives it), so it costs
	     nothing while the summary is just being read. -->
	{#if restarting}
		<img
			class="reveal-shot"
			src="{base}/images/intro-longshot.png"
			alt=""
			style="transform: scale({pushScale}); mask-image: {revealMask}; -webkit-mask-image: {revealMask};"
		/>
	{/if}

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
		<Button variant="print" onclick={onPrintTxt}>Print</Button>
		<Button onclick={onAgain}>Restart Life</Button>
	</div>

	{#if !triedAllInOneStat}
		<p class="hint">Throw all your tokens into one attribute,<br/>get +5 on all stats automatically,<br/>and boom -- you've just unlocked easy mode for life.</p>
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
	.hint {
		margin: 0;
		font-size: 1.15rem;
		color: #ffffff;
		opacity: 0.6;
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

	/* The outpainted long-shot still. z-index -1 keeps it just above
	   Background.svelte's shader canvas (also -1, but earlier in the DOM,
	   so it paints first/lower) and below .summary -- the growing radial
	   mask (inline, driven from restartProgress) is what actually reveals
	   it from the center outward over the clouds, and the inline scale is
	   the camera push. object-fit: cover maps the 2560x1440 still onto the
	   viewport exactly the way the canvas cover-fits 1.mp4, so the 2x
	   push's endpoint lines up with the clip's own framing on every
	   aspect ratio. */
	.reveal-shot {
		position: fixed;
		inset: 0;
		z-index: -1;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* The push must expand from the frame's center -- the same origin
		   the dispersal disc opens from. */
		transform-origin: center center;
	}
</style>
