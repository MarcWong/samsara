<script>
	import { onMount, onDestroy } from 'svelte';
	import { Renderer, Program, Mesh, Triangle } from 'ogl';

	let { screen } = $props();

	// CSS fallback for prefers-reduced-motion, no-WebGL, or context loss --
	// also what's shown for a frame before the canvas mounts. Only SUMMARY
	// still uses this shader background; the other screens now have their
	// own cinematic parallax scenes (see lib/components/parallax/).
	const FALLBACK_GRADIENTS = {
		SUMMARY: 'radial-gradient(circle at 50% 0%, #2b3044, #14161f 70%)',
	};

	// Same "flowing sand" shader as before; [shadow, mid, highlight].
	// SUMMARY: dusk blue-pink, darker than before, echoing the CityIntro
	// panorama's blue-grey sky and pink-tinged cloud bank.
	const PALETTES = {
		SUMMARY: ['#171a24', '#39415c', '#b98aa4'],
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
		precision highp float;

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
	let ready = $state(false);
	let reducedMotion = $state(false);

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

	function onVisibilityChange() {
		if (document.hidden) {
			cancelAnimationFrame(rafId);
			rafId = null;
		} else if (!rafId) {
			rafId = requestAnimationFrame(loop);
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
		if (reducedMotion) return;

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
		if (!renderer?.gl) {
			renderer = null;
			return;
		}

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
		mesh = new Mesh(renderer.gl, { geometry: new Triangle(renderer.gl), program });

		resize();
		window.addEventListener('resize', resize);
		window.addEventListener('pointermove', onPointerMove);
		document.addEventListener('visibilitychange', onVisibilityChange);

		ready = true;
		rafId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
		window.removeEventListener('resize', resize);
		window.removeEventListener('pointermove', onPointerMove);
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
	<div class="fallback" style:background={FALLBACK_GRADIENTS[screen] ?? FALLBACK_GRADIENTS.MAIN}></div>
{/if}
<canvas bind:this={canvasEl} class="bg-canvas" class:hidden={!ready}></canvas>

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
</style>
