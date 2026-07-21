import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// Served as a GitHub Pages project site (https://marcwong.github.io/samsara/),
// so production builds need every asset path prefixed with /samsara. Local
// dev serves from the root instead, matching how the current webpack config
// already relies on relative paths working under either. BASE_PATH lets the
// dev-branch test deploy (https://marcwong.github.io/samsara_test/) override
// this to its own repo name without touching the main production build.
const base = process.env.NODE_ENV === 'production' ? process.env.BASE_PATH || '/samsara' : '';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			paths: { base }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
