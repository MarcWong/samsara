// Two-tone [silhouette, accent] per country for the housing-cluster scene.
// Shape of the cluster stays identical across countries (see art.js's
// comment on why) -- only the accent color shifts. `silhouette` is
// consistently near-black so buildings always read clearly against the
// bright dusk sky; `accent` (roof/window color, and a light scrim tinting
// the sky) is what actually differentiates each country, drawn from the
// same muted-but-warm family as Background.svelte's shader tints.
const COUNTRY_TONES = {
	AF: ['#0a0806', '#c9935a'],
	CH: ['#07090a', '#8fae7a'],
	EGY: ['#0a0805', '#d1a94a'],
	IND: ['#090608', '#b784c9'],
	JAP: ['#060709', '#7a94c9'],
	US: ['#07080a', '#8a9bb0'],
	IRN: ['#0a0706', '#c97a5c'],
	UKR: ['#070907', '#8ec98a'],
	PRK: ['#080809', '#9494c9'],
	GBR: ['#070809', '#87a3c0'],
	HTI: ['#0a0806', '#d19a5a'],
	DNK: ['#070908', '#7ec4b0'],
};

function countryTone(code) {
	return COUNTRY_TONES[code] ?? ['#08090a', '#a9bcd6'];
}

export { COUNTRY_TONES, countryTone };
