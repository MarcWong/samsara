<script>
	import { base } from '$app/paths';
	import { draft } from '../stores.js';
	import Button from '../components/Button.svelte';
	import { core } from '../game/core.js';

	const { summary } = core;
	const types = core.PropertyTypes;

	// Already in the Wealth/Appearance/IQ/Health/EQ order from this session's
	// earlier ordering pass -- ported as-is.
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

	// Passed through from Trajectory: the country/orientation chosen at setup
	// and the final *display* age (post AGE-table mapping, i.e. the age the
	// player actually watched themselves die at) -- the raw HAGE property is
	// the internal 0-102 content index, kept only as a fallback.
	const country = $draft.country ?? '';
	const sex = $draft.sex ?? '';
	const age = $draft.age ?? summary[types.HAGE].value;

	const CREDITS = [
		'Lead Direction and Narrative Design: Yuwei Jiang',
		'Developer: Yao Wang',
		'Audio Design: Guanyu Xie',
		'Built upon LifeRestart by VickScarlet',
	];

	// Play Again first rolls 8.mp4 (the rebirth bridge) full-screen over
	// this page, and only reloads back to the title loop once it ends --
	// the click itself is the user gesture, so unmuted autoplay on the
	// just-mounted <video> is permitted. Any playback failure falls
	// through to the reload rather than stranding the player here.
	let replaying = $state(false);
	function onAgain() {
		replaying = true;
	}
	function restart() {
		window.location.reload();
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
		const storyStart = lines.findIndex(l => l.startsWith('Year '));
		const story = storyStart === -1 ? [] : lines.slice(storyStart);
		const header = [
			country ? `Country: ${country}` : null,
			sex ? `Sex orientation: ${sex}` : null,
			...ROWS.map(r => `${r.label}: ${r.start != null ? `${r.start} → ${r.value}` : r.value}`),
		].filter(Boolean);
		return [...header, ...story];
	}

	function onPrintTxt() {
		const win = window.open();
		if (!win) return;
		const txts = printHeaderAndStory();
		win.document.write(
			"<p style='margin: 6px 0; width: 280px; font-size: 14px; font-family:Cascadia Code, Consolas, monospace'>Life Summary @Samsara</p>"
		);
		for (const line of txts) {
			win.document.write(
				`<p style='margin:3px 0; width: 280px; font-size: 12px; font-family:Cascadia Code, Consolas, monospace'>${line}</p>`
			);
		}
		win.document.write(
			`<div style='margin: 8px 0 0; width: 280px; text-align: center;'><img src='${window.location.origin}${base}/images/qrcode.png' style='width: 150px;height:150px;'></div>`
		);
		win.document.write(
			"<p style='margin: 8px 0 0; width: 280px; font-size: 12px; font-family:Cascadia Code, Consolas, monospace'>Visit https://marcwong.github.io/samsara/ to play it at home.<br> © 2022 Yuwei Jiang</p>"
		);
		win.document.write(
			"<p style='margin: 8px 0 0; width: 280px; font-size: 12px; font-family:Cascadia Code, Consolas, monospace'>Contact: sabinajiang0505@outlook.com</p>"
		);
		win.document.write(
			`<p style='margin: 8px 0 0; width: 280px; font-size: 11px; font-family:Cascadia Code, Consolas, monospace'>${CREDITS.join('<br>')}</p>`
		);
		win.focus();
		win.document.close();
		win.print();
	}
</script>

<div class="summary">
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
		<Button onclick={onAgain}>Play Again</Button>
		<Button variant="print" onclick={onPrintTxt}>Print</Button>
	</div>

	{#if age < 18}
		<p class="hint">Hint: try putting all your points into a single stat.</p>
	{/if}

	<div class="credits">
		{#each CREDITS as line (line)}
			<p>{line}</p>
		{/each}
	</div>
</div>

{#if replaying}
	<div class="replay">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src="{base}/videos/8.mp4"
			autoplay
			playsinline
			onended={restart}
			onerror={restart}
		></video>
	</div>
{/if}

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
		max-width: 34rem;
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
		max-width: 34rem;
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
		color: #cfe2ea;
		font-size: 0.95rem;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.hint {
		margin: 0;
		font-size: 0.75rem;
		color: #82a0ad;
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

	/* Full-screen opaque cover for the Play Again bridge clip -- sits over
	   everything on this page (including the fixed shader background). */
	.replay {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: #000;
	}
	.replay video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
