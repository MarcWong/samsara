<script>
	// A real photographed/rendered environment instead of the procedural
	// SVG skyline: "skybox_dystopian_alleyway_small.glb" is a unit sphere
	// (confirmed by reading its glTF accessors directly -- bounds exactly
	// [-1,-1,-1] to [1,1,1], centered at the origin) with a single
	// double-sided, emissive-mapped material, i.e. an ordinary 360 skybox
	// meant to be viewed from its center. The billboard itself stays a
	// plain HTML/CSS overlay (see Plaza.svelte) rather than becoming real
	// WebGL geometry -- this is the same split Trajectory already uses
	// (WebGL behind, DOM content in front), and keeps the billboard's
	// click handling and CSS-driven restyling simple.
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

	// `turned`: once the country is chosen, the camera yaws 180° to face the
	// other side of the alley, where the orientation billboard "stands" --
	// same photographed skybox, just looking the other way, so it reads as
	// walking to the opposite side of the street rather than a scene cut.
	// `onScreenQuad`: fires with the TV screen glass's own projected corners
	// (as a CSS matrix3d + reference size) any time the camera/viewport
	// changes, so Plaza.svelte can warp the country-select overlay to sit
	// flush on the glass instead of drifting off it once the TV is tilted.
	let { flying = false, turned = false, onScreenQuad = null } = $props();

	let canvasEl;
	let containerEl;
	let renderer, scene, camera, raf, resizeObserver;
	let destroyed = false;

	// The screen glass's four corners, as fractions of the TV model's own
	// local bounding box (measured once, empirically, by projecting
	// candidate corners and comparing against the glass boundary sampled
	// directly off the rendered canvas -- see this file's git history for
	// the pixel-scan this was calibrated against). Fractions of the mesh's
	// own geometry are intrinsic to the model, so they hold regardless of
	// how the object is later scaled, moved, or tilted -- only the *screen-
	// space projection* of these four points needs to be redone whenever
	// the camera or viewport changes, not the fractions themselves.
	//
	// Yaw-only rotation leaves local Y as world "up" untouched, so the
	// height axis is unambiguous. The width/depth axes mix local X/Z
	// through the yaw; empirically, local X is the front-facing (depth)
	// axis (its max is the face closest to the camera) and local Z is the
	// width axis, running screen-right at its local-Z minimum to
	// screen-left at its local-Z maximum.
	const GLASS_Y_TOP = 0.877;
	const GLASS_Y_BOTTOM = 0.11;
	const GLASS_Z_LEFT = 0.902;
	const GLASS_Z_RIGHT = 0.274;
	let tvMesh = null; // set once loaded; used to recompute the quad on resize
	let tvBoxSize = null;
	let tvBoxMin = null;

	// Solves the 8-DOF projective transform (3x3 homography, bottom-right
	// fixed at 1) mapping 4 source points to 4 destination points, via
	// straightforward Gaussian elimination on the resulting 8x8 linear
	// system -- small and dependency-free rather than pulling in a matrix
	// library for one call site.
	function solveHomography(src, dst) {
		const A = [];
		const b = [];
		for (let i = 0; i < 4; i++) {
			const { x: sx, y: sy } = src[i];
			const { x: dx, y: dy } = dst[i];
			A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
			b.push(dx);
			A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
			b.push(dy);
		}
		const n = 8;
		const M = A.map((row, i) => [...row, b[i]]);
		for (let col = 0; col < n; col++) {
			let pivot = col;
			for (let r = col + 1; r < n; r++) {
				if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
			}
			[M[col], M[pivot]] = [M[pivot], M[col]];
			const div = M[col][col];
			for (let c = col; c <= n; c++) M[col][c] /= div;
			for (let r = 0; r < n; r++) {
				if (r === col) continue;
				const factor = M[r][col];
				if (factor === 0) continue;
				for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
			}
		}
		const h = M.map(row => row[n]);
		return [...h, 1]; // h0..h7, h8=1
	}

	// CSS matrix3d (column-major) embedding of a 2D homography -- the
	// standard "corner-pin" recipe: a homography maps (x,y,1) to
	// (h0x+h1y+h2, h3x+h4y+h5, h6x+h7y+h8) before the perspective divide;
	// CSS does that same divide-by-w on its own 4x4 matrix, so the 2D
	// homography's rows/columns just need slotting into the right cells
	// (z is left as an untouched pass-through, cols/rows 3).
	function homographyToMatrix3d(h) {
		const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = h;
		return `matrix3d(${h0}, ${h3}, 0, ${h6}, ${h1}, ${h4}, 0, ${h7}, 0, 0, 1, 0, ${h2}, ${h5}, 0, ${h8})`;
	}

	// Reference size for the *source* rectangle in the homography solve --
	// arbitrary (any consistent W/H works), chosen close to the glass's own
	// aspect ratio so the un-warped content inside doesn't get stretched
	// before the perspective warp is even applied.
	const QUAD_REF_W = 340;
	const QUAD_REF_H = 175;

	function updateScreenQuad() {
		if (!onScreenQuad || !tvMesh || !camera || !containerEl) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		if (!w || !h) return;

		const corner = (zFrac, yFrac) => {
			const local = new THREE.Vector3(
				tvBoxMin.x + tvBoxSize.x, // front face: local-X max
				tvBoxMin.y + tvBoxSize.y * yFrac,
				tvBoxMin.z + tvBoxSize.z * zFrac,
			);
			const world = tvMesh.localToWorld(local);
			const ndc = world.project(camera);
			return { x: ((ndc.x + 1) / 2) * w, y: ((1 - ndc.y) / 2) * h };
		};
		const topLeft = corner(GLASS_Z_LEFT, GLASS_Y_TOP);
		const topRight = corner(GLASS_Z_RIGHT, GLASS_Y_TOP);
		const bottomRight = corner(GLASS_Z_RIGHT, GLASS_Y_BOTTOM);
		const bottomLeft = corner(GLASS_Z_LEFT, GLASS_Y_BOTTOM);

		const src = [
			{ x: 0, y: 0 },
			{ x: QUAD_REF_W, y: 0 },
			{ x: QUAD_REF_W, y: QUAD_REF_H },
			{ x: 0, y: QUAD_REF_H },
		];
		const h_ = solveHomography(src, [topLeft, topRight, bottomRight, bottomLeft]);
		onScreenQuad({
			matrix3d: homographyToMatrix3d(h_),
			width: QUAD_REF_W,
			height: QUAD_REF_H,
		});
	}

	const TURN_DURATION = 2000;
	const TURN_TARGET = Math.PI;
	let turnActive = false;
	let turnStartAngle = 0;
	let turnStartTime = 0;

	function easeInOutQuad(t) {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}

	$effect(() => {
		if (turned && camera && !turnActive) {
			turnActive = true;
			turnStartAngle = camera.rotation.y;
			turnStartTime = performance.now();
			if (!raf) raf = requestAnimationFrame(turnFrame);
		}
	});

	function turnFrame(now) {
		if (destroyed) return;
		if (turnActive) {
			const t = Math.min((now - turnStartTime) / TURN_DURATION, 1);
			camera.rotation.y = turnStartAngle + (TURN_TARGET - turnStartAngle) * easeInOutQuad(t);
			render();
			if (t >= 1) {
				turnActive = false;
				raf = null;
				return;
			}
		}
		raf = requestAnimationFrame(turnFrame);
	}

	function disposeMaterial(material) {
		if (Array.isArray(material)) material.forEach(disposeMaterial);
		else material?.dispose();
	}

	function resize() {
		if (!renderer || !camera || !containerEl) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		updateScreenQuad();
	}

	function render() {
		if (destroyed || !renderer || !scene || !camera) return;
		renderer.render(scene, camera);
	}

	onMount(() => {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0710);

		// Wide, close to the sphere's own center -- reads as standing inside
		// a narrow space, not viewing a distant landmark (contrast the
		// tighter, more telephoto framing used for Trajectory/CityIntro).
		camera = new THREE.PerspectiveCamera(78, 1, 0.01, 10);
		camera.position.set(0, 0, 0);

		renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// The alley sphere's own material is unlit (emissive-mapped), so it
		// never needed lights -- the TV prop uses a normal PBR material and
		// does. Cool ambient + a warm key light roughly matching the alley's
		// practical-light color temperature seen in the photo. Both toned
		// down from an earlier pass (1.1/1.8) -- confirmed live the TV's
		// glossy housing was throwing a distractingly bright, sharp
		// highlight blob across the screen glass and bezel, reading as a
		// video-game specular hotspot rather than a lit object sitting in a
		// dim alley.
		scene.add(new THREE.HemisphereLight(0x5a6b8f, 0x0a0710, 0.75));
		const key = new THREE.DirectionalLight(0xffe2b0, 1.0);
		key.position.set(0.4, 1, 0.6);
		scene.add(key);

		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(containerEl);

		const gltfLoader = new GLTFLoader();
		const fbxLoader = new FBXLoader();
		const textureLoader = new THREE.TextureLoader();

		Promise.all([
			new Promise((resolve, reject) =>
				gltfLoader.load(`${base}/models/skybox_dystopian_alleyway_small.glb`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) => fbxLoader.load(`${base}/models/retro_tv/SM_TV_01.fbx`, resolve, undefined, reject)),
			new Promise((resolve, reject) =>
				textureLoader.load(`${base}/models/retro_tv/Textures/2k/T_TV_01_2k_BaseColor.png`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				textureLoader.load(`${base}/models/retro_tv/Textures/2k/T_TV_01_2k_Normal.png`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				textureLoader.load(
					`${base}/models/retro_tv/Textures/2k/T_TV_01_2k_OcclusionRoughnessMetallic.png`,
					resolve,
					undefined,
					reject,
				),
			),
		])
			.then(([gltf, tvFbx, baseColor, normalMap, orm]) => {
				if (destroyed) return;
				const sphere = gltf.scene;
				scene.add(sphere);

				// The geometry's own accessors are a clean unit sphere, but
				// Sketchfab's export pipeline baked an large, arbitrary scale
				// into an ancestor node in the hierarchy above the mesh --
				// applying our own guessed scale on top of that (an earlier
				// version did) put the sphere's surface at a ~250,000-unit
				// radius, entirely past any reasonable camera far plane, so
				// nothing rendered. Measuring the real world-space radius
				// after adding it to the scene and sizing the camera's
				// near/far to match is the only way that's actually robust
				// to whatever scale ends up baked in.
				const box = new THREE.Box3().setFromObject(sphere);
				const boundingSphere = new THREE.Sphere();
				box.getBoundingSphere(boundingSphere);
				camera.near = boundingSphere.radius * 0.0005;
				camera.far = boundingSphere.radius * 1.5;
				camera.updateProjectionMatrix();
				const alleyRadius = boundingSphere.radius;

				// The mesh's cached local bounding volume doesn't reflect that
				// huge baked-in scale either, so automatic frustum culling
				// (checked against a wildly wrong transformed bounds) was
				// discarding the whole sphere every frame -- confirmed by
				// disabling it and watching the alley actually appear.
				sphere.traverse(node => {
					if (node.isMesh) node.frustumCulled = false;
				});

				// The TV: FBXLoader can't resolve these textures on its own
				// (the FBX's baked-in paths point at wherever the artist's
				// disk had them, not this project), so they're loaded
				// separately above and wired into a fresh material here. The
				// OcclusionRoughnessMetallic texture is assigned to both
				// roughnessMap and metalnessMap -- three.js independently
				// reads the G channel for roughness and B channel for
				// metalness from whatever texture occupies each slot, so one
				// packed texture in both slots is the correct way to unpack
				// it without a custom shader.
				baseColor.colorSpace = THREE.SRGBColorSpace;
				const tvMaterial = new THREE.MeshStandardMaterial({
					map: baseColor,
					normalMap,
					roughnessMap: orm,
					metalnessMap: orm,
					roughness: 1,
					metalness: 1,
				});
				tvFbx.traverse(node => {
					if (node.isMesh) {
						node.material = tvMaterial;
						node.frustumCulled = false;
					}
				});

				// Same measure-after-load approach as every other prop this
				// session -- scale relative to the alley's own measured
				// radius rather than a guessed absolute number, then park it
				// close in front of the camera at a size that reads as an
				// actual TV sitting in the alley, not a monument. Shrunk
				// from an earlier 0.046 -- confirmed live at a wide desktop
				// viewport that the old size filled most of the frame,
				// overflowing the crt-screen DOM overlay well past the
				// screen glass in every direction.
				const tvBox = new THREE.Box3().setFromObject(tvFbx);
				const tvSize = tvBox.getSize(new THREE.Vector3());
				// Captured *before* scale is applied -- this is genuine
				// unscaled local-space geometry, the frame `localToWorld()`
				// expects in updateScreenQuad() (it re-applies the object's
				// full current matrix, scale included, so feeding it
				// already-scaled coordinates would double the scale).
				tvBoxMin = tvBox.min.clone();
				tvBoxSize = tvSize.clone();
				// Shrunk again (0.046 -> 0.036 -> 0.028) -- confirmed live
				// this still reads clearly as a TV, not a doll's-house
				// miniature, while leaving real headroom between it and the
				// alley around it.
				const targetHeight = alleyRadius * 0.028;
				const tvScale = targetHeight / Math.max(tvSize.y, 0.001);
				tvFbx.scale.multiplyScalar(tvScale);
				tvBox.setFromObject(tvFbx);
				const tvCenter = tvBox.getCenter(new THREE.Vector3());
				tvFbx.position.x -= tvCenter.x;
				tvFbx.position.z -= tvCenter.z;
				tvFbx.position.y -= tvBox.min.y;

				// Camera looks down -Z by default (no lookAt call on this
				// camera) -- straight ahead, at eye height, close enough to
				// read as sitting right in front of the viewer. The model's
				// own front (screen side) doesn't face its own -Z by default
				// (confirmed live: first pass showed its side profile), so
				// it needs a yaw to face the camera -- offset a further ~18°
				// off dead-on (rather than the exact -90° that squares it up
				// flat to the lens) so it reads as a TV standing at an angle
				// in the alley, with real depth to its housing, instead of a
				// flat billboard. Nudged left and further back to compose
				// off-center now that it isn't spanning the whole frame.
				tvFbx.rotation.y = -Math.PI / 2 + 0.32;
				tvFbx.position.y -= alleyRadius * 0.01;
				tvFbx.position.x -= alleyRadius * 0.01;
				tvFbx.position.z -= alleyRadius * 0.048;
				scene.add(tvFbx);
				tvMesh = tvFbx;
				updateScreenQuad();

				render();
			})
			.catch(err => console.error('[PlazaCityBackground] load failed', err));

		resize();
		render();
	});

	onDestroy(() => {
		destroyed = true;
		if (raf) cancelAnimationFrame(raf);
		resizeObserver?.disconnect();
		scene?.traverse(node => {
			if (node.isMesh) {
				node.geometry?.dispose();
				disposeMaterial(node.material);
			}
		});
		renderer?.dispose();
	});
</script>

<div class="plaza-city" class:departing={flying} bind:this={containerEl}>
	<canvas bind:this={canvasEl}></canvas>
</div>

<style>
	.plaza-city {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: #0a0710;
		transition: transform 2200ms cubic-bezier(0.4, 0, 0.2, 1), filter 2200ms ease;
	}
	.plaza-city.departing {
		transform: scale(1.12) translateX(-8%);
		filter: blur(3px);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
