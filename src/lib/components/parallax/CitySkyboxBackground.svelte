<script>
	// The launch-page background: a single "Sphere" mesh (skysphere.fbx, no
	// embedded texture -- it only ever referenced an external stock
	// "MountainLake" path that doesn't exist in this project) textured with
	// a supplied 8192x4096 equirectangular city panorama instead. Same
	// skysphere technique as PlazaCityBackground.svelte (camera parked at
	// the sphere's own center), with both bugs found there fixed proactively
	// this time: measure the real post-load bounding sphere rather than
	// trust the geometry's own local bounds (FBX/Sketchfab exports routinely
	// bake an unrelated scale into an ancestor node), and disable frustum
	// culling on the mesh (an oversized matrixWorld scale throws off the
	// automatic bounds check and can cull the mesh even when it's centered
	// on the camera).
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	let { flying = false } = $props();

	let canvasEl;
	let containerEl;
	let renderer, scene, camera, resizeObserver, raf;
	let tower = null;
	let destroyed = false;

	// The street-level scene (same skybox_dystopian_alleyway_small.glb Plaza
	// uses) embedded as a small "portal" object inside this panorama, at the
	// spot the camera dives toward on Start -- one continuous fall/zoom
	// instead of a hard cut between two unrelated WebGL scenes.
	let portal = null;
	// Plain `portal` is a THREE.Object3D, not reactive state -- $effect below
	// only reruns on reads of actual $state/props, so this boolean flag (set
	// once the load promise resolves) is what tells it the portal exists.
	let portalReady = $state(false);
	let portalPos = new THREE.Vector3();
	// The idle camera's own look-at point -- the flight lerps the look
	// target from here to portalPos across the same eased t as the position,
	// rather than snapping camera.lookAt(portalPos) on frame 1, which undid
	// the raised, tower-framed idle view the instant the dive started.
	let idleLookAt = new THREE.Vector3();
	let flightActive = false;
	let flightStartPos = new THREE.Vector3();
	let flightStartTime = 0;
	let flightLookAt = new THREE.Vector3();
	const FLIGHT_DURATION = 2000; // ms -- finishes just before CityIntro's 2400ms screen swap
	const FLIGHT_START_FOV = 55;
	const FLIGHT_END_FOV = 78;

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

	// Starts the dive the instant both the portal is ready and the parent
	// screen flips flying on -- if the player clicks Start before assets
	// finish loading, this just fires as soon as they do.
	$effect(() => {
		if (flying && portalReady && !flightActive) {
			flightActive = true;
			flightStartPos.copy(camera.position);
			flightStartTime = performance.now();
		}
	});

	onMount(() => {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x07070c);

		camera = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
		camera.position.set(0, 0, 0);

		// logarithmicDepthBuffer is required here: the sky sphere sits at a
		// ~170,000-unit radius (an arbitrary scale baked into skysphere.fbx by
		// whatever DCC tool exported it) while the tower needs a near plane
		// small enough for normal foreground use. That near/far ratio blows
		// out a standard depth buffer's precision at the tower's own distance,
		// so the tower and the sky z-fight into invisibility -- confirmed live
		// by projecting the tower's bounding-box corners through the camera
		// and finding every one landed at NDC z=1.0 regardless of actual depth.
		renderer = new THREE.WebGLRenderer({
			canvas: canvasEl,
			antialias: true,
			alpha: false,
			logarithmicDepthBuffer: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;

		// Cool moonlight + a magenta/cyan rim pair -- gives the tower's metal
		// hull real highlight/shadow modeling against the flat-lit skysphere
		// instead of reading as a black paper cutout, and the rim tint matches
		// the cyan/magenta neon language already established in Plaza.svelte.
		scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x0a0710, 1.3));
		const moon = new THREE.DirectionalLight(0xbfd4ff, 2.6);
		moon.position.set(-1, 1.4, 0.6);
		scene.add(moon);
		const rimCyan = new THREE.DirectionalLight(0x00e8ff, 1.1);
		rimCyan.position.set(1.2, 0.3, -0.8);
		scene.add(rimCyan);
		const rimMagenta = new THREE.DirectionalLight(0xff2fd0, 0.6);
		rimMagenta.position.set(-0.6, -0.4, -1);
		scene.add(rimMagenta);

		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(containerEl);

		const textureLoader = new THREE.TextureLoader();
		const fbxLoader = new FBXLoader();
		const gltfLoader = new GLTFLoader();

		Promise.all([
			new Promise((resolve, reject) =>
				textureLoader.load(
					`${base}/models/stylized_skybox_cityskyline_001/Stylized_Skybox_CitySkyline_Panorama_001.png`,
					resolve,
					undefined,
					reject,
				),
			),
			new Promise((resolve, reject) =>
				fbxLoader.load(`${base}/models/skysphere.fbx`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				gltfLoader.load(`${base}/models/centinel_beam.glb`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				gltfLoader.load(`${base}/models/skybox_dystopian_alleyway_small.glb`, resolve, undefined, reject),
			),
		])
			.then(([texture, fbx, gltf, alleyGltf]) => {
				if (destroyed) return;
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.wrapS = THREE.RepeatWrapping;
				// The panorama was authored to wrap left-to-right around the
				// sphere's own UVs; mirroring it is the cheap fix if the seam
				// or wrap direction ever looks backwards after a texture swap.
				texture.repeat.x = -1;

				// BackSide (the usual skysphere convention) renders nothing here --
				// this FBX sphere's winding faces outward, so the inside surface
				// needs FrontSide/DoubleSide instead. Confirmed live: switching to
				// DoubleSide was the only change that made the panorama appear.
				// depthWrite:false + renderOrder -1: standard skybox practice --
				// the sky never needs to participate in depth testing against
				// foreground objects, so it can't lose a z-fight against the
				// tower no matter what the log-depth buffer resolves to.
				const material = new THREE.MeshBasicMaterial({
					map: texture,
					side: THREE.DoubleSide,
					depthWrite: false,
				});

				fbx.traverse(node => {
					if (node.isMesh) {
						node.material = material;
						node.frustumCulled = false;
						node.renderOrder = -1;
					}
				});
				scene.add(fbx);

				// Don't trust the geometry's own bounds -- measure the real
				// post-load world-space bounding sphere and size the camera's
				// near/far to match (see PlazaCityBackground.svelte for why).
				const box = new THREE.Box3().setFromObject(fbx);
				const boundingSphere = new THREE.Sphere();
				box.getBoundingSphere(boundingSphere);
				fbx.position.sub(boundingSphere.center);
				const skyRadius = boundingSphere.radius;
				camera.near = Math.max(skyRadius * 0.0005, 0.001);
				camera.far = skyRadius * 1.5;
				camera.updateProjectionMatrix();

				// The tower (centinel_beam.glb, replacing the old procedural
				// Babel tower) keeps its own authored PBR materials -- a metal
				// hull plus a built-in emissive "light beam" strip -- so only
				// scale/position/frustum-culling need setting here. Same
				// measure-after-load approach as the skysphere itself: this is
				// another Sketchfab export ("Sketchfab_model" root node), so its
				// baked-in scale isn't something to trust blindly either.
				tower = gltf.scene;
				tower.traverse(node => {
					if (node.isMesh) node.frustumCulled = false;
				});
				scene.add(tower);

				const towerBox = new THREE.Box3().setFromObject(tower);
				const towerSize = towerBox.getSize(new THREE.Vector3());
				// Tall enough to rise well above the skyline and pierce the
				// cloud band, but the model's own width/height ratio (~0.6) means
				// scaling it too big at close range turns it into a wall filling
				// the whole frame rather than a distant spire -- confirmed live,
				// the first pass (0.6x radius, parked 0.35x radius away) did
				// exactly that. Smaller + further back reads as a landmark.
				// Bigger again -- 0.55x/0.95x-away read as too modest next to the
				// skyline once compared side by side; pulling the distance in
				// (0.95x -> 0.65x) while pushing height up (0.55x -> 0.75x) lands
				// between that pass and an even closer test that filled the
				// entire frame edge to edge with no sky or skyline visible at
				// all -- close/tall enough to dominate, not so close it reads as
				// a flat wall.
				const targetHeight = skyRadius * 0.75;
				const scaleFactor = targetHeight / Math.max(towerSize.y, 0.001);
				tower.scale.multiplyScalar(scaleFactor);

				towerBox.setFromObject(tower);
				const towerCenter = towerBox.getCenter(new THREE.Vector3());
				tower.position.x -= towerCenter.x;
				tower.position.z -= towerCenter.z;
				tower.position.y -= towerBox.min.y;
				// Stand it well back from the camera so the skyline and clouds
				// read around it. Sunk further below eye level than before
				// (0.22x -> 0.34x radius) so the base sits below both the raised
				// camera's sightline and the cloud band, instead of visibly
				// planting on a horizon line.
				const towerDistance = skyRadius * 0.65;
				const towerDrop = skyRadius * 0.32;
				tower.position.z -= towerDistance;
				tower.position.y -= towerDrop;

				// Raising the camera itself (rather than just tilting it) is
				// what actually shrinks the panorama's baked-in skyline relative
				// to frame height -- a higher vantage pushes that fixed-size
				// background lower/smaller in view while the tower, a real 3D
				// object, keeps its full height.
				const cameraHeight = skyRadius * 0.09;
				camera.position.y = cameraHeight;

				idleLookAt.set(0, -towerDrop + targetHeight * 0.62, -towerDistance);
				camera.lookAt(idleLookAt);

				// The portal: same alley sphere Plaza renders full-size, used here
				// purely as the camera's dive target -- kept out of the scene
				// graph entirely (not scene.add'ed) since rendering it as a small
				// sphere from outside read as a jarring, out-of-place object
				// floating in the skyline rather than a natural part of it.
				portal = alleyGltf.scene;

				const portalBox = new THREE.Box3().setFromObject(portal);
				const portalSphere = new THREE.Sphere();
				portalBox.getBoundingSphere(portalSphere);
				const portalRadius = skyRadius * 0.035;
				const portalScale = portalRadius / Math.max(portalSphere.radius, 0.001);
				portal.scale.multiplyScalar(portalScale);
				portal.position.sub(portalSphere.center.multiplyScalar(portalScale));

				// Off to one side and low, near the cloud band -- the flight
				// still dives toward this point, just with nothing visibly
				// marking it beforehand.
				portalPos.set(skyRadius * 0.16, -skyRadius * 0.12, -skyRadius * 0.5);
				portal.position.add(portalPos);

				portalReady = true;
			})
			.catch(err => console.error('[CitySkyboxBackground] load failed', err));

		resize();

		// One continuous loop (rather than the one-shot render used before the
		// tower existed) so its slow idle rotation actually animates; it just
		// re-renders a static frame until the tower/skysphere promise above
		// resolves and populates the scene.
		function render(now) {
			if (destroyed) return;
			if (tower) tower.rotation.y += 0.0009;
			if (flightActive) {
				const t = Math.min((now - flightStartTime) / FLIGHT_DURATION, 1);
				// Cubic ease-in: slow at first, then accelerating hard into the
				// portal -- reads as falling rather than a steady glide.
				const eased = t * t * t;
				camera.position.lerpVectors(flightStartPos, portalPos, eased);
				flightLookAt.lerpVectors(idleLookAt, portalPos, eased);
				camera.lookAt(flightLookAt);
				camera.fov = FLIGHT_START_FOV + (FLIGHT_END_FOV - FLIGHT_START_FOV) * eased;
				camera.updateProjectionMatrix();
			}
			renderer.render(scene, camera);
			raf = requestAnimationFrame(render);
		}
		raf = requestAnimationFrame(render);
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
		// Not part of the scene graph (see comment where it's loaded), so the
		// traversal above never reaches it.
		portal?.traverse(node => {
			if (node.isMesh) {
				node.geometry?.dispose();
				disposeMaterial(node.material);
			}
		});
		renderer?.dispose();
	});
</script>

<div class="city-skybox" class:departing={flying} bind:this={containerEl}>
	<canvas bind:this={canvasEl}></canvas>
	<div class="clouds clouds-one"></div>
	<div class="clouds clouds-two"></div>
</div>

<style>
	.city-skybox {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: #07070c;
		/* The fall itself is real camera movement in the WebGL scene now, not
		   a CSS zoom -- this only needs to mask the hard cut to Plaza's own
		   canvas at the very end, so it stays inert for most of the flight and
		   only kicks in over the last ~700ms (delay chosen to land just before
		   CityIntro's 2400ms screen swap). */
		transition: filter 700ms ease 1500ms;
	}
	.city-skybox.departing {
		filter: blur(10px) brightness(1.6);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
	/* A dense haze band hugging the very bottom of the frame -- sells the
	   tower's base as dissolving into ground fog/the horizon rather than
	   visibly planting on the skyline or just getting cropped by the frame
	   edge. Sits much lower and denser than the first pass (which was
	   centered mid-frame and too thin to actually hide anything down at the
	   tower's new, taller scale). */
	.clouds {
		position: absolute;
		inset: auto -15% -4%;
		height: 34%;
		pointer-events: none;
		border-radius: 999px;
		background:
			radial-gradient(ellipse at 20% 70%, rgba(190, 208, 224, 0.4), transparent 45%),
			radial-gradient(ellipse at 70% 60%, rgba(117, 142, 172, 0.42), transparent 50%),
			linear-gradient(to top, rgba(7, 7, 12, 0.85), transparent);
		filter: blur(30px);
		animation: drift 20s ease-in-out infinite alternate;
	}
	.clouds-two {
		bottom: -8%;
		height: 24%;
		opacity: 0.75;
		animation-duration: 27s;
		animation-direction: alternate-reverse;
	}
	@keyframes drift {
		to {
			transform: translateX(8%) scale(1.08);
		}
	}
</style>
