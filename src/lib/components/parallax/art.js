// Procedural placeholder art for the cinematic scenes -- stylized silhouettes
// built from plain SVG shapes, not illustration. Deliberately simple so it's
// obvious where real photography/illustration should drop in later (see each
// function's comment for what it's standing in for). Colors come from the
// same muted palette language as Background.svelte's shader so the two
// systems read as one visual world.

// Shared dusk-sky gradient behind every silhouette scene -- bright enough
// that near-black silhouettes actually read as silhouettes, rather than
// dark-on-dark. Warm horizon glow to muted violet overhead, same "flowing
// sand"-adjacent palette family as everything else.
const DUSK_SKY = 'linear-gradient(180deg, #2b2a4a 0%, #6b4f66 45%, #c98f72 75%, #e8b98a 100%)';

// Deterministic PRNG so a given seed always lays out the same "skyline" --
// city/plaza/housing scenes shouldn't reshuffle on every re-render.
function seededRandom(seed) {
	let s = seed % 2147483647;
	if (s <= 0) s += 2147483646;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

// A horizon of building silhouettes. Stands in for a real skyline photo/
// matte painting -- swap by replacing the returned <svg> with an <image>.
function skyline({ seed = 1, width = 1600, height = 500, color = '#12151a', count = 18 }) {
	const rand = seededRandom(seed);
	let rects = '';
	let x = -40;
	while (x < width + 40) {
		const w = 40 + rand() * 90;
		const h = height * (0.15 + rand() * 0.55);
		const y = height - h;
		const hasSpire = rand() > 0.8;
		rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" />`;
		if (hasSpire) {
			const spireH = h * 0.25;
			rects += `<rect x="${x + w / 2 - 3}" y="${y - spireH}" width="6" height="${spireH}" fill="${color}" />`;
		}
		if (rand() > 0.7) {
			// dome accent, evokes varied civic/religious architecture without
			// pinning it to any one real style
			const r = w * 0.32;
			rects += `<circle cx="${x + w / 2}" cy="${y}" r="${r}" fill="${color}" />`;
		}
		x += w * (0.55 + rand() * 0.2);
	}
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

// The Babel tower -- a tapering stack of drums with a spiral ramp line,
// deliberately taller and more singular than the surrounding skyline so it
// reads as a landmark from any distance.
function babelTower({ color = '#0d0f13', accent = '#c9a96e', height = 900, width = 420 }) {
	const tiers = 7;
	let shapes = '';
	let y = height;
	let w = width;
	for (let i = 0; i < tiers; i++) {
		const h = height / tiers;
		const x = (width - w) / 2;
		shapes += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${color}" />`;
		y -= h * 0.86;
		w *= 0.82;
	}
	// spiral accent ramp winding up the outside
	let spiral = `M ${width * 0.1} ${height}`;
	for (let i = 1; i <= tiers * 2; i++) {
		const t = i / (tiers * 2);
		const r = width * (0.5 - t * 0.42) * (i % 2 === 0 ? 1 : -1);
		spiral += ` Q ${width / 2 + r} ${height - t * height * 0.92}, ${width / 2} ${height - t * height}`;
	}
	shapes += `<path d="${spiral}" stroke="${accent}" stroke-width="3" fill="none" opacity="0.35" />`;
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
}

// Foreground signpost, used on the intro scene's "Start" prompt.
function signpost({ color = '#1a1c20', accent = '#eeeeee' }) {
	return `<svg viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg">
		<rect x="92" y="60" width="16" height="260" rx="4" fill="${color}" />
		<rect x="20" y="20" width="160" height="70" rx="8" fill="${color}" stroke="${accent}" stroke-width="2" />
	</svg>`;
}

// The city hall the plaza is named for -- a domed, columned civic building,
// deliberately more ornate/singular than the generic skyline so it reads as
// a specific landmark (same logic as babelTower vs. skyline elsewhere).
function cityHall({ color = '#0b0a10', width = 560, height = 620 }) {
	const columns = 7;
	let shapes = '';
	// steps
	shapes += `<rect x="10" y="${height - 46}" width="${width - 20}" height="18" fill="${color}" />`;
	shapes += `<rect x="35" y="${height - 64}" width="${width - 70}" height="18" fill="${color}" />`;
	// base block + pediment
	shapes += `<rect x="55" y="${height * 0.46}" width="${width - 110}" height="${height * 0.4}" fill="${color}" />`;
	shapes += `<polygon points="45,${height * 0.46} ${width - 45},${height * 0.46} ${width / 2},${height * 0.3}" fill="${color}" />`;
	// columns
	for (let i = 0; i < columns; i++) {
		const x = 95 + (i * (width - 190)) / (columns - 1);
		shapes += `<rect x="${x - 9}" y="${height * 0.49}" width="18" height="${height * 0.35}" fill="${color}" opacity="0.9" />`;
	}
	// dome drum + dome + spire
	shapes += `<rect x="${width * 0.38}" y="${height * 0.16}" width="${width * 0.24}" height="${height * 0.18}" fill="${color}" />`;
	shapes += `<circle cx="${width / 2}" cy="${height * 0.16}" r="${width * 0.15}" fill="${color}" />`;
	shapes += `<rect x="${width / 2 - 3}" y="${height * 0.03}" width="6" height="${height * 0.09}" fill="${color}" />`;
	// "slice" (fill/crop) not "meet" (fit/pad): on a narrow portrait
	// container "meet" shrinks the whole building down to fit the width,
	// anchors it to the bottom, and the dome never reaches above the
	// billboard at all -- confirmed by inspecting the rendered SVG's actual
	// painted bounds, not just its container box.
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
}

// A plaza lamppost -- a close, tall foreground silhouette that sells "you
// are standing in the square" scale/depth better than a distant skyline can.
function lamppost({ color = '#050506', glow = '#e8b96a' }) {
	return `<svg viewBox="0 0 80 400" xmlns="http://www.w3.org/2000/svg">
		<rect x="36" y="60" width="8" height="320" fill="${color}" />
		<rect x="18" y="380" width="44" height="10" rx="2" fill="${color}" />
		<circle cx="40" cy="46" r="22" fill="${glow}" opacity="0.18" />
		<circle cx="40" cy="46" r="13" fill="${color}" />
		<path d="M40 33 L46 46 L40 59 L34 46 Z" fill="${glow}" opacity="0.85" />
	</svg>`;
}

// A country-tinted housing cluster. Shape stays generic on purpose (varying
// it by "national style" risks caricature); the mood differentiates by
// color only. Body stays near-black (`silhouette`) for contrast against the
// dusk sky, with the country's `accent` popping through in the roofs --
// same treatment as the skyline/tower elsewhere.
function housingCluster({ seed = 1, palette, width = 1400, height = 480 }) {
	const [silhouette, accent] = palette;
	const rand = seededRandom(seed);
	let shapes = '';
	let x = -20;
	while (x < width + 20) {
		const w = 90 + rand() * 70;
		const h = height * (0.22 + rand() * 0.3);
		const y = height - h;
		const roofH = h * 0.35;
		shapes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${silhouette}" />`;
		shapes += `<polygon points="${x - 8},${y} ${x + w + 8},${y} ${x + w / 2},${y - roofH}" fill="${accent}" />`;
		if (rand() > 0.5) {
			shapes += `<rect x="${x + w * 0.3}" y="${y + h * 0.35}" width="${w * 0.18}" height="${h * 0.3}" fill="${accent}" opacity="0.5" />`;
		}
		x += w * 0.85;
	}
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
}

// One repeatable turn of the interior staircase, tiled vertically to build
// the tower-climb scene. A flight of steps plus the curved inner wall.
function staircaseTurn({ color = '#23272e', edge = '#3a4048', width = 500, height = 340 }) {
	const steps = 6;
	let shapes = `<path d="M 0 ${height} Q ${width * 0.5} ${height * 0.5} ${width} ${height * 0.15} L ${width} 0 L 0 0 Z" fill="${color}" />`;
	for (let i = 0; i < steps; i++) {
		const t = i / steps;
		const y = height - t * height;
		const x = width * (0.15 + t * 0.7);
		shapes += `<rect x="${x - 60}" y="${y - 14}" width="120" height="14" rx="2" fill="${edge}" />`;
	}
	return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
}

// A simple standing figure silhouette, screen-fixed for the climbing scene.
function climberSilhouette({ color = '#0e0f12' }) {
	return `<svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg">
		<circle cx="50" cy="30" r="18" fill="${color}" />
		<path d="M50 48 C 30 60, 25 100, 32 150 L42 220 L52 220 L48 155 L55 155 L62 220 L72 220 L78 145 C 82 95, 75 60, 50 48 Z" fill="${color}" />
	</svg>`;
}

export { DUSK_SKY, skyline, babelTower, signpost, cityHall, lamppost, housingCluster, staircaseTurn, climberSilhouette };
