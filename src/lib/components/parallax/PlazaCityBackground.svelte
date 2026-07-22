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
	let { flying = false, turned = false } = $props();

	let canvasEl;
	let containerEl;
	let renderer, scene, camera, raf, resizeObserver;
	let destroyed = false;

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
		// practical-light color temperature seen in the photo.
		scene.add(new THREE.HemisphereLight(0x5a6b8f, 0x0a0710, 1.1));
		const key = new THREE.DirectionalLight(0xffe2b0, 1.8);
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
				// actual TV sitting in the alley, not a monument.
				const tvBox = new THREE.Box3().setFromObject(tvFbx);
				const tvSize = tvBox.getSize(new THREE.Vector3());
				const targetHeight = alleyRadius * 0.046;
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
				// it also needs a yaw to face the camera.
				tvFbx.rotation.y = -Math.PI / 2;
				tvFbx.position.y -= alleyRadius * 0.01;
				tvFbx.position.z -= alleyRadius * 0.075;
				scene.add(tvFbx);

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
