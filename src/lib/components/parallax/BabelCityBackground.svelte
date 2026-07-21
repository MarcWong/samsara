<script>
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

	let { flying = false } = $props();
	let canvasEl;
	let containerEl;
	let renderer, scene, camera, tower, raf, resizeObserver;
	let destroyed = false;

	function disposeMaterial(material) {
		if (Array.isArray(material)) material.forEach(disposeMaterial);
		else material?.dispose();
	}

	onMount(() => {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x101927);
		scene.fog = new THREE.FogExp2(0x172334, 0.00145);

		camera = new THREE.PerspectiveCamera(43, 1, 1, 5000);
		camera.position.set(410, 210, 720);
		camera.lookAt(0, 180, 0);

		renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
		renderer.shadowMap.enabled = true;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.72;
		renderer.outputColorSpace = THREE.SRGBColorSpace;

		scene.add(new THREE.HemisphereLight(0x6f91bb, 0x11121a, 1.6));
		const moon = new THREE.DirectionalLight(0x9bbce6, 3.1);
		moon.position.set(-300, 650, 250);
		scene.add(moon);
		const rim = new THREE.DirectionalLight(0x40587e, 1.4);
		rim.position.set(360, 180, -280);
		scene.add(rim);

		const city = new THREE.Group();
		const cityMaterial = new THREE.MeshStandardMaterial({ color: 0x18202b, roughness: 0.94, metalness: 0.04 });
		for (let x = -520; x <= 520; x += 55) {
			for (let z = -360; z <= 310; z += 50) {
				const distance = Math.hypot(x, z);
				if (distance < 120 || (Math.abs(x + z) % 5 === 0)) continue;
				const height = 25 + ((Math.abs(x * 13 + z * 7) % 125) * (distance > 420 ? 0.45 : 1));
				const building = new THREE.Mesh(new THREE.BoxGeometry(34, height, 30), cityMaterial);
				building.position.set(x + ((z * 3) % 13), height / 2, z);
				city.add(building);
			}
		}
		scene.add(city);

		const fogPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(1800, 380),
			new THREE.MeshBasicMaterial({ color: 0x9aabc0, transparent: true, opacity: 0.055, depthWrite: false }),
		);
		fogPlane.position.set(0, 115, 120);
		scene.add(fogPlane);

		const towerLoader = new GLTFLoader();
		towerLoader.setMeshoptDecoder(MeshoptDecoder);
		towerLoader.load(`${base}/models/tower_of_babel.meshopt.glb`, gltf => {
			if (destroyed) return;
			tower = gltf.scene;
			const bounds = new THREE.Box3().setFromObject(tower);
			const size = bounds.getSize(new THREE.Vector3());
			// Normalize first, then deliberately compress X/Z: a distant landmark
			// should read as a needle piercing the cloud ceiling, not a wide block.
			const heightScale = 1050 / Math.max(size.y, 0.001);
			tower.scale.set(heightScale * 0.54, heightScale, heightScale * 0.54);
			bounds.setFromObject(tower);
			const center = bounds.getCenter(new THREE.Vector3());
			tower.position.set(-center.x, -bounds.min.y, -center.z);
			tower.traverse(node => {
				if (node.isMesh) {
					node.castShadow = true;
					node.receiveShadow = true;
				}
			});
			scene.add(tower);
		});

		const resize = () => {
			const width = containerEl.clientWidth;
			const height = containerEl.clientHeight;
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};
		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(containerEl);
		resize();
		const render = () => {
			if (destroyed) return;
			if (tower) tower.rotation.y += 0.00035;
			renderer.render(scene, camera);
			raf = requestAnimationFrame(render);
		};
		render();
	});

	onDestroy(() => {
		destroyed = true;
		cancelAnimationFrame(raf);
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

<div class:departing={flying} class="babel-city" bind:this={containerEl}>
	<canvas bind:this={canvasEl}></canvas>
	<div class="clouds clouds-one"></div>
	<div class="clouds clouds-two"></div>
</div>

<style>
	.babel-city { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: #101927; transition: transform 2200ms cubic-bezier(.4,0,.2,1), filter 2200ms ease; }
	.babel-city.departing { transform: scale(1.12) translateX(-8%); filter: blur(3px); }
	canvas { width: 100%; height: 100%; display: block; }
	.clouds { position: absolute; inset: auto -15% 8%; height: 30%; pointer-events: none; background: radial-gradient(ellipse at 20% 60%, rgba(190,208,224,.18), transparent 38%), radial-gradient(ellipse at 70% 52%, rgba(117,142,172,.2), transparent 42%); filter: blur(22px); animation: drift 18s ease-in-out infinite alternate; }
	.clouds-two { bottom: 38%; opacity: .55; animation-duration: 25s; animation-direction: alternate-reverse; }
	@keyframes drift { to { transform: translateX(8%) scale(1.08); } }
</style>
