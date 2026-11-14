<script>
	import { lang } from '../i18n.js';

	// [value, visible label]. Labels are each language's own name and never
	// translated, so the switch reads the same from either state.
	const OPTIONS = [
		['zh', '中文'],
		['en', 'EN'],
	];

	function choose(code) {
		lang.set(code);
	}
</script>

<!-- Sits over the start screen, whose root is one big click-to-advance target:
     clicks and Enter/Space presses stop here so switching language never
     starts the game. The handlers are a propagation shield, not controls --
     the buttons inside are the interactive elements. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="lang-toggle"
	role="group"
	aria-label="Language / 语言"
	onclick={e => e.stopPropagation()}
	onkeydown={e => e.stopPropagation()}
>
	{#each OPTIONS as [code, label], i (code)}
		{#if i > 0}<span class="sep" aria-hidden="true">｜</span>{/if}
		<button
			type="button"
			class="opt"
			class:active={$lang === code}
			aria-pressed={$lang === code}
			lang={code === 'zh' ? 'zh-CN' : 'en'}
			onclick={() => choose(code)}
		>
			{label}
		</button>
	{/each}
</div>

<style>
	.lang-toggle {
		display: flex;
		justify-content: center;
		pointer-events: auto;
		align-items: center;
		gap: 0.55em;
		font-size: 0.9rem;
		line-height: 1.2;
		letter-spacing: 0.12em;
		cursor: default;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
	}
	.sep {
		color: rgba(255, 255, 255, 0.35);
	}
	/* Same understated treatment as the title screen's hint line: the active
	   language is lit, the other dimmed until hovered. */
	.opt {
		padding: 0 0.2em;
		background: none;
		border: none;
		font: inherit;
		letter-spacing: inherit;
		text-shadow: inherit;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: color 150ms ease;
	}
	.opt:hover {
		color: rgba(255, 255, 255, 0.85);
	}
	.opt.active {
		color: #fff;
		cursor: default;
	}
	.opt:focus-visible {
		outline: 1px solid rgba(255, 255, 255, 0.7);
		outline-offset: 2px;
	}
</style>
