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
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	// Real-time playback rate, as a multiple of the clip's own authored
	// speed (1 = exactly as animated). Was 1.4 (faster than authored); now
	// slower than authored by request -- the climb should read as a long,
	// deliberate ascent, not a brisk walk.
	const SPEED = 0.55;

	// Number of stair tiles kept alive at once, and how many stair steps
	// live inside each tile. Tile count just needs to comfortably outlast
	// whatever's in the camera frustum plus margin -- tuned empirically.
	const TILE_COUNT = 7;
	const STEPS_PER_TILE = 2;

	// Trajectory's story-text log panel covers most of the screen's
	// vertical center, so the character is framed low rather than dead
	// center -- same reasoning as the rest of this app's overlay-avoidance.
	// Was -18, then -5, then +8 -- all still revealed the same flat,
	// rooftop-like patch at the very bottom of frame where the skysphere's
	// nadir distorts into a visible "floor." The issue isn't the *center*
	// look direction so much as the *bottom edge* of a 40°-FOV frame, which
	// sits (FOV/2) below whatever the center points at -- confirmed live
	// that even nudging the center from ~11° down to ~9° down barely moved
	// the bottom edge (31°->29° down) and changed nothing visible. +90
	// (near-level) cleared it but overshot into looking mostly at open sky;
	// +20 is the value that actually clears the nadir patch live while still
	// keeping the character, city diorama, and tower sliver in frame.
	const CAMERA_TARGET_Y_OFFSET = 20;

	// Screen-right for this camera's fixed position/lookAt: forward's X/Z =
	// (-210, 230) regardless of CAMERA_TARGET_Y_OFFSET (Y doesn't factor into
	// a cross product with world-up), so right = normalize(-forward.z, 0,
	// forward.x) is this constant -- same cross(forward, up) basis used for
	// every other camera-relative placement this session, just precomputed
	// since it never changes for this particular camera.
	const SCREEN_RIGHT = new THREE.Vector3(-0.7385, 0, -0.6742);

	// The tower's core: a huge cylinder parked mostly off-frame to the right
	// (only its near edge, closest to the stairs, actually visible -- "the
	// tower is enormous relative to a person" per request), with the stairs
	// curving to hug that edge as they climb (see CURVE_PER_TILE below)
	// instead of running dead straight.
	const CYLINDER_RADIUS = 5200;
	const CYLINDER_HEIGHT = 9000;
	// Radians of curve applied per tile-length (one full climbVector, i.e.
	// STEPS_PER_TILE steps) of distance from the character -- 0 right at
	// their feet (matching their actual, real, straight-line mocap stride
	// exactly) growing further out, so the staircase reads as spiraling away
	// into the distance without ever having to bend the animation itself.
	const CURVE_PER_TILE = 0.075;
	// Total individual step meshes kept alive -- each one is now its own
	// rigid unit (see buildStepGeometry) rather than a shared multi-step
	// tile, so the curve can be evaluated at every step boundary instead of
	// once per tile.
	const STEP_COUNT = TILE_COUNT * STEPS_PER_TILE;
	let cylinderCenter = new THREE.Vector3();
	// riser/tread/width are measured from the character's own mocap stride
	// once the FBX loads (see onMount) -- declared here so updateStairs can
	// read them every frame without threading them through as arguments.
	let riser = 0, tread = 0, stairWidth = 0;

	let canvasEl;
	let containerEl;

	let renderer, scene, camera;
	let mixer, action, clipDuration = 0;
	let hips;
	let hipsStart = new THREE.Vector3();
	let hipsEnd = new THREE.Vector3();
	let climbVector = new THREE.Vector3();
	let tileGroup, tileOrigin;
	let stepSlot = []; // per-step effective stack index (step units), only ever increases
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

	// Evaluates the curved centerline + width direction at a single point in
	// the stride, in "tile units" (1.0 = one full climbVector, i.e. one full
	// gait cycle) -- the exact same formula used everywhere in this file for
	// "where does stackOffset s sit once swept around cylinderCenter."
	// Writing into a shared `out` object (not allocating a Vector3) since
	// this runs twice per step, STEP_COUNT times, every frame.
	function boundaryFrame(stackOffset, out) {
		tmpVec.copy(climbVector).multiplyScalar(stackOffset);
		const sx = tileOrigin.x + tmpVec.x;
		const sy = tileOrigin.y + tmpVec.y;
		const sz = tileOrigin.z + tmpVec.z;
		const angle = CURVE_PER_TILE * stackOffset;
		const cosA = Math.cos(angle);
		const sinA = Math.sin(angle);
		const relX = sx - cylinderCenter.x;
		const relZ = sz - cylinderCenter.z;
		out.x = cylinderCenter.x + relX * cosA - relZ * sinA;
		out.y = sy;
		out.z = cylinderCenter.z + relX * sinA + relZ * cosA;
		out.rightX = cosA; // curved width direction (rotated local +X), unit length
		out.rightZ = sinA;
	}

	const frameFront = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 };
	const frameBack = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 };

	// Writes one step's 24 vertices (top, front riser, left, right -- back
	// and bottom are never in view, tucked inside the stack) straight into
	// a step mesh's own position-attribute array.
	//
	// An earlier version gave each *tile* (a rigid block of several steps)
	// one single rotation and swept the whole thing around cylinderCenter --
	// simple, but every tile boundary showed a visible gap, because a rigid
	// block rotated once by its own front angle doesn't reach the same
	// point its neighbor's front edge computes independently. At this
	// tower's radius (thousands of units), even a small per-tile angle
	// difference is a gap hundreds of units wide.
	//
	// This version calls boundaryFrame() once per step *boundary* instead --
	// and since adjacent steps are built with s1 of one exactly equal to s0
	// of the next, both compute that shared edge from the identical
	// function call, so the edge doesn't just nearly line up, it's the same
	// point by construction, at any radius or curve rate.
	function buildStepGeometry(s0, s1, positions) {
		boundaryFrame(s0, frameFront);
		boundaryFrame(s1, frameBack);
		const halfW = stairWidth / 2;

		const ftlX = frameFront.x - frameFront.rightX * halfW, ftlZ = frameFront.z - frameFront.rightZ * halfW;
		const ftrX = frameFront.x + frameFront.rightX * halfW, ftrZ = frameFront.z + frameFront.rightZ * halfW;
		const btlX = frameBack.x - frameBack.rightX * halfW, btlZ = frameBack.z - frameBack.rightZ * halfW;
		const btrX = frameBack.x + frameBack.rightX * halfW, btrZ = frameBack.z + frameBack.rightZ * halfW;
		const topFY = frameFront.y, topBY = frameBack.y;
		// Bottom = top minus exactly one riser, at each end -- since the
		// *next* step's own front-top is this step's back-top plus one more
		// riser (both derived from the same monotonic climbVector.y), a
		// one-riser-tall block stacks flush with no vertical gap either.
		const botFY = topFY - riser, botBY = topBY - riser;

		let p = 0;
		const put = (x, y, z) => {
			positions[p++] = x;
			positions[p++] = y;
			positions[p++] = z;
		};

		// top (walked-on surface)
		put(ftlX, topFY, ftlZ); put(ftrX, topFY, ftrZ); put(btrX, topBY, btrZ);
		put(ftlX, topFY, ftlZ); put(btrX, topBY, btrZ); put(btlX, topBY, btlZ);
		// front riser -- faces the character, at the s0/front boundary
		put(ftlX, topFY, ftlZ); put(ftlX, botFY, ftlZ); put(ftrX, botFY, ftrZ);
		put(ftlX, topFY, ftlZ); put(ftrX, botFY, ftrZ); put(ftrX, topFY, ftrZ);
		// left side
		put(ftlX, topFY, ftlZ); put(btlX, topBY, btlZ); put(btlX, botBY, btlZ);
		put(ftlX, topFY, ftlZ); put(btlX, botBY, btlZ); put(ftlX, botFY, ftlZ);
		// right side
		put(ftrX, topFY, ftrZ); put(ftrX, botFY, ftrZ); put(btrX, botBY, btrZ);
		put(ftrX, topFY, ftrZ); put(btrX, botBY, btrZ); put(btrX, topBY, btrZ);
	}

	// The treadmill: each step has a fixed "home" slot (0..STEP_COUNT-1, in
	// step units) and a mutable `stepSlot[k]` that only ever jumps upward by
	// STEP_COUNT. A step's front boundary is (slot - elapsedSteps) step
	// units from tileOrigin -- as elapsed grows this drifts toward and past
	// the origin (climbing past the character), and once it's fallen a full
	// step behind, its slot jumps forward by STEP_COUNT, landing it back at
	// the top of the stack. Positions this way never grow beyond roughly
	// [-1, STEP_COUNT-1] steps from tileOrigin, regardless of how long
	// `elapsed` has been running.
	function updateStairs(elapsed) {
		const elapsedSteps = elapsed * STEPS_PER_TILE;
		for (let k = 0; k < STEP_COUNT; k++) {
			while (stepSlot[k] - elapsedSteps < -1) stepSlot[k] += STEP_COUNT;
			const s0 = (stepSlot[k] - elapsedSteps) / STEPS_PER_TILE;
			const s1 = s0 + 1 / STEPS_PER_TILE;
			const mesh = tileGroup.children[k];
			buildStepGeometry(s0, s1, mesh.geometry.attributes.position.array);
			mesh.geometry.attributes.position.needsUpdate = true;
			mesh.geometry.computeVertexNormals();
			mesh.geometry.computeBoundingSphere();
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

	// One step mesh with an empty, preallocated position buffer -- the real
	// vertices are written every frame by buildStepGeometry (they have to
	// be: each step's curved shape depends on where it currently sits in
	// the treadmill cycle). 4 open faces (top, front riser, left, right) x
	// 2 triangles x 3 vertices, non-indexed so each face gets its own flat
	// normal via computeVertexNormals() rather than smoothing across edges.
	function buildStepMesh(material) {
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 2 * 3 * 3), 3));
		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = false;
		mesh.receiveShadow = false;
		mesh.frustumCulled = false;
		return mesh;
	}

	// This staircase is *inside* the tower, not near a separate one --
	// so the surrounding city is the skysphere backdrop CitySkyboxBackground
	// uses (same technique: camera parked at the sphere's own center reads
	// as an immersive infinite backdrop), scaled down to this scene's much
	// smaller (human/stair) scale instead of CityIntro's huge one, and a
	// central cylinder standing in for the tower's own core -- textured with
	// centinel_beam's real material rather than a plain color -- runs
	// alongside the stairs the way a spiral staircase wraps a central shaft.
	function loadTowerScenery() {
		const textureLoader = new THREE.TextureLoader();
		const skyLoader = new FBXLoader();
		const towerLoader = new GLTFLoader();

		Promise.all([
			new Promise((resolve, reject) =>
				textureLoader.load(
					`${base}/models/stylized_skybox_cityskyline_001/Stylized_Skybox_CitySkyline_Panorama_001.png`,
					resolve,
					undefined,
					reject,
				),
			),
			new Promise((resolve, reject) => skyLoader.load(`${base}/models/skysphere.fbx`, resolve, undefined, reject)),
			new Promise((resolve, reject) => towerLoader.load(`${base}/models/centinel_beam.glb`, resolve, undefined, reject)),
		])
			.then(([texture, skyFbx, towerGltf]) => {
				if (destroyed) return;

				texture.colorSpace = THREE.SRGBColorSpace;
				texture.wrapS = THREE.RepeatWrapping;
				texture.repeat.x = -1; // same seam-direction fix as CitySkyboxBackground

				// DoubleSide (this FBX sphere's winding faces outward, confirmed
				// in CitySkyboxBackground), depthWrite:false + renderOrder -1
				// (standard skybox practice), and fog:false -- the whole point
				// of a skysphere is to read as infinitely far away, so the
				// scene's fog (tuned for the human-scale stairs a few hundred
				// units out) shouldn't wash it out just because its geometry
				// technically sits at a finite radius.
				const skyMaterial = new THREE.MeshBasicMaterial({
					map: texture,
					side: THREE.DoubleSide,
					depthWrite: false,
					fog: false,
				});
				skyFbx.traverse(node => {
					if (node.isMesh) {
						node.material = skyMaterial;
						node.frustumCulled = false;
						node.renderOrder = -1;
					}
				});
				scene.add(skyFbx);

				// Same measure-after-load approach as everywhere else this
				// asset's been used: don't trust its native scale, size it
				// relative to *this* scene instead (a few hundred units, not
				// CityIntro's ~170,000) and recenter it on the camera -- the
				// camera never moves in this scene, so a one-time recenter is
				// enough, no per-frame follow needed.
				const skyBox = new THREE.Box3().setFromObject(skyFbx);
				const skySphere = new THREE.Sphere();
				skyBox.getBoundingSphere(skySphere);
				const targetSkyRadius = 800;
				skyFbx.scale.multiplyScalar(targetSkyRadius / Math.max(skySphere.radius, 0.001));
				skyBox.setFromObject(skyFbx);
				skyBox.getBoundingSphere(skySphere);
				skyFbx.position.sub(skySphere.center).add(camera.position);

				// The tower's own emissive "light strip" material (mostly
				// black with bright cyan/magenta emissive accents) rather
				// than its metal hull -- confirmed live that the hull's
				// material reads as a flat, undetailed brown on a plain
				// cylinder, since stock CylinderGeometry UVs sample a mostly-
				// uniform patch of that texture's atlas rather than its
				// painted detail. The emissive strip material is forgiving of
				// that mismatch (mostly-black-plus-bright-accents looks like
				// glowing tech lines regardless of exact UV alignment) and
				// matches the neon language used everywhere else in the app.
				// Tall enough that its top/bottom are never in frame, so
				// unlike the stairs it needs no treadmill recycling. Radius
				// keeps it just behind/inside the stairs' own width (110)
				// rather than swallowing them.
				let coreMaterial = null;
				towerGltf.scene.traverse(node => {
					if (node.isMesh && node.material?.name?.includes('LIGHT')) coreMaterial = node.material;
				});
				if (!coreMaterial) {
					towerGltf.scene.traverse(node => {
						if (node.isMesh && !coreMaterial) coreMaterial = node.material;
					});
				}
				if (coreMaterial) {
					coreMaterial.side = THREE.DoubleSide;
					// The source material's own KHR_texture_transform (repeat
					// ~10x10, tuned for the actual tower mesh's UV layout) reads
					// as fine TV-static noise stretched over a cylinder this
					// large -- coarser tiling here reads as distinct glowing
					// panels/lines instead, closer to how it looks on the real
					// tower. Only a narrow arc of this cylinder is ever actually
					// in frame (see CYLINDER_RADIUS/cylinderCenter), so the
					// tiling only needs to look right across that small slice,
					// not its full huge circumference.
					if (coreMaterial.map) {
						coreMaterial.map.wrapS = THREE.RepeatWrapping;
						coreMaterial.map.wrapT = THREE.RepeatWrapping;
						coreMaterial.map.repeat.set(3, 5);
					}
					if (coreMaterial.emissiveMap) {
						coreMaterial.emissiveMap.wrapS = THREE.RepeatWrapping;
						coreMaterial.emissiveMap.wrapT = THREE.RepeatWrapping;
						coreMaterial.emissiveMap.repeat.set(3, 5);
					}
					const core = new THREE.Mesh(
						new THREE.CylinderGeometry(CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_HEIGHT, 64, 1, true),
						coreMaterial,
					);
					core.frustumCulled = false;
					core.position.set(cylinderCenter.x, hipsStart.y, cylinderCenter.z);
					scene.add(core);
				}

				render();
			})
			.catch(err => console.error('[TowerClimb] scenery load failed', err));
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
				riser = climbVector.y / STEPS_PER_TILE;
				tread = climbVector.z / STEPS_PER_TILE;
				stairWidth = 110;

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

				// The cylinder's near surface sits exactly at tileOrigin (so
				// the first step, right at the character's feet, starts flush
				// against it) with the rest of its huge bulk extending away in
				// the screen-right direction, off-frame -- computed here
				// (rather than inside loadTowerScenery's async callback)
				// because updateStairs(0) below needs it immediately, well
				// before the tower texture/material has even started loading.
				// Confirmed live at this size (radius, no extra clearance) is
				// the intended look -- a large glowing presence along the
				// right edge of frame, not just a thin sliver.
				cylinderCenter.set(
					tileOrigin.x + SCREEN_RIGHT.x * CYLINDER_RADIUS,
					0,
					tileOrigin.z + SCREEN_RIGHT.z * CYLINDER_RADIUS,
				);

				const stepMaterial = new THREE.MeshStandardMaterial({
					color: 0x211d24,
					roughness: 0.85,
					metalness: 0.05,
					side: THREE.DoubleSide,
				});
				for (let k = 0; k < STEP_COUNT; k++) {
					tileGroup.add(buildStepMesh(stepMaterial));
					stepSlot[k] = k;
				}
				scene.add(tileGroup);
				updateStairs(0);

				// Side-on-ish framing: far enough back along -X/-Z to read
				// as "a person on a staircase," not a close-up, angled in
				// just enough to also show a few steps receding ahead.
				camera.position.set(210, hipsStart.y + 55, -190);
				camera.lookAt(0, hipsStart.y + CAMERA_TARGET_Y_OFFSET, 40);

				loadTowerScenery();

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
