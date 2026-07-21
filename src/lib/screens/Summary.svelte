<script>
	import { base } from '$app/paths';
	import { draft } from '../stores.js';
	import Button from '../components/Button.svelte';
	import { core } from '../game/core.js';

	const { summary } = core;
	const types = core.PropertyTypes;

	// Already in the Wealth/Appearance/IQ/Health/EQ order from this session's
	// earlier ordering pass -- ported as-is.
	const ROWS = [
		[types.HMNY, 'Wealth'],
		[types.HCHR, 'Appearance'],
		[types.HINT, 'IQ'],
		[types.HSTR, 'Health'],
		[types.HSPR, 'EQ'],
	].map(([type, label]) => {
		const data = summary[type];
		return { label, value: data.value > 13 ? 13 : data.value, grade: data.grade };
	});

	const talents = $draft.talents ?? [];
	const printText = $draft.printText ?? '';

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
		win.focus();
		win.document.close();
		win.print();
	}
</script>

<div class="summary">
	<h1 class="title">♀Samsara</h1>
	<div class="rows">
		{#each ROWS as row (row.label)}
			<div class="row grade-{row.grade}">
				<span>{row.label}</span>
				<span class="value">{row.value}</span>
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
</div>

<style>
	.summary {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 3rem 1.5rem;
	}
	.title {
		font-size: clamp(2rem, 6vw, 3rem);
		margin: 0;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
		max-width: 28rem;
	}
	.row {
		display: flex;
		justify-content: space-between;
		background: var(--bg-raised);
		border-radius: 0.6rem;
		padding: 0.75em 1.25em;
		font-size: 1.3rem;
		border-left: 4px solid var(--text-dim);
	}
	.row.grade-1 {
		border-left-color: var(--accent);
	}
	.row.grade-2 {
		border-left-color: #e2a7ff;
	}
	.row.grade-3 {
		border-left-color: #ffa07a;
	}
	.value {
		font-weight: bold;
	}
	.talents {
		width: 100%;
		max-width: 28rem;
		text-align: left;
	}
	.talents h2 {
		font-size: 1.2rem;
		color: var(--text-dim);
		margin: 0 0 0.5rem;
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
		background: var(--bg-raised);
		border-radius: 0.6rem;
		padding: 0.6em 1em;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
</style>
