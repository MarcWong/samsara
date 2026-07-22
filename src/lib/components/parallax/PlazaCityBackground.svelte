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

	// `onScreenQuad`: fires with the TV screen glass's own projected corners
	// (as a CSS matrix3d + reference size) any time the camera/viewport
	// changes, so Plaza.svelte can warp its DOS-window overlays to sit
	// flush on the glass instead of drifting off it once the TV is tilted.
	// The camera itself is otherwise completely static now -- country,
	// orientation, and property allocation all play out as different
	// window content on this one same screen, never a scene/view change.
	let { flying = false, onScreenQuad = null } = $props();

	let canvasEl;
	let containerEl;
	let renderer, scene, camera, resizeObserver;
	let destroyed = false;

	// The screen glass's four corners in the *screen mesh's own local
	// space*, measured directly from the geometry: this model tags its
	// screen with a dedicated material ("Screen.001") in a multi-material
	// mesh, so the vertex range of that material group *is* the glass --
	// its bounding box gives exact corners, no empirical pixel calibration
	// needed (unlike the previous retro_tv, whose glass shared the body
	// material). Local-space corners are intrinsic to the model, so they
	// hold regardless of how the object is scaled, moved, or rotated --
	// only their screen-space projection needs redoing on camera/viewport
	// changes.
	let screenMesh = null; // the mesh carrying the glass corners' local frame
	let glassCorners = null; // 4 THREE.Vector3, mesh-local, unordered -- fitted exactly to the "Screen" material's own geometry, used for framing math (tvScale, facing, centering)
	let overlayCorners = null; // same center as glassCorners but scaled out to the model's visible bezel edges -- used only for the DOM overlay quad

	// The "Screen" material's own geometry is measurably inset from the
	// visible dark bezel opening on this model (confirmed live: the DOS
	// overlay only covered a fraction of the glass, leaving a wide unlit
	// margin) -- scale the fitted rectangle outward from its own center so
	// the overlay reaches the real edges instead. Framing math still uses
	// the unscaled glassCorners, since that ratio was tuned against the
	// model's actual proportions, not the overlay's.
	const GLASS_FIT_SCALE = 1.8;

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
	// width is arbitrary; height is derived from the glass's own measured
	// aspect ratio after load, so the un-warped content inside doesn't get
	// stretched before the perspective warp is even applied.
	const QUAD_REF_W = 340;
	let quadRefH = 175;

	function updateScreenQuad() {
		if (!onScreenQuad || !screenMesh || !overlayCorners || !camera || !containerEl) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		if (!w || !h) return;

		screenMesh.updateMatrixWorld(true);
		const projected = overlayCorners.map(local => {
			const world = screenMesh.localToWorld(local.clone());
			const ndc = world.clone().project(camera);
			return { world, x: ((ndc.x + 1) / 2) * w, y: ((1 - ndc.y) / 2) * h };
		});
		// Label corners by their projected position rather than assuming
		// which local axis is up/right -- the two smallest-y points are the
		// top edge, and within each edge smaller x is left. This holds for
		// any model axis convention as long as the screen is roughly
		// upright in frame (it is: the camera has no roll).
		const byY = [...projected].sort((a, b) => a.y - b.y);
		const [t1, t2, b1, b2] = byY;
		const topLeft = t1.x <= t2.x ? t1 : t2;
		const topRight = t1.x <= t2.x ? t2 : t1;
		const bottomLeft = b1.x <= b2.x ? b1 : b2;
		const bottomRight = b1.x <= b2.x ? b2 : b1;

		// True source aspect from the glass's *world-space* edge lengths of
		// the labeled corners -- deriving it from local bbox axes guessed
		// which axis was width vs height and had it inverted for this
		// model's axis convention, which pre-stretched all overlay text.
		const wLen = topLeft.world.distanceTo(topRight.world);
		const hLen = topLeft.world.distanceTo(bottomLeft.world);
		quadRefH = Math.round(QUAD_REF_W * (hLen / Math.max(wLen, 0.001))) || quadRefH;

		const src = [
			{ x: 0, y: 0 },
			{ x: QUAD_REF_W, y: 0 },
			{ x: QUAD_REF_W, y: quadRefH },
			{ x: 0, y: quadRefH },
		];
		const h_ = solveHomography(src, [topLeft, topRight, bottomRight, bottomLeft]);
		onScreenQuad({
			matrix3d: homographyToMatrix3d(h_),
			width: QUAD_REF_W,
			height: quadRefH,
		});
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
		// never needed lights -- only the TV prop's PBR material does. The
		// key light used to be warm (0xffe2b0, an amber practical-light
		// color) to match the alley photo's own color temperature, but that
		// cast a distinct brown/amber tint across the TV's plastic housing
		// and its ambient spill read as a warm haze over the whole shot --
		// confirmed live, removed per request. Both lights now sit at a
		// neutral-to-cool color temperature instead, so the housing reads
		// as true dark plastic rather than tinted.
		scene.add(new THREE.HemisphereLight(0x5a6b8f, 0x0a0710, 0.75));
		const key = new THREE.DirectionalLight(0xdfe6f2, 1.0);
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
			new Promise((resolve, reject) =>
				fbxLoader.load(`${base}/models/low-poly-80s-computer-v3/source/Old Computer V3.fbx`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				textureLoader.load(`${base}/models/low-poly-80s-computer-v3/textures/Old_Computer_V3.png`, resolve, undefined, reject),
			),
			new Promise((resolve, reject) =>
				textureLoader.load(
					`${base}/models/low-poly-80s-computer-v3/textures/Screen_DiffuseColor.png`,
					resolve,
					undefined,
					reject,
				),
			),
			new Promise((resolve, reject) =>
				textureLoader.load(`${base}/models/low-poly-80s-computer-v3/textures/Screen_Emit.png`, resolve, undefined, reject),
			),
		])
			.then(([gltf, tvFbx, bodyColor, screenColor, screenEmit]) => {
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

				// The computer: FBXLoader can't resolve textures on its own
				// (the FBX's baked-in paths point at wherever the artist's
				// disk had them, not this project), so they're loaded
				// separately above and wired into fresh materials here --
				// the body gets its atlas texture, the screen gets its own
				// diffuse plus an emissive map so the glass reads as lit.
				bodyColor.colorSpace = THREE.SRGBColorSpace;
				screenColor.colorSpace = THREE.SRGBColorSpace;
				screenEmit.colorSpace = THREE.SRGBColorSpace;
				const bodyMaterial = new THREE.MeshStandardMaterial({
					map: bodyColor,
					roughness: 0.8,
					metalness: 0.1,
				});
				const screenMaterial = new THREE.MeshStandardMaterial({
					map: screenColor,
					emissive: 0xffffff,
					emissiveMap: screenEmit,
					emissiveIntensity: 0.5,
					roughness: 0.4,
					metalness: 0.0,
				});
				// Multi-material mesh: the body and the screen are geometry
				// groups on one mesh, distinguished by material name. Swap
				// each slot for our own material and remember which slot is
				// the screen -- its vertex group is measured below.
				let screenMatIndex = -1;
				tvFbx.traverse(node => {
					if (!node.isMesh) return;
					node.frustumCulled = false;
					if (Array.isArray(node.material)) {
						node.material = node.material.map((m, i) => {
							if (/screen/i.test(m.name)) {
								screenMatIndex = i;
								screenMesh = node;
								return screenMaterial;
							}
							return bodyMaterial;
						});
					} else {
						node.material = /screen/i.test(node.material?.name ?? '') ? screenMaterial : bodyMaterial;
					}
				});

				// Measure the glass straight off the geometry the screen
				// material group covers -- but as a *plane fit*, not a bbox:
				// this model's monitor face is slightly rotated relative to
				// the mesh's own axes, so bbox-face corners both missed the
				// real glass rectangle and gave a wrong normal (confirmed
				// live: overlay drifting off the glass, machine yawed
				// off-axis). Area-weighted triangle normals give the true
				// glass normal; the corners are the vertex extents along the
				// two in-plane axes.
				let glassNormalLocal = null;
				if (screenMesh && screenMatIndex >= 0) {
					const geo = screenMesh.geometry;
					const pos = geo.attributes.position;
					const idx = geo.index;
					const readV = (i, out) => {
						const vi = idx ? idx.getX(i) : i;
						out.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
					};
					const va = new THREE.Vector3();
					const vb = new THREE.Vector3();
					const vc = new THREE.Vector3();
					const e1 = new THREE.Vector3();
					const e2 = new THREE.Vector3();
					const normal = new THREE.Vector3();
					const centroid = new THREE.Vector3();
					let vertCount = 0;
					for (const g of geo.groups) {
						if (g.materialIndex !== screenMatIndex) continue;
						for (let i = g.start; i < g.start + g.count; i += 3) {
							readV(i, va);
							readV(i + 1, vb);
							readV(i + 2, vc);
							e1.subVectors(vb, va);
							e2.subVectors(vc, va);
							normal.add(e1.cross(e2)); // e1 becomes the cross product
							centroid.add(va).add(vb).add(vc);
							vertCount += 3;
						}
					}
					if (vertCount > 0) {
						normal.normalize();
						centroid.multiplyScalar(1 / vertCount);
						const ref = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
						const uAxis = new THREE.Vector3().crossVectors(ref, normal).normalize();
						const vAxis = new THREE.Vector3().crossVectors(normal, uAxis).normalize();
						let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
						const p = new THREE.Vector3();
						for (const g of geo.groups) {
							if (g.materialIndex !== screenMatIndex) continue;
							for (let i = g.start; i < g.start + g.count; i++) {
								readV(i, p);
								p.sub(centroid);
								const du = p.dot(uAxis);
								const dv = p.dot(vAxis);
								if (du < uMin) uMin = du;
								if (du > uMax) uMax = du;
								if (dv < vMin) vMin = dv;
								if (dv > vMax) vMax = dv;
							}
						}
						glassCorners = [
							[uMin, vMin],
							[uMax, vMin],
							[uMax, vMax],
							[uMin, vMax],
						].map(([du, dv]) =>
							centroid.clone().addScaledVector(uAxis, du).addScaledVector(vAxis, dv),
						);
						overlayCorners = [
							[uMin, vMin],
							[uMax, vMin],
							[uMax, vMax],
							[uMin, vMax],
						].map(([du, dv]) =>
							centroid
								.clone()
								.addScaledVector(uAxis, du * GLASS_FIT_SCALE)
								.addScaledVector(vAxis, dv * GLASS_FIT_SCALE),
						);
						glassNormalLocal = normal.clone();
					}
				}

				// Same measure-after-load approach as every other prop this
				// session -- scale relative to the alley's own measured
				// radius rather than a guessed absolute number. The framing
				// target is the *glass's* own world height (not the whole
				// machine's): this model is mostly tower unit, and sizing by
				// overall height would leave the actual screen tiny. 0.055
				// is the old TV's effective glass height (0.078 model x
				// ~0.71 glass fraction), keeping the close-up equally tight.
				// The FBX root carries the loader's own -PI/2 X correction
				// (Z-up source), so yawing it directly composes on a tilted
				// axis (Euler XYZ applies X *after* Y) -- confirmed live as
				// a lying-back, skewed pose. A wrapper rig owns yaw and
				// position on a clean world-Y axis; the FBX keeps its baked
				// uprighting rotation untouched inside it.
				const rig = new THREE.Group();
				rig.add(tvFbx);
				scene.add(rig);
				rig.updateMatrixWorld(true);
				let glassWorldHeight = 0;
				if (screenMesh && glassCorners) {
					const ys = glassCorners.map(c => screenMesh.localToWorld(c.clone()).y);
					glassWorldHeight = Math.max(...ys) - Math.min(...ys);
				}
				if (!glassWorldHeight) {
					const preBox = new THREE.Box3().setFromObject(tvFbx);
					glassWorldHeight = preBox.getSize(new THREE.Vector3()).y * 0.5;
				}
				// Pulled back from the 0.075 full-glass close-up: at that
				// tightness the machine's dark body swallowed the whole
				// frame and nothing read as "a computer" -- this keeps the
				// screen comfortably readable while the monitor, tower and
				// alley context stay in view.
				const tvScale = (alleyRadius * 0.042) / Math.max(glassWorldHeight, 0.001);
				tvFbx.scale.multiplyScalar(tvScale);

				// Face the camera: the glass normal in world space is the
				// direction from the model's center to the glass's own
				// center (projected to the ground plane); yaw the rig so
				// that direction points at +Z, i.e. straight into the
				// (fixed, -Z-looking) camera -- dead-on, matching the
				// perpendicular framing requested for the old TV.
				rig.updateMatrixWorld(true);
				const glassCenterLocal = glassCorners
					? glassCorners
							.reduce((acc, c) => acc.add(c), new THREE.Vector3())
							.multiplyScalar(0.25)
					: new THREE.Vector3();
				const glassCenterWorld = screenMesh
					? screenMesh.localToWorld(glassCenterLocal.clone())
					: new THREE.Vector3();
				// The facing direction is the glass plane's fitted normal
				// carried into world space (sign disambiguated toward the
				// outside of the body) -- not an offset from the model's
				// center: this monitor sits at the side of the machine, so a
				// center-to-glass vector points diagonally and yawed the
				// whole thing off-axis (confirmed live).
				const tvBox = new THREE.Box3().setFromObject(tvFbx);
				const tvCenter = tvBox.getCenter(new THREE.Vector3());
				if (screenMesh && glassNormalLocal) {
					const facing = screenMesh
						.localToWorld(glassCenterLocal.clone().add(glassNormalLocal))
						.sub(glassCenterWorld);
					const outward = new THREE.Vector3().subVectors(glassCenterWorld, tvCenter);
					if (facing.dot(outward) < 0) facing.negate();
					const facingFlat = facing.clone();
					facingFlat.y = 0;
					if (facingFlat.lengthSq() > 0) {
						rig.rotation.y = -Math.atan2(facingFlat.x, facingFlat.z);
						rig.updateMatrixWorld(true);
					}

					// The monitor's glass is also pitched slightly (typical
					// CRT ergonomics) -- yaw alone left it facing a bit
					// down/up-and-inward relative to the level camera, so the
					// overlay never sat perfectly flush. Tip it level with a
					// further LOCAL-X rotation via rotateX(), which composes
					// as "apply on top of the current (yawed) orientation" --
					// unlike setting .rotation.x directly, which is a fixed
					// Euler-XYZ component and does NOT mean "then also pitch"
					// (it's evaluated before the yaw in that convention, so
					// assigning it after yaw silently produced a wrong,
					// wildly different combined rotation).
					const n2 = screenMesh
						.localToWorld(glassCenterLocal.clone().add(glassNormalLocal))
						.sub(screenMesh.localToWorld(glassCenterLocal.clone()));
					// Yawing about world Y never changes the Y component, so
					// n2.y is already the local-Y (pitch-plane) component.
					// The other pitch-plane axis is the rig's own *current*
					// local Z direction in world space -- not world Z --
					// since for a large yaw those diverge substantially.
					const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion);
					const zComp = n2.dot(localZ);
					rig.rotateX(Math.atan2(n2.y, zComp));
					rig.updateMatrixWorld(true);
				}

				// Center the *screen* (not the whole machine) on the camera
				// axis, so the glass sits square in the middle of frame no
				// matter where it lives on the model (this computer's
				// monitor sits atop a tower unit, well off the model's own
				// center).
				const centeredGlass = screenMesh
					? screenMesh.localToWorld(glassCenterLocal.clone())
					: tvBox.getCenter(new THREE.Vector3());
				rig.position.sub(centeredGlass);
				// Dolly the whole rig closer rather than re-touching tvScale
				// (which sets the *body-to-glass* ratio, not the overall
				// zoom): with the fixed 78deg-FOV camera at the origin,
				// apparent size on screen is glassHeight/distance, so a
				// smaller push-back here enlarges the machine and its DOS
				// overlay together, in lockstep -- the computer stays fully
				// visible (per the prior request) while the overlay content
				// is no longer undersized relative to it.
				rig.position.z -= alleyRadius * 0.075;
				updateScreenQuad();

				render();
			})
			.catch(err => console.error('[PlazaCityBackground] load failed', err));

		resize();
		render();
	});

	onDestroy(() => {
		destroyed = true;
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
