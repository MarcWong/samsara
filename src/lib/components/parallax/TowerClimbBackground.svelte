<script>
	// Treadmill technique: the character never actually moves up the Y axis --
	// it plays its climbing animation in place (root motion measured, then
	// subtracted out frame to frame) at a fixed spot on screen, while the
	// stairs are a small repeating tile that scrolls the opposite way
	// (backward/down, matching the character's measured stride) and gets
	// teleported back to the top the instant it scrolls out of frame. This is
	// deliberate: letting the character (or camera) actually climb without
	// bound is exactly what causes float-precision drift and camera-follow
	// bugs on a long playthrough, so nothing here ever accumulates -- every
	// moving part's position is bounded to a few tile-lengths at all times.
	//
	// Free-running, not click-driven: earlier this scrubbed to a `progress`
	// prop tied to the story's age, jumping (tweened) only when the story
	// advanced. That read as choppy rather than someone actually walking --
	// now it just plays continuously off its own clock for as long as this
	// component is mounted, decoupled from story pacing entirely.
	//
	// Character: "Ascending Stairs.fbx" (Mixamo, `mixamorig11:` skeleton,
	// clip "mixamo.com"). Unlike the earlier "Eternal Ascent" placeholder
	// mannequin (whose skin binding was corrupted -- see git history), this
	// one's a clean, standard Mixamo export: 7 skinned parts (body, hair,
	// shirt, pants, suit, heels, eyelashes), renders correctly out of the
	// box. No stairs geometry ships in this file at all -- measured its root
	// (Hips) motion directly (loads once, samples world position at t=0 and
	// t=duration) and used that to size a small procedural stair tile built
	// here, so each tile's rise/run matches the character's actual stride
	// instead of an arbitrary guess.
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

	// Real-time playback rate, as a multiple of the clip's own authored
	// speed (1 = exactly as animated). Faster than 1 by request.
	const SPEED = 1.4;

	// Number of stair tiles kept alive at once, and how many stair steps
	// live inside each tile. Tile count just needs to comfortably outlast
	// whatever's in the camera frustum plus margin -- tuned empirically.
	const TILE_COUNT = 7;
	const STEPS_PER_TILE = 2;

	// Trajectory's story-text log panel covers most of the screen's
	// vertical center, so the character is framed low rather than dead
	// center -- same reasoning as the rest of this app's overlay-avoidance.
	const CAMERA_TARGET_Y_OFFSET = -18;

	let canvasEl;
	let containerEl;

	let renderer, scene, camera;
	let mixer, action, clipDuration = 0;
	let hips;
	let hipsStart = new THREE.Vector3();
	let hipsEnd = new THREE.Vector3();
	let climbVector = new THREE.Vector3();
	let tileGroup, tileOrigin;
	let tileSlot = []; // per-tile effective stack index, only ever increases
	const tmpVec = new THREE.Vector3();

	let elapsed = 0;
	let lastFrameTime = null;
	let playRaf = null;
	let resizeObserver;
	let destroyed = false;

	function render() {
		if (renderer && scene && camera) renderer.render(scene, camera);
	}

	// Removes the animation's net directional drift from the Hips local
	// position while leaving the cyclical walk-bob intact: subtract where a
	// straight-line interpolation from the clip's start to end would have
	// put it at this point in the loop, then re-add the start position so
	// the figure stays centered on its mark instead of drifting to (0,0,0).
	function cancelRootMotion(frac) {
		tmpVec.copy(hipsStart).lerp(hipsEnd, frac);
		hips.position.sub(tmpVec).add(hipsStart);
	}

	// The treadmill: each tile has a fixed "home" slot (0..TILE_COUNT-1,
	// stacked upward/forward by one climbVector each) and a mutable
	// `tileSlot[i]` that only ever jumps upward by TILE_COUNT. A tile's
	// position is (slot - elapsed) * climbVector from the origin -- as
	// `elapsed` grows this drifts toward and past the origin (climbing past
	// the character), and once it's fallen a full tile-length behind, its
	// slot jumps forward by TILE_COUNT, landing it back at the top of the
	// stack. Positions this way never grow beyond roughly
	// [-1, TILE_COUNT-1] climbVectors from tileOrigin, regardless of how
	// long `elapsed` has been running.
	function updateStairs(elapsed) {
		for (let i = 0; i < TILE_COUNT; i++) {
			while (tileSlot[i] - elapsed < -1) tileSlot[i] += TILE_COUNT;
			const tile = tileGroup.children[i];
			tmpVec.copy(climbVector).multiplyScalar(tileSlot[i] - elapsed);
			tile.position.copy(tileOrigin).add(tmpVec);
		}
	}

	function scrubTo(e) {
		if (!action) return;
		const frac = e % 1;

		action.time = frac * clipDuration;
		mixer.update(0);
		cancelRootMotion(frac);

		updateStairs(e);

		render();
	}

	// Free-running, real-time playback: advances `elapsed` by real elapsed
	// seconds (converted to "loops", scaled by SPEED) every frame, for as
	// long as this component is mounted -- not tied to clicks or story
	// progress at all anymore. `lastFrameTime` resets to null on stop/start
	// so a pause (e.g. a slow frame after tab-switch) never produces one
	// huge catch-up jump.
	function playFrame(now) {
		if (destroyed) return;
		if (lastFrameTime !== null) {
			const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
			elapsed += (dt / clipDuration) * SPEED;
			scrubTo(elapsed);
		}
		lastFrameTime = now;
		playRaf = requestAnimationFrame(playFrame);
	}

	function resize() {
		if (!renderer || !camera || !containerEl) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		render();
	}

	// A short, straight flight -- boxes solid down to the ground so the
	// stack reads as a real staircase rather than floating slabs. Steps
	// ascend along +Y/+Z, matching the character's measured climb
	// direction (see `climbVector`).
	function buildStairTile(steps, riser, tread, width) {
		const group = new THREE.Group();
		const material = new THREE.MeshStandardMaterial({ color: 0x211d24, roughness: 0.85, metalness: 0.05 });
		for (let i = 0; i < steps; i++) {
			const stepTopY = (i + 1) * riser;
			const geo = new THREE.BoxGeometry(width, stepTopY, tread);
			const mesh = new THREE.Mesh(geo, material);
			mesh.position.set(0, stepTopY / 2, i * tread + tread / 2);
			mesh.castShadow = false;
			mesh.receiveShadow = false;
			group.add(mesh);
		}
		return group;
	}

	onMount(() => {
		scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0x121018, 250, 1100);

		camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);

		renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const ambient = new THREE.AmbientLight(0x4a3f5c, 1.6);
		const warm = new THREE.DirectionalLight(0xe8b98a, 2.6);
		warm.position.set(-2, 3, -1.5);
		const cool = new THREE.DirectionalLight(0x6b4f66, 0.6);
		cool.position.set(2, 1.5, 2.5);
		scene.add(ambient, warm, cool);

		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(containerEl);

		const loader = new FBXLoader();
		loader.load(
			`${base}/models/Ascending Stairs.fbx`,
			fbx => {
				if (destroyed) return;

				fbx.position.set(0, 0, 0);
				let rightToe;
				fbx.traverse(o => {
					if (o.isBone && /hips$/i.test(o.name)) hips = o;
					if (o.isBone && /righttoebase$/i.test(o.name)) rightToe = o;
					if (o.isSkinnedMesh) {
						o.castShadow = false;
						o.receiveShadow = false;
					}
				});
				// This rig has two stacked nodes sharing the name "Hips": an
				// outer wrapper carrying the actual animated root-motion
				// translation, and an inner bone (zero local offset, always)
				// that the skinning system deforms against. `traverse` visits
				// parent before child, so the loop above lands on the inner
				// one -- walk back up to the real mover.
				if (hips.parent && hips.parent.name === hips.name) hips = hips.parent;

				scene.add(fbx);

				const clip = fbx.animations[0];
				mixer = new THREE.AnimationMixer(fbx);
				action = mixer.clipAction(clip);
				action.play();
				clipDuration = clip.duration;

				// Measure the clip's real root motion once, in *both* spaces
				// -- world space sizes the stair tiles (a scene-space
				// object unrelated to the bone hierarchy), local space is
				// what root-motion cancellation actually manipulates
				// (`hips.position` is local). These aren't interchangeable
				// by just adding one to the other: the bone chain above
				// Hips can carry rotation, which a world-space delta
				// doesn't survive translating into local space unchanged.
				const worldStart = new THREE.Vector3();
				const worldEnd = new THREE.Vector3();
				const rightToeStart = new THREE.Vector3();

				action.time = 0;
				mixer.update(0);
				fbx.updateMatrixWorld(true);
				hips.getWorldPosition(worldStart);
				hipsStart.copy(hips.position);
				rightToe.getWorldPosition(rightToeStart);

				action.time = clipDuration;
				mixer.update(0);
				fbx.updateMatrixWorld(true);
				hips.getWorldPosition(worldEnd);
				hipsEnd.copy(hips.position);

				climbVector.subVectors(worldEnd, worldStart);

				// One tile = one full clip loop = STEPS_PER_TILE steps, so
				// the stairs visually advance exactly one tile per stride
				// cycle -- riser/tread fall straight out of the measured
				// per-loop rise/advance instead of being guessed.
				const riser = climbVector.y / STEPS_PER_TILE;
				const tread = climbVector.z / STEPS_PER_TILE;
				const width = 110;

				// tileOrigin anchors tread 0's surface to where the right foot
				// is actually planted at the start of the clip (sampled above),
				// rather than a guessed fraction of one riser -- an earlier,
				// eyeballed offset put the tread about 8 units above the real
				// planted foot (confirmed by sampling RightToeBase across the
				// whole clip: it stays put at this exact point through the
				// start of the stride, then swings forward/up to land one full
				// climbVector higher, which is what fixes STEPS_PER_TILE at 2
				// in the first place). Centered under the foot in Z as well.
				tileGroup = new THREE.Group();
				tileOrigin = new THREE.Vector3(0, rightToeStart.y - riser, rightToeStart.z - tread / 2);
				for (let i = 0; i < TILE_COUNT; i++) {
					const tile = buildStairTile(STEPS_PER_TILE, riser, tread, width);
					tileSlot[i] = i;
					tileGroup.add(tile);
				}
				scene.add(tileGroup);
				updateStairs(0);

				// Side-on-ish framing: far enough back along -X/-Z to read
				// as "a person on a staircase," not a close-up, angled in
				// just enough to also show a few steps receding ahead.
				camera.position.set(210, hipsStart.y + 55, -190);
				camera.lookAt(0, hipsStart.y + CAMERA_TARGET_Y_OFFSET, 40);

				resize();
				scrubTo(0);
				playRaf = requestAnimationFrame(playFrame);
			},
			undefined,
			err => console.error('[TowerClimb] FBX load failed', err),
		);
	});

	onDestroy(() => {
		destroyed = true;
		if (playRaf) cancelAnimationFrame(playRaf);
		if (resizeObserver) resizeObserver.disconnect();
		if (renderer) renderer.dispose();
		scene?.traverse(o => {
			if (o.isMesh) {
				o.geometry?.dispose();
				if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
				else o.material?.dispose();
			}
		});
	});
</script>

<div class="tower-climb" bind:this={containerEl}>
	<canvas bind:this={canvasEl}></canvas>
</div>

<style>
	.tower-climb {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: radial-gradient(circle at 50% 30%, #262b33, #101216 85%);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
