<script>
	import { onMount, onDestroy } from 'svelte';
	import { Renderer, Program, Mesh, Triangle } from 'ogl';
	import { restartProgress } from '../stores.js';

	let { screen } = $props();

	// Reads Summary's Restart Life transition per-frame -- see
	// restartProgress in stores.js for why this has to be a store rather
	// than a prop. Restart plays videos/8.mp4 on the shared VideoStage
	// canvas underneath this one, and that clip OPENS on drifting cloud/sky
	// of its own. So this shader only has to hand the clouds over: a short
	// cross-fade across the clip's first ~12% (~0.85s, while 8.mp4 is still
	// solid cloud -- its sky doesn't start clearing until ~1.0s) swaps live
	// shader for footage while both are showing the same subject, which is
	// invisible in a way a later fade would not be. No scale push here: the
	// clip carries the entire camera move now.
	let bgOpacity = $derived(1 - Math.min(1, $restartProgress / 0.12));

	// CSS fallback for prefers-reduced-motion, no-WebGL, or context loss --
	// also what's shown for a frame before the canvas mounts. Only SUMMARY
	// still uses this shader background; the other screens now have their
	// own cinematic parallax scenes (see lib/components/parallax/).
	const FALLBACK_GRADIENTS = {
		SUMMARY: 'radial-gradient(circle at 50% 0%, #24404d, #0d1620 70%)',
	};

	// Same "flowing sand" shader as before; [shadow, mid, highlight].
	// SUMMARY: cool desaturated teal-blue, sampled directly from the 5 intro
	// clips' own footage (corridor tile, stairwell concrete, its skylight) --
	// darkest shadow ~#0e1c2e, mid stairwell wall ~#2c4a57, brightest 2% of
	// the stairwell's final frame (the skylight) ~#f7fbfe, toned down here to
	// a pale ice-blue so it reads as a glow accent rather than flashing white.
	const PALETTES = {
		SUMMARY: ['#0e1c2e', '#2c4a57', '#bcdce8'],
	};

	function hexToRgb(hex) {
		const n = parseInt(hex.slice(1), 16);
		return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
	}

	const vertex = `
		attribute vec2 position;
		attribute vec2 uv;
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

	const fragment = `
		// Many phone GPUs have no highp in fragment shaders; demanding it made
		// the shader fail to compile there and the clouds simply vanished.
		#ifdef GL_FRAGMENT_PRECISION_HIGH
		precision highp float;
		#else
		precision mediump float;
		#endif

		uniform float uTime;
		uniform vec2 uMouse;
		uniform vec2 uResolution;
		uniform vec3 uColorDark;
		uniform vec3 uColorMid;
		uniform vec3 uColorLight;

		varying vec2 vUv;

		float hash(vec2 p) {
			p = fract(p * vec2(123.34, 456.21));
			p += dot(p, p + 45.32);
			return fract(p.x * p.y);
		}

		float noise(vec2 p) {
			vec2 i = floor(p);
			vec2 f = fract(p);
			float a = hash(i);
			float b = hash(i + vec2(1.0, 0.0));
			float c = hash(i + vec2(0.0, 1.0));
			float d = hash(i + vec2(1.0, 1.0));
			vec2 u = f * f * (3.0 - 2.0 * f);
			return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
		}

		float fbm(vec2 p) {
			float value = 0.0;
			float amplitude = 0.5;
			for (int i = 0; i < 5; i++) {
				value += amplitude * noise(p);
				p *= 2.0;
				amplitude *= 0.5;
			}
			return value;
		}

		void main() {
			float aspect = uResolution.x / uResolution.y;
			vec2 st = vUv;
			st.x *= aspect;

			vec2 mouse = uMouse;
			mouse.x *= aspect;

			// distance from the cursor pulls the flow field toward it, like a
			// hand dragged through sand
			float d = distance(st, mouse);
			float pull = smoothstep(0.6, 0.0, d);

			vec2 flow = st * 3.0;
			flow += vec2(uTime * 0.03, uTime * 0.02);
			flow += (st - mouse) * pull * 1.5;

			float n = fbm(flow);
			n += fbm(flow * 2.0 + 10.0) * 0.5;

			float grain = (hash(vUv * uResolution.xy + uTime) - 0.5) * 0.04;

			vec3 color = mix(uColorDark, uColorMid, smoothstep(0.2, 0.6, n));
			color = mix(color, uColorLight, smoothstep(0.55, 0.85, n + pull * 0.3));
			color += grain;

			gl_FragColor = vec4(color, 1.0);
		}
	`;

	let canvasEl = $state(null);
	let softEl = $state(null);
	let ready = $state(false);
	// 'gl' | 'soft' -- which layer is drawing the clouds.
	let mode = $state('gl');
	let reducedMotion = $state(false);

	// Software clouds: the same noise field as the shader, drawn on a small
	// 2D canvas and stretched to the screen (it is soft cloud, so the low
	// resolution never shows). Used wherever WebGL is unavailable or fails,
	// and for reduced motion (one still frame), so the summary always has its
	// clouds -- the plain gradient that used to stand in looked like nothing.
	function fract(x) {
		return x - Math.floor(x);
	}
	function hash2(x, y) {
		let px = fract(x * 123.34);
		let py = fract(y * 456.21);
		const d = px * (px + 45.32) + py * (py + 45.32);
		px += d;
		py += d;
		return fract(px * py);
	}
	function noise2(x, y) {
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const fx = x - ix;
		const fy = y - iy;
		const a = hash2(ix, iy);
		const b = hash2(ix + 1, iy);
		const c = hash2(ix, iy + 1);
		const d = hash2(ix + 1, iy + 1);
		const ux = fx * fx * (3 - 2 * fx);
		const uy = fy * fy * (3 - 2 * fy);
		return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
	}
	function fbm2(x, y) {
		let v = 0;
		let amp = 0.5;
		for (let i = 0; i < 5; i++) {
			v += amp * noise2(x, y);
			x *= 2;
			y *= 2;
			amp *= 0.5;
		}
		return v;
	}
	function smoothstep(e0, e1, x) {
		const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
		return t * t * (3 - 2 * t);
	}
	let softCtx = null;
	let softImage = null;
	let softLast = 0;
	function drawSoft(timeSec) {
		const W = softEl.width;
		const H = softEl.height;
		const data = softImage.data;
		const aspect = W / H;
		const [dk, md, lt] = (PALETTES[screen] ?? PALETTES.MAIN).map(hexToRgb);
		const mx = mouseEased.x * aspect;
		const my = mouseEased.y;
		for (let j = 0; j < H; j++) {
			const sy = 1 - (j + 0.5) / H;
			for (let i = 0; i < W; i++) {
				const sx = ((i + 0.5) / W) * aspect;
				const dist = Math.hypot(sx - mx, sy - my);
				const pull = smoothstep(0.6, 0, dist);
				const fx = sx * 3 + timeSec * 0.03 + (sx - mx) * pull * 1.5;
				const fy = sy * 3 + timeSec * 0.02 + (sy - my) * pull * 1.5;
				const n = fbm2(fx, fy) + fbm2(fx * 2 + 10, fy * 2 + 10) * 0.5;
				const t1 = smoothstep(0.2, 0.6, n);
				const t2 = smoothstep(0.55, 0.85, n + pull * 0.3);
				const k = (j * W + i) * 4;
				for (let c = 0; c < 3; c++) {
					const base = dk[c] + (md[c] - dk[c]) * t1;
					data[k + c] = 255 * (base + (lt[c] - base) * t2);
				}
				data[k + 3] = 255;
			}
		}
		softCtx.putImageData(softImage, 0, 0);
	}
	function sizeSoft() {
		const aspect = window.innerWidth / window.innerHeight;
		softEl.width = 160;
		softEl.height = Math.max(40, Math.round(160 / aspect));
		softImage = softCtx.createImageData(softEl.width, softEl.height);
	}
	function startSoft(why) {
		console.warn('[Background] drawing clouds without WebGL:', why);
		renderer = null;
		mode = 'soft';
		softCtx = softEl?.getContext('2d');
		if (!softCtx) return; // nothing can draw: keep the gradient
		sizeSoft();
		window.addEventListener('resize', sizeSoft);
		ready = true;
		drawSoft(0);
		if (!reducedMotion) rafId = requestAnimationFrame(softLoop);
	}
	function softLoop(t) {
		rafId = requestAnimationFrame(softLoop);
		if (!startTime) startTime = t;
		mouseEased.x += (mouseTarget.x - mouseEased.x) * 0.06;
		mouseEased.y += (mouseTarget.y - mouseEased.y) * 0.06;
		// ~20 fps is plenty for slow-drifting cloud and keeps phones cool.
		if (t - softLast < 50) return;
		softLast = t;
		drawSoft((t - startTime) / 1000);
	}

	let renderer, program, mesh, rafId;
	const mouseTarget = { x: 0.5, y: 0.5 };
	const mouseEased = { x: 0.5, y: 0.5 };
	let startTime = 0;

	function resize() {
		if (!renderer) return;
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h);
		program.uniforms.uResolution.value = [w, h];
	}

	function onPointerMove(e) {
		mouseTarget.x = e.clientX / window.innerWidth;
		mouseTarget.y = 1 - e.clientY / window.innerHeight;
	}
	// Phones: pointermove stops as soon as a touch turns into a scroll
	// (pointercancel), so follow the finger through touch events as well.
	function onTouch(e) {
		const t = e.touches?.[0];
		if (t) onPointerMove(t);
	}

	function onVisibilityChange() {
		if (document.hidden) {
			cancelAnimationFrame(rafId);
			rafId = null;
		} else if (!rafId && !reducedMotion) {
			rafId = requestAnimationFrame(mode === 'soft' ? softLoop : loop);
		}
	}

	function loop(t) {
		rafId = requestAnimationFrame(loop);
		if (!startTime) startTime = t;

		mouseEased.x += (mouseTarget.x - mouseEased.x) * 0.06;
		mouseEased.y += (mouseTarget.y - mouseEased.y) * 0.06;

		program.uniforms.uTime.value = (t - startTime) / 1000;
		program.uniforms.uMouse.value = [mouseEased.x, mouseEased.y];

		renderer.render({ scene: mesh });
	}

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerdown', onPointerMove);
		window.addEventListener('touchstart', onTouch, { passive: true });
		window.addEventListener('touchmove', onTouch, { passive: true });
		document.addEventListener('visibilitychange', onVisibilityChange);
		// Reduced motion: still clouds, no animation.
		if (reducedMotion) return startSoft('prefers-reduced-motion');
		// ?softclouds forces the software layer (for checking it on a desktop).
		if (new URLSearchParams(window.location.search).has('softclouds')) return startSoft('forced by ?softclouds');

		try {
			renderer = new Renderer({
				canvas: canvasEl,
				dpr: Math.min(window.devicePixelRatio || 1, 2),
				alpha: false,
				preserveDrawingBuffer: true,
			});
		} catch {
			renderer = null;
		}
		if (!renderer?.gl) return startSoft('no WebGL context');

		const palette = PALETTES[screen] ?? PALETTES.MAIN;
		program = new Program(renderer.gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uMouse: { value: [0.5, 0.5] },
				uResolution: { value: [window.innerWidth, window.innerHeight] },
				uColorDark: { value: hexToRgb(palette[0]) },
				uColorMid: { value: hexToRgb(palette[1]) },
				uColorLight: { value: hexToRgb(palette[2]) },
			},
		});
		const gl = renderer.gl;
		if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
			return startSoft(`shader failed: ${gl.getProgramInfoLog(program.program) || 'link error'}`);
		}
		mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
		// A lost context (common when a phone backgrounds the browser) would
		// otherwise leave a black screen: carry on in software instead.
		canvasEl.addEventListener('webglcontextlost', e => {
			e.preventDefault();
			cancelAnimationFrame(rafId);
			rafId = null;
			startSoft('WebGL context lost');
		});

		resize();
		window.addEventListener('resize', resize);

		ready = true;
		rafId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
		window.removeEventListener('resize', resize);
		window.removeEventListener('resize', sizeSoft);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerdown', onPointerMove);
		window.removeEventListener('touchstart', onTouch);
		window.removeEventListener('touchmove', onTouch);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext();
	});

	// retint in place when the screen changes -- no renderer restart needed
	$effect(() => {
		if (!program) return;
		const palette = PALETTES[screen] ?? PALETTES.MAIN;
		program.uniforms.uColorDark.value = hexToRgb(palette[0]);
		program.uniforms.uColorMid.value = hexToRgb(palette[1]);
		program.uniforms.uColorLight.value = hexToRgb(palette[2]);
	});
</script>

{#if !ready}
	<div
		class="fallback"
		style:background={FALLBACK_GRADIENTS[screen] ?? FALLBACK_GRADIENTS.MAIN}
		style:opacity={bgOpacity}
	></div>
{/if}
<canvas
	bind:this={canvasEl}
	class="bg-canvas"
	class:hidden={!ready || mode !== 'gl'}
	style:opacity={bgOpacity}
></canvas>
<canvas
	bind:this={softEl}
	class="bg-canvas soft"
	class:hidden={!ready || mode !== 'soft'}
	style:opacity={bgOpacity}
	aria-hidden="true"
></canvas>

<style>
	.fallback,
	.bg-canvas {
		position: fixed;
		inset: 0;
		z-index: -1;
	}
	.bg-canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
	.bg-canvas.hidden {
		display: none;
	}
	/* Stretched from a small canvas: smooth scaling plus a touch of blur so
	   the low resolution reads as soft cloud, not pixels. */
	.bg-canvas.soft {
		image-rendering: auto;
		filter: blur(2px);
		transform: scale(1.03);
	}
</style>
