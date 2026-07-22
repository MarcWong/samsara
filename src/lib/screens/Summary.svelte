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

	function onAgain() {
		window.location.reload();
	}

	function onPrintTxt() {
		const win = window.open();
		if (!win) return;
		const txts = printText.split('\n');
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

<style>
	/* This screen sits on the yellow-smoke backdrop, so everything here
	   keys off a warm yellow-grey palette instead of the app's usual cool
	   slate: warm charcoal panels, dim khaki captions, parchment values.
	   Grade accents stay distinguishable but move to warm hues too. */
	.summary {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		padding: 1.75rem 1.5rem 1.25rem;
		color: #ece3cb;
	}
	.title {
		font-size: clamp(2rem, 6vw, 3rem);
		margin: 0;
		color: #f2ead4;
		text-shadow: 0 2px 14px rgba(30, 26, 16, 0.55);
	}
	.idcard {
		display: flex;
		justify-content: center;
		gap: 2.5rem;
		width: 100%;
		max-width: 28rem;
		background: rgba(43, 40, 31, 0.88);
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
		color: #a89a72;
	}
	.id-value {
		font-size: 1.3rem;
		font-weight: bold;
		color: #f0e6c8;
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
		background: rgba(43, 40, 31, 0.88);
		border-radius: 0.6rem;
		padding: 0.55em 0.5em 0.5em;
		border-top: 3px solid #6d6553;
	}
	.stat-label {
		font-size: 0.85rem;
		color: #a89a72;
		white-space: nowrap;
	}
	.stat-values {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}
	.stat-start {
		font-size: 0.95rem;
		color: #a89a72;
	}
	.stat-arrow {
		font-size: 0.85rem;
		color: #877a58;
	}
	.stat-value {
		font-size: 1.35rem;
		font-weight: bold;
		color: #f0e6c8;
	}
	.row.grade-1 {
		border-top-color: #e3c56b;
	}
	.row.grade-2 {
		border-top-color: #a8a35e;
	}
	.row.grade-3 {
		border-top-color: #c98a5a;
	}
	.talents {
		width: 100%;
		max-width: 28rem;
		text-align: left;
	}
	.talents h2 {
		font-size: 1.1rem;
		color: #a89a72;
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
		background: rgba(43, 40, 31, 0.88);
		border-radius: 0.6rem;
		padding: 0.6em 1em;
		color: #e2d8ba;
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
		color: #a89a72;
		opacity: 0.6;
	}
	.credits {
		margin-top: 0.5rem;
		text-align: center;
	}
	.credits p {
		margin: 0.15em 0;
		font-size: 0.7rem;
		color: rgba(223, 212, 224, 0.55);
	}
</style>
