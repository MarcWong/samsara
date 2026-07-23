<script>
	// Treadmill technique: the character never actually moves up the Y axis --
	// it plays its climbing animation in place (root motion measured, then
	// subtracted out frame to frame) at a fixed spot on screen, while the
	// stairs scroll the opposite way (backward/down, matching the character's
	// measured stride) and get teleported back to the top the instant they
	// scroll out of frame. This is deliberate: letting the character (or
	// camera) actually climb without bound is exactly what causes
	// float-precision drift and camera-follow bugs on a long playthrough, so
	// nothing here ever accumulates -- every moving part's position is bounded
	// at all times.
	//
	// The scene is the *inside* of the tower now, not its exterior: a
	// cylindrical shaft whose wall the staircase hugs as a true helix, a
	// bundle of square core pillars in the middle, and a decorative endless
	// spiral of dimly glowing steps winding the full visible height of the
	// shaft -- the classic sci-fi "infinite spiral stairwell" interior, kept
	// in this app's dim indigo/teal palette. Everything is procedural
	// geometry; this scene loads no skysphere or tower model at all anymore.
	//
	// Ascent illusion inside the shaft: the active steps under the character
	// scroll via the same slot-based treadmill as before (now along the
	// helix), while the decorative spiral + wall rings live in one group that
	// rotates about the shaft axis and sinks, wrapped modulo exactly one full
	// helix turn -- a helix is invariant under (rotate 2*PI, translate one
	// turn's rise), so the wrap is invisible by construction. The wall level
	// rings are spaced exactly one turn's rise apart for the same reason, and
	// the core pillar group only rotates (a uniform vertical pillar shows no
	// vertical motion anyway), so its wrap (exactly 2*PI) is invisible too.
	//
	// Character: "Ascending Stairs.fbx" (Mixamo, `mixamorig11:` skeleton,
	// clip "mixamo.com") -- a clean, standard Mixamo export: 7 skinned parts,
	// renders correctly out of the box. Its root (Hips) motion is measured
	// once after load and used to size the stair steps, so each step's
	// rise/run matches the character's actual stride instead of a guess.
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

	// Real-time playback rate, as a multiple of the clip's own authored
	// speed (1 = exactly as animated) -- slower than authored: the climb
	// should read as a long, deliberate ascent, not a brisk walk.
	const SPEED = 0.55;

	// Number of stair tiles kept alive at once, and how many stair steps
	// live inside each tile. Tile count just needs to comfortably outlast
	// whatever's in the camera frustum plus margin -- tuned empirically.
	const TILE_COUNT = 7;
	const STEPS_PER_TILE = 2;
	const STEP_COUNT = TILE_COUNT * STEPS_PER_TILE;

	// Radius of the helical stair path around the shaft's central axis.
	// Large relative to one stride (~90 units) so the path is near-straight
	// right under the character's feet -- the mocap walks a straight line,
	// and over one tile the arc deviates from that line by only
	// tileAdvance^2 / (2 * R), a few units, well inside the stair width.
	const STAIR_RADIUS = 520;
	// Open gap between the stairs' outer edge and the shaft wall.
	const WALL_CLEARANCE = 40;
	// Glowing front-edge strip on each active step, in world units tall.
	const LIP_HEIGHT = 4;

	// Screen-right for the original exterior camera -- kept only to pick
	// *which side* of the walk line the shaft axis sits on (same side the
	// tower bulk used to be), so the framing keeps its old handedness.
	const SCREEN_RIGHT = new THREE.Vector3(-0.7385, 0, -0.6742);

	// Helix parameters, all derived from the measured stride after the FBX
	// loads: the shaft's central axis position, the angle of tileOrigin
	// around it, and the (signed) angle swept per tile of stride.
	let shaftCenter = new THREE.Vector3();
	let theta0 = 0;
	let anglePerTile = 0;
	let turnTiles = 0; // tiles per full 2*PI turn of the helix

	// riser/tread/width are measured from the character's own mocap stride
	// once the FBX loads (see onMount) -- declared here so updateStairs can
	// read them every frame without threading them through as arguments.
	let riser = 0, tread = 0, stairWidth = 0;

	let canvasEl;
	let containerEl;

	let renderer, scene, camera;
	let composer = null, bloomPass = null;
	let mixer, action, clipDuration = 0;
	let hips;
	let hipsStart = new THREE.Vector3();
	let hipsEnd = new THREE.Vector3();
	let climbVector = new THREE.Vector3();
	let tileGroup, lipGroup, tileOrigin;
	let helixGroup = null; // decorative spiral + wall rings; moves every frame
	let coreGroup = null; // central square pillars; rotates every frame
	let stepSlot = []; // per-step effective stack index (step units), only ever increases
	const tmpVec = new THREE.Vector3();

	let elapsed = 0;
	let lastFrameTime = null;
	let playRaf = null;
	let resizeObserver;
	let destroyed = false;

	function render() {
		if (composer) composer.render();
		else if (renderer && scene && camera) renderer.render(scene, camera);
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

	// Evaluates the helical centerline at a single point in the stride, in
	// "tile units" (1.0 = one full climbVector, i.e. one full gait cycle):
	// a point on the circle of radius STAIR_RADIUS around shaftCenter, at
	// angle theta0 + anglePerTile * s, risen by climbVector.y * s. rightX/Z
	// is the width direction -- radially outward, unit length -- so the
	// stairs always span from toward-the-core to toward-the-wall.
	// Writing into a shared `out` object (not allocating a Vector3) since
	// this runs multiple times per step, STEP_COUNT times, every frame.
	function boundaryFrame(stackOffset, out) {
		const angle = theta0 + anglePerTile * stackOffset;
		const cosA = Math.cos(angle);
		const sinA = Math.sin(angle);
		out.x = shaftCenter.x + cosA * STAIR_RADIUS;
		out.y = tileOrigin.y + climbVector.y * stackOffset;
		out.z = shaftCenter.z + sinA * STAIR_RADIUS;
		out.rightX = cosA;
		out.rightZ = sinA;
	}

	const frameFront = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 };
	const frameBack = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 };

	// Writes one step's 24 vertices (top, front riser, left, right -- back
	// and bottom are never in view, tucked inside the stack) straight into
	// a step mesh's own position-attribute array.
	//
	// Adjacent steps are built with s1 of one exactly equal to s0 of the
	// next, so both compute that shared edge from the identical
	// boundaryFrame() call -- the edge doesn't just nearly line up, it's the
	// same point by construction, at any radius or curve rate.
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

	// The glowing "cyber" strip along a step's front edge: one quad (6
	// verts) sitting just proud of the riser face, rebuilt every frame from
	// the same boundaryFrame the step itself uses. Rendered with an unlit
	// basic material so it reads as emissive without needing a light.
	function buildLipGeometry(s0, positions) {
		boundaryFrame(s0, frameFront);
		const halfW = stairWidth / 2;
		// Tangent along increasing s (the direction of travel), used to
		// push the quad a hair out of the riser face so it never z-fights.
		const tSign = anglePerTile >= 0 ? 1 : -1;
		const ox = frameFront.rightZ * tSign * 1.2;
		const oz = -frameFront.rightX * tSign * 1.2;
		const lx = frameFront.x - frameFront.rightX * halfW + ox;
		const lz = frameFront.z - frameFront.rightZ * halfW + oz;
		const rx = frameFront.x + frameFront.rightX * halfW + ox;
		const rz = frameFront.z + frameFront.rightZ * halfW + oz;
		const yT = frameFront.y + 0.6;
		const yB = frameFront.y - LIP_HEIGHT;

		let p = 0;
		const put = (x, y, z) => {
			positions[p++] = x;
			positions[p++] = y;
			positions[p++] = z;
		};
		put(lx, yT, lz); put(rx, yT, rz); put(rx, yB, rz);
		put(lx, yT, lz); put(rx, yB, rz); put(lx, yB, lz);
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

			const lip = lipGroup.children[k];
			buildLipGeometry(s0, lip.geometry.attributes.position.array);
			lip.geometry.attributes.position.needsUpdate = true;
		}
	}

	// Rotates + sinks the decorative spiral (and rotates the core pillars)
	// to match the active steps' scroll exactly -- same anglePerTile, same
	// rise per tile -- wrapped modulo one full helix turn so nothing here
	// accumulates either. The wrap jump is a whole-turn symmetry of the
	// helix (and a full 2*PI for the pillars), so it's invisible.
	function updateShaftMotion(elapsed) {
		if (!helixGroup || turnTiles === 0) return;
		const wrapped = elapsed % turnTiles;
		const phi = anglePerTile * wrapped;
		helixGroup.rotation.y = phi;
		helixGroup.position.y = -climbVector.y * wrapped;
		if (coreGroup) coreGroup.rotation.y = phi;
	}

	function scrubTo(e) {
		if (!action) return;
		const frac = e % 1;

		action.time = frac * clipDuration;
		mixer.update(0);
		cancelRootMotion(frac);

		updateStairs(e);
		updateShaftMotion(e);

		render();
	}

	// Free-running, real-time playback: advances `elapsed` by real elapsed
	// seconds (converted to "loops", scaled by SPEED) every frame, for as
	// long as this component is mounted -- not tied to clicks or story
	// progress at all. `lastFrameTime` resets to null on stop/start so a
	// pause (e.g. a slow frame after tab-switch) never produces one huge
	// catch-up jump.
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
		composer?.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		render();
	}

	// One step mesh with an empty, preallocated position buffer -- the real
	// vertices are written every frame by buildStepGeometry (they have to
	// be: each step's shape depends on where it currently sits in the
	// treadmill cycle). 4 open faces (top, front riser, left, right) x
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

	function buildLipMesh(material) {
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3 * 3), 3));
		const mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		return mesh;
	}

	// The shaft interior, all procedural: the enclosing wall, the central
	// bundle of square pillars, the decorative endless spiral of glowing
	// steps, and dim level rings on the wall spaced exactly one helix turn
	// apart.
	function buildShaftInterior() {
		const wallRadius = STAIR_RADIUS + stairWidth / 2 + WALL_CLEARANCE;

		const wall = new THREE.Mesh(
			new THREE.CylinderGeometry(wallRadius, wallRadius, 9000, 96, 1, true),
			new THREE.MeshStandardMaterial({
				color: 0x211e2b,
				roughness: 0.95,
				metalness: 0.1,
				side: THREE.BackSide,
			}),
		);
		wall.position.set(shaftCenter.x, tileOrigin.y, shaftCenter.z);
		wall.frustumCulled = false;
		scene.add(wall);

		coreGroup = new THREE.Group();
		coreGroup.position.set(shaftCenter.x, 0, shaftCenter.z);
		const pillarMat = new THREE.MeshStandardMaterial({ color: 0x262230, roughness: 0.85, metalness: 0.2 });
		// The pillars used to each carry a bright emissive strip on their
		// outward face; with bloom those read as a full-height light beam
		// glaring mid-frame on entry -- removed per request. The ascent
		// rotation stays readable from the helix spiral and wall rings.
		const PILLARS = 5;
		const pillarRing = 165;
		const pillarSize = 85;
		const pillarH = 9000;
		for (let i = 0; i < PILLARS; i++) {
			const a = (i / PILLARS) * Math.PI * 2;
			const px = Math.cos(a) * pillarRing;
			const pz = Math.sin(a) * pillarRing;
			const pillar = new THREE.Mesh(new THREE.BoxGeometry(pillarSize, pillarH, pillarSize), pillarMat);
			pillar.position.set(px, tileOrigin.y, pz);
			pillar.rotation.y = -a;
			pillar.frustumCulled = false;
			coreGroup.add(pillar);
		}
		scene.add(coreGroup);

		helixGroup = new THREE.Group();
		helixGroup.position.set(shaftCenter.x, 0, shaftCenter.z);

		// The decorative spiral: instanced step-sized slabs following the
		// exact same helix as the active stairs, offset slightly outward and
		// downward so the real treadmill steps sit just proud of them near
		// the character (reading as a glowing under-lip rather than
		// z-fighting). Extends far above and below the visible frame; the
		// span's ends stay hidden by fog/framing across the wrap jump.
		const sMinTiles = -60;
		const sMaxTiles = 130;
		const count = Math.floor((sMaxTiles - sMinTiles) * STEPS_PER_TILE);
		// Same visual language as the active treadmill steps: a dark slab
		// body with one thin glowing cyan strip along its leading edge --
		// so the decorative spiral and the steps underfoot read as one
		// continuous staircase, not two systems meeting at a seam.
		const arcPerStep = (Math.abs(anglePerTile) * STAIR_RADIUS) / STEPS_PER_TILE + 3;
		const slabGeo = new THREE.BoxGeometry(arcPerStep, riser, stairWidth);
		const slabMat = new THREE.MeshStandardMaterial({
			color: 0x211d24,
			roughness: 0.85,
			metalness: 0.05,
		});
		const helix = new THREE.InstancedMesh(slabGeo, slabMat, count);
		helix.frustumCulled = false;
		// In the slab's local frame x runs along the tangent (stride) and z
		// across the tread width -- the glowing edge strip spans the width.
		const stripGeo = new THREE.BoxGeometry(2.5, LIP_HEIGHT, stairWidth);
		const stripInstMat = new THREE.MeshBasicMaterial({ color: 0x5fe0f2 });
		const helixStrips = new THREE.InstancedMesh(stripGeo, stripInstMat, count);
		helixStrips.frustumCulled = false;
		const dummy = new THREE.Object3D();
		const tSign = anglePerTile >= 0 ? 1 : -1;
		for (let i = 0; i < count; i++) {
			const s = sMinTiles + i / STEPS_PER_TILE;
			const angle = theta0 + anglePerTile * s;
			// A full riser below the active steps' surface, so near the
			// character the decorative layer reads as the staircase's
			// understructure and never pokes through (or z-fights) the real
			// treadmill steps sharing this stretch of helix.
			const y = tileOrigin.y + climbVector.y * s - riser * 1.5 - 2.5;
			dummy.position.set(Math.cos(angle) * (STAIR_RADIUS + 5), y, Math.sin(angle) * (STAIR_RADIUS + 5));
			dummy.lookAt(0, y, 0);
			dummy.updateMatrix();
			helix.setMatrixAt(i, dummy.matrix);

			// The strip straddles the slab's leading (downhill-facing) edge:
			// centered on it, so it sits proud of the riser face rather than
			// coplanar with it.
			const tanX = -Math.sin(angle) * tSign;
			const tanZ = Math.cos(angle) * tSign;
			dummy.position.x -= tanX * (arcPerStep / 2);
			dummy.position.z -= tanZ * (arcPerStep / 2);
			dummy.position.y = y + riser / 2 - LIP_HEIGHT / 2 + 0.5;
			dummy.updateMatrix();
			helixStrips.setMatrixAt(i, dummy.matrix);
		}
		helixGroup.add(helix);
		helixGroup.add(helixStrips);

		// Dim level rings on the wall, spaced exactly one full turn's rise
		// apart so the helix-turn wrap maps the pattern onto itself. Unlit
		// basic material: reads as a faint self-lit line, not a lit surface.
		const risePerTurn = Math.abs(climbVector.y * turnTiles);
		const ringGeo = new THREE.CylinderGeometry(wallRadius - 6, wallRadius - 6, 3, 96, 1, true);
		const ringMat = new THREE.MeshBasicMaterial({ color: 0x7a4fd6, side: THREE.DoubleSide });
		for (let y = tileOrigin.y - 3500; y < tileOrigin.y + 4500; y += risePerTurn) {
			const ring = new THREE.Mesh(ringGeo, ringMat);
			ring.position.y = y;
			ring.frustumCulled = false;
			helixGroup.add(ring);
		}
		scene.add(helixGroup);
	}

	onMount(() => {
		scene = new THREE.Scene();
		// Exponential fog in a deep violet: the cyberpunk haze. Density is
		// scaled to this scene's units (a stride is ~90 units, the far wall
		// ~1000 away) -- the textbook 0.05 is for meter-scale scenes and
		// would white out everything here. Background matches the fog color
		// so distant geometry dissolves into it seamlessly.
		scene.background = new THREE.Color(0x130a20);
		scene.fog = new THREE.FogExp2(0x130a20, 0.0016);

		camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);

		renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Neon bloom: render through an EffectComposer with an
		// UnrealBloomPass. The threshold sits above anything the dim
		// ambient/key lighting produces on the dark surfaces, so only the
		// self-lit neon (step lips, pillar strips, rings -- their colors
		// are pushed bright specifically for this) grows a halo.
		composer = new EffectComposer(renderer);
		composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		composer.addPass(new RenderPass(scene, camera));
		bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.55, 0.35);
		composer.addPass(bloomPass);

		// Interior lighting kept deliberately minimal (one ambient + one
		// key light) -- the cyberpunk look comes from emissive neon + bloom,
		// not from stacking realtime point lights, which is also what keeps
		// the frame rate safe without a baked-lightmap pipeline.
		const ambient = new THREE.AmbientLight(0x4a4460, 2.0);
		const key = new THREE.DirectionalLight(0x9aa6c9, 1.3);
		key.position.set(-1.5, 3, -1);
		scene.add(ambient, key);

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
				// -- world space sizes the stair steps (scene-space objects
				// unrelated to the bone hierarchy), local space is what
				// root-motion cancellation actually manipulates
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
				// is actually planted at the start of the clip (sampled above).
				tileGroup = new THREE.Group();
				lipGroup = new THREE.Group();
				tileOrigin = new THREE.Vector3(0, rightToeStart.y - riser, rightToeStart.z - tread / 2);

				// Helix setup: the shaft's axis sits STAIR_RADIUS to the side
				// of the walk line (same side the old exterior tower bulk was,
				// via SCREEN_RIGHT), the base angle points from that axis back
				// at tileOrigin, and the signed angle per tile is whatever
				// makes the helix's tangent at the character's feet match the
				// mocap's actual straight-line stride direction.
				const dHoriz = new THREE.Vector3(climbVector.x, 0, climbVector.z);
				const tileAdvance = Math.max(dHoriz.length(), 0.001);
				const d = dHoriz.normalize();
				const perp = new THREE.Vector3(d.z, 0, -d.x);
				if (perp.dot(SCREEN_RIGHT) < 0) perp.multiplyScalar(-1);
				shaftCenter.set(tileOrigin.x + perp.x * STAIR_RADIUS, 0, tileOrigin.z + perp.z * STAIR_RADIUS);
				theta0 = Math.atan2(tileOrigin.z - shaftCenter.z, tileOrigin.x - shaftCenter.x);
				const tangentDot = -Math.sin(theta0) * d.x + Math.cos(theta0) * d.z;
				anglePerTile = (tangentDot >= 0 ? 1 : -1) * (tileAdvance / STAIR_RADIUS);
				turnTiles = (Math.PI * 2) / Math.abs(anglePerTile);

				const stepMaterial = new THREE.MeshStandardMaterial({
					color: 0x211d24,
					roughness: 0.85,
					metalness: 0.05,
					side: THREE.DoubleSide,
				});
					// Bright enough to clear the bloom threshold -- these are the
				// neon tubes of the scene.
				const lipMaterial = new THREE.MeshBasicMaterial({ color: 0x5fe0f2, side: THREE.DoubleSide });
				for (let k = 0; k < STEP_COUNT; k++) {
					tileGroup.add(buildStepMesh(stepMaterial));
					lipGroup.add(buildLipMesh(lipMaterial));
					stepSlot[k] = k;
				}
				scene.add(tileGroup);
				scene.add(lipGroup);

				buildShaftInterior();
				updateStairs(0);

				// Behind-and-inside framing: camera trails the character along
				// the walk direction, pulled slightly toward the shaft wall,
				// looking up the spiral ahead -- so the frame reads
				// character-low, glowing stairs curving away and up, core
				// pillars on the inner side, shaft wall wrapping the far side.
				const radialOut = new THREE.Vector3(Math.cos(theta0), 0, Math.sin(theta0));
				camera.position
					.copy(tileOrigin)
					.addScaledVector(d, -560)
					.addScaledVector(radialOut, 60);
				camera.position.y = tileOrigin.y + 300;
				camera.lookAt(
					tileOrigin.x + d.x * 140 - radialOut.x * 170,
					tileOrigin.y + 150,
					tileOrigin.z + d.z * 140 - radialOut.z * 170,
				);

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
		bloomPass?.dispose?.();
		composer?.dispose?.();
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
		background: radial-gradient(circle at 50% 30%, #1c1230, #0e081a 85%);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
