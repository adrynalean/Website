import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#scene");
const enterButton = document.querySelector("#enterButton");
const intro = document.querySelector("#intro");
const spotLabel = document.querySelector("#spotLabel");
const timeLabel = document.querySelector("#timeLabel");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d58b82");
scene.fog = new THREE.Fog("#d58b82", 30, 92);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 140);

const EYE_HEIGHT = 1.7;
const mouseSensitivity = 0.00135;
const keyboardTurnSpeed = 1.7;
const lookEase = 18;
const moveEase = 9.5;
const stopEase = 12;

const palette = {
  cedar: "#5e2e20",
  cedarDark: "#2c1713",
  cedarLight: "#8f4d2d",
  roof: "#b45725",
  roofDark: "#71311e",
  roofHighlight: "#d87b3d",
  paper: "#ffe7c2",
  paperDim: "#d8b98c",
  stone: "#7d786e",
  water: "#29385b",
  deepWater: "#182139",
  sakura: "#e7a3b3",
  sakuraLight: "#ffd1d8",
  sakuraDark: "#a95770",
  leaf: "#526943",
  grass: "#34442f",
  lantern: "#ffbd72",
  gold: "#d49a55",
};

const materials = {
  bridge: blockMaterial(palette.cedar, "#7e3c26"),
  bridgeDark: blockMaterial(palette.cedarDark, "#402019"),
  roof: blockMaterial(palette.roof, palette.roofHighlight),
  roofDark: blockMaterial(palette.roofDark, "#9b4526"),
  paper: blockMaterial(palette.paper, "#fff0ce"),
  paperDim: blockMaterial(palette.paperDim, "#e6c99b"),
  floor: blockMaterial("#734229", "#9b5e37"),
  tatami: blockMaterial("#b9a86d", "#d3c38a"),
  stone: blockMaterial(palette.stone, "#969085"),
  grass: blockMaterial(palette.grass, "#4d5f3f"),
  sakura: blockMaterial(palette.sakura, palette.sakuraLight),
  sakuraDark: blockMaterial(palette.sakuraDark, "#c8738a"),
  leaf: blockMaterial(palette.leaf, "#6f8457"),
  trunk: blockMaterial("#6a3928", "#8a5137"),
  lanternGlow: new THREE.MeshBasicMaterial({ color: palette.lantern }),
  water: new THREE.MeshPhysicalMaterial({
    color: palette.water,
    roughness: 0.2,
    metalness: 0,
    transmission: 0.08,
    transparent: true,
    opacity: 0.82,
  }),
};

const colliders = [];
const playable = [];
const animated = [];

const spots = {
  Bridge: { position: new THREE.Vector3(0, EYE_HEIGHT, 23), yaw: 0, label: "Bridge Approach" },
  Gate: { position: new THREE.Vector3(0, EYE_HEIGHT, 8.4), yaw: 0, label: "Lantern Gate" },
  Hall: { position: new THREE.Vector3(0, EYE_HEIGHT, -2.4), yaw: 0, label: "Main Hall" },
  "West Room": { position: new THREE.Vector3(-5.2, EYE_HEIGHT, -3.1), yaw: -Math.PI / 2, label: "West Room" },
  "East Room": { position: new THREE.Vector3(5.2, EYE_HEIGHT, -3.1), yaw: Math.PI / 2, label: "East Room" },
};

const state = {
  keys: new Set(),
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  velocity: new THREE.Vector3(),
  last: performance.now(),
  pointerLocked: false,
  dragLook: false,
  bobPhase: 0,
  bobAmount: 0,
  moveBlend: 0,
  sway: 0,
  lookSway: 0,
  dayTime: 0.12,
};

camera.position.copy(spots.Bridge.position);

const hemiLight = new THREE.HemisphereLight("#ffd8bc", "#2d2d42", 1.5);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight("#ffc78d", 2.2);
sun.castShadow = true;
sun.shadow.mapSize.width = 512;
sun.shadow.mapSize.height = 512;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

buildWorld();
requestAnimationFrame(animate);

function buildWorld() {
  addWater();
  addDistantTerrain();
  addBridge();
  addHouse();
  addExteriorDetails();
  addSakuraForest();
  addPetals();
}

function addWater() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.28;
  water.receiveShadow = true;
  scene.add(water);
  animated.push({ type: "water", mesh: water });
}

function addDistantTerrain() {
  const islands = [
    [-22, -8, 16, 12],
    [24, 3, 18, 15],
    [-24, 24, 20, 14],
    [22, 26, 18, 12],
    [-10, -28, 20, 12],
  ];

  islands.forEach(([x, z, w, d]) => {
    const land = block(w, 0.6, d, materials.grass, x, -0.08, z);
    land.receiveShadow = true;
    addVoxelCluster(x, z, w, d);
  });
}

function addBridge() {
  addPlayable(0, 20.5, 3.8, 15.5);
  addPlayable(0, 9.2, 7.4, 4.8);
  addCollider(-2.25, 16.2, 0.55, 17.2);
  addCollider(2.25, 16.2, 0.55, 17.2);

  for (let z = 10; z <= 25.5; z += 0.72) {
    const plank = block(3.55, 0.16, 0.55, materials.bridge, 0, 0.05, z);
    plank.castShadow = true;
    plank.receiveShadow = true;
  }

  [-2.05, 2.05].forEach((x) => {
    block(0.22, 0.45, 16.7, materials.bridgeDark, x, 0.38, 17.75);
    for (let z = 10.2; z <= 25.3; z += 1.8) {
      block(0.34, 1.15, 0.34, materials.bridgeDark, x, 0.72, z);
      addLantern(x, z, 1.5, 0.36);
    }
  });

  addToriiGate(0, 9.4, Math.PI);
}

function addHouse() {
  addPlayable(0, 0.3, 15.2, 14.8);
  addPlayable(-5.3, -3.0, 6.2, 7.4);
  addPlayable(5.3, -3.0, 6.2, 7.4);
  addPlayable(0, -8.5, 9.8, 5.5);

  block(16.5, 0.8, 15.5, materials.stone, 0, 0, 0);
  block(15.2, 0.28, 14.2, materials.floor, 0, 0.54, 0);

  addInteriorFloor(0, 0, 14.2, 13.2);
  addHouseWalls();
  addRoofs();
  addRoomPartitions();
  addInteriorPosts();
}

function addHouseWalls() {
  const wallY = 1.8;
  const h = 2.25;
  const zFront = 6.8;
  const zBack = -6.8;
  const xLeft = -7.6;
  const xRight = 7.6;

  wallSegment(-5.1, zFront, 3.7, h, "x", wallY);
  wallSegment(5.1, zFront, 3.7, h, "x", wallY);
  wallSegment(0, zBack, 15.2, h, "x", wallY);
  wallSegment(xLeft, 0, 13.6, h, "z", wallY);
  wallSegment(xRight, 0, 13.6, h, "z", wallY);

  addCollider(-5.1, zFront, 3.7, 0.5);
  addCollider(5.1, zFront, 3.7, 0.5);
  addCollider(0, zBack, 15.2, 0.5);
  addCollider(xLeft, 0, 0.5, 13.6);
  addCollider(xRight, 0, 0.5, 13.6);

  addWindow(-5.1, zFront + 0.03, 2.2, "x");
  addWindow(5.1, zFront + 0.03, 2.2, "x");
  addWindow(-7.63, -2.6, 2.2, "z");
  addWindow(7.63, -2.6, 2.2, "z");
}

function addRoomPartitions() {
  wallSegment(-3.0, -1.5, 5.7, 1.9, "z", 1.64);
  wallSegment(3.0, -1.5, 5.7, 1.9, "z", 1.64);
  wallSegment(0, -5.5, 4.8, 1.9, "x", 1.64);
  addCollider(-3.0, -1.5, 0.42, 5.7);
  addCollider(3.0, -1.5, 0.42, 5.7);
  addCollider(0, -5.5, 4.8, 0.42);

  addRoomMarker(-5.2, -3.1, "Room A");
  addRoomMarker(5.2, -3.1, "Room B");
  addRoomMarker(0, -8.2, "Rear Room");
}

function addInteriorPosts() {
  [-6.5, -3.1, 3.1, 6.5].forEach((x) => {
    [-5.8, 5.8].forEach((z) => {
      block(0.42, 3.0, 0.42, materials.bridgeDark, x, 1.88, z);
      addCollider(x, z, 0.55, 0.55);
    });
  });
}

function addRoofs() {
  addLayeredRoof(0, 3.26, 0, 19.2, 18.2, 0.72, 5);
  addLayeredRoof(0, 5.1, -1.0, 13.8, 12.0, 0.64, 4);

  block(1.0, 1.2, 11.4, materials.roofDark, -6.9, 4.0, -0.4);
  block(1.0, 1.2, 11.4, materials.roofDark, 6.9, 4.0, -0.4);
  block(12.5, 1.0, 0.92, materials.roofDark, 0, 4.1, -6.1);
  block(12.5, 1.0, 0.92, materials.roofDark, 0, 4.1, 5.4);
}

function addLayeredRoof(x, y, z, w, d, stepY, layers) {
  for (let i = 0; i < layers; i += 1) {
    const roof = block(w - i * 1.45, 0.34, d - i * 1.1, i % 2 === 0 ? materials.roof : materials.roofDark, x, y + i * stepY, z);
    roof.castShadow = true;
  }
  block(0.55, 0.44, d + 0.8, materials.roofDark, x - w / 2 + 0.7, y + 0.18, z);
  block(0.55, 0.44, d + 0.8, materials.roofDark, x + w / 2 - 0.7, y + 0.18, z);
}

function addExteriorDetails() {
  addLantern(-4.6, 7.1, 2.1, 0.52);
  addLantern(4.6, 7.1, 2.1, 0.52);
  addLantern(-6.9, 5.4, 2.0, 0.42);
  addLantern(6.9, 5.4, 2.0, 0.42);

  for (let x = -6.6; x <= 6.6; x += 1.2) {
    block(0.18, 0.58, 0.18, materials.bridgeDark, x, 1.05, 7.12);
  }
  block(14.0, 0.18, 0.18, materials.bridgeDark, 0, 1.34, 7.12);

  addSakuraTree(-9.5, 8.0, 1.2);
  addSakuraTree(9.4, 8.6, 1.05);
  addSakuraTree(-10.7, -5.5, 1.1);
  addSakuraTree(11.0, -5.2, 1.0);
}

function addSakuraForest() {
  const positions = [
    [-21, 7, 1.4],
    [-18, 15, 1.05],
    [-25, 25, 1.3],
    [-17, 28, 1.1],
    [21, 11, 1.25],
    [26, 21, 1.1],
    [18, 28, 1.35],
    [27, -5, 1.15],
    [-25, -16, 1.2],
    [-16, -24, 1.0],
  ];
  positions.forEach(([x, z, scale]) => addSakuraTree(x, z, scale));
}

function addInteriorFloor(x, z, w, d) {
  const tileW = 1.1;
  const tileD = 1.0;
  for (let ix = -Math.floor(w / 2); ix <= Math.floor(w / 2); ix += 1) {
    for (let iz = -Math.floor(d / 2); iz <= Math.floor(d / 2); iz += 1) {
      const mat = (ix + iz) % 2 === 0 ? materials.tatami : materials.floor;
      block(tileW - 0.04, 0.035, tileD - 0.04, mat, x + ix * tileW, 0.72, z + iz * tileD);
    }
  }
}

function wallSegment(x, z, length, height, axis, y) {
  const wall = block(
    axis === "x" ? length : 0.34,
    height,
    axis === "z" ? length : 0.34,
    materials.paperDim,
    x,
    y,
    z,
  );
  wall.castShadow = true;

  const beams = [-height / 2, height / 2].map((offsetY) =>
    block(
      axis === "x" ? length + 0.15 : 0.42,
      0.16,
      axis === "z" ? length + 0.15 : 0.42,
      materials.bridgeDark,
      x,
      y + offsetY,
      z,
    ),
  );
  beams.forEach((beam) => (beam.castShadow = true));
}

function addWindow(x, z, width, axis) {
  const glow = block(
    axis === "x" ? width : 0.08,
    0.72,
    axis === "z" ? width : 0.08,
    materials.lanternGlow,
    x,
    2.05,
    z,
  );
  glow.scale.y = 1;
}

function addRoomMarker(x, z, label) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 512;
  canvasTexture.height = 180;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = "#2c1713";
  roundRect(ctx, 0, 0, 512, 180, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 184, 143, 0.55)";
  ctx.lineWidth = 6;
  roundRect(ctx, 12, 12, 488, 156, 14);
  ctx.stroke();
  ctx.fillStyle = "#ffe7c2";
  ctx.font = "700 46px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 108);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.64), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  sign.position.set(x, 1.65, z);
  sign.rotation.y = Math.PI;
  scene.add(sign);
}

function addVoxelCluster(x, z, w, d) {
  const count = Math.floor((w + d) * 0.5);
  for (let i = 0; i < count; i += 1) {
    const bx = x + random(-w * 0.42, w * 0.42);
    const bz = z + random(-d * 0.42, d * 0.42);
    const h = random(0.35, 1.1);
    block(random(1.2, 2.6), h, random(1.2, 2.8), Math.random() > 0.55 ? materials.grass : materials.sakuraDark, bx, h * 0.5 - 0.02, bz);
  }
}

function addToriiGate(x, z, rotationY) {
  const group = new THREE.Group();
  [-1.9, 1.9].forEach((offset) => {
    const post = block(0.38, 3.2, 0.38, materials.roofDark, offset, 1.6, 0, group);
    post.castShadow = true;
  });
  block(4.8, 0.42, 0.42, materials.roof, 0, 3.02, 0, group);
  block(5.5, 0.3, 0.6, materials.roofDark, 0, 3.36, 0, group);
  block(3.6, 0.28, 0.38, materials.roofDark, 0, 2.55, 0, group);
  group.position.set(x, 0.05, z);
  group.rotation.y = rotationY;
  scene.add(group);
  addCollider(x - 1.9, z, 0.62, 0.62);
  addCollider(x + 1.9, z, 0.62, 0.62);
}

function addLantern(x, z, y, size) {
  block(size * 0.18, size * 1.1, size * 0.18, materials.bridgeDark, x, y - size * 0.3, z);
  const shade = block(size * 0.6, size * 0.6, size * 0.6, materials.lanternGlow, x, y + size * 0.22, z);
  shade.userData.baseIntensity = 1;
  const light = new THREE.PointLight("#ffb36b", 1.4, 7, 2);
  light.position.set(x, y + size * 0.24, z);
  scene.add(light);
  animated.push({ type: "lantern", mesh: shade, light });
}

function addSakuraTree(x, z, scale = 1) {
  const trunkHeight = 2.2 * scale;
  block(0.48 * scale, trunkHeight, 0.48 * scale, materials.trunk, x, trunkHeight / 2, z);

  const canopy = [
    [0, 2.35, 0, 1.35],
    [-0.8, 2.08, 0.25, 1.1],
    [0.82, 2.2, 0.18, 1.08],
    [0.18, 2.58, -0.78, 1.0],
    [-0.35, 2.72, -0.38, 0.82],
  ];

  canopy.forEach(([ox, oy, oz, size], index) => {
    block(
      size * scale,
      size * scale,
      size * scale,
      index % 2 === 0 ? materials.sakura : materials.sakuraDark,
      x + ox * scale,
      oy * scale,
      z + oz * scale,
    );
  });
}

function addPetals() {
  const petalMaterial = new THREE.MeshBasicMaterial({
    color: "#ffd2d8",
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(0.08, 0.04);
  for (let i = 0; i < 90; i += 1) {
    const petal = new THREE.Mesh(geometry, petalMaterial);
    petal.position.set(random(-28, 28), random(1.2, 5.6), random(-28, 31));
    petal.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    petal.userData.speed = random(0.18, 0.5);
    group.add(petal);
  }
  scene.add(group);
  animated.push({ type: "petals", group });
}

function block(w, h, d, material, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function blockMaterial(base, highlight) {
  const texture = document.createElement("canvas");
  texture.width = 128;
  texture.height = 128;
  const ctx = texture.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = highlight;
  for (let y = 0; y < 128; y += 16) {
    ctx.fillRect(0, y, 128, 2);
  }
  for (let x = 0; x < 128; x += 16) {
    ctx.fillRect(x, 0, 2, 128);
  }
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 180; i += 1) {
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.2, 1.2);
  }
  const map = new THREE.CanvasTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 1);
  return new THREE.MeshStandardMaterial({ color: base, map, roughness: 0.78, metalness: 0.02 });
}

function addPlayable(x, z, w, d) {
  playable.push(box2D(x, z, w, d));
}

function addCollider(x, z, w, d) {
  colliders.push(box2D(x, z, w, d));
}

function box2D(x, z, w, d) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function isPlayable(x, z) {
  const r = 0.32;
  return playable.some((box) => x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ);
}

function hitsCollider(x, z) {
  const r = 0.34;
  return colliders.some((box) => x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ);
}

function movePlayer(delta) {
  const input = new THREE.Vector3();
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) input.z -= 1;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) input.z += 1;
  if (state.keys.has("KeyQ")) input.x -= 1;
  if (state.keys.has("KeyE")) input.x += 1;

  const turnInput =
    (state.keys.has("KeyA") || state.keys.has("ArrowLeft") ? 1 : 0) -
    (state.keys.has("KeyD") || state.keys.has("ArrowRight") ? 1 : 0);
  state.targetYaw += turnInput * keyboardTurnSpeed * delta;

  const speed = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 5.8 : 3.15;
  const desired = new THREE.Vector3();
  if (input.lengthSq() > 0) {
    input.normalize().multiplyScalar(speed);
    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    desired.x = input.x * cos + input.z * sin;
    desired.z = -input.x * sin + input.z * cos;
  }

  const ease = input.lengthSq() > 0 ? moveEase : stopEase;
  state.velocity.x = damp(state.velocity.x, desired.x, ease, delta);
  state.velocity.z = damp(state.velocity.z, desired.z, ease, delta);
  state.moveBlend = damp(state.moveBlend, input.lengthSq() > 0 ? 1 : 0, 7, delta);
  state.sway = damp(state.sway, input.x / speed, 8, delta);

  const next = camera.position.clone();
  next.x += state.velocity.x * delta;
  next.z += state.velocity.z * delta;

  if (isPlayable(next.x, camera.position.z) && !hitsCollider(next.x, camera.position.z)) {
    camera.position.x = next.x;
  } else {
    state.velocity.x = 0;
  }

  if (isPlayable(camera.position.x, next.z) && !hitsCollider(camera.position.x, next.z)) {
    camera.position.z = next.z;
  } else {
    state.velocity.z = 0;
  }

  const planarSpeed = Math.hypot(state.velocity.x, state.velocity.z);
  state.bobPhase += delta * planarSpeed * 6.6;
  const bobTarget = THREE.MathUtils.clamp(planarSpeed / 3.15, 0, 1) * state.moveBlend;
  state.bobAmount = damp(state.bobAmount, bobTarget, 8, delta);
  const stepBob = Math.sin(state.bobPhase) * 0.03 * state.bobAmount;
  const stepLift = Math.abs(Math.cos(state.bobPhase)) * 0.015 * state.bobAmount;
  camera.position.y = EYE_HEIGHT + stepBob + stepLift;
}

function updateCamera(delta) {
  state.yaw = damp(state.yaw, state.targetYaw, lookEase, delta);
  state.pitch = damp(state.pitch, state.targetPitch, lookEase, delta);
  const roll = state.sway * -0.026 + state.lookSway;
  camera.quaternion.setFromEuler(new THREE.Euler(state.pitch, state.yaw, roll, "YXZ"));
  state.lookSway = damp(state.lookSway, 0, 9, delta);
}

function updateLighting(delta) {
  state.dayTime = (state.dayTime + delta * 0.018) % 1;
  const t = state.dayTime;
  const angle = t * Math.PI * 2;
  const sunHeight = Math.sin(angle) * 18;
  const warm = new THREE.Color("#ffb07b");
  const dusk = new THREE.Color("#8e5d91");
  const night = new THREE.Color("#18213b");
  const sky = new THREE.Color();

  if (sunHeight > 6) {
    sky.copy(warm).lerp(new THREE.Color("#f0a29a"), 0.35);
    timeLabel.textContent = "Golden Hour";
  } else if (sunHeight > -3) {
    sky.copy(dusk).lerp(warm, Math.max(sunHeight, 0) / 6);
    timeLabel.textContent = "Sunset";
  } else {
    sky.copy(night).lerp(dusk, Math.max(sunHeight + 18, 0) / 15);
    timeLabel.textContent = "Lantern Night";
  }

  scene.background = sky;
  scene.fog.color.copy(sky);
  sun.position.set(Math.cos(angle) * 18, Math.max(3, sunHeight + 10), Math.sin(angle) * 18);
  sun.intensity = THREE.MathUtils.clamp((sunHeight + 18) / 20, 0.28, 2.2);
  hemiLight.intensity = THREE.MathUtils.clamp((sunHeight + 20) / 18, 0.58, 1.65);
}

function updateAnimated(delta, now) {
  animated.forEach((item) => {
    if (item.type === "water") {
      item.mesh.material.opacity = 0.76 + Math.sin(now * 0.001) * 0.04;
    }
    if (item.type === "lantern") {
      const flicker = 0.88 + Math.sin(now * 0.006 + item.mesh.position.x) * 0.12;
      item.light.intensity = 1.15 * flicker;
    }
    if (item.type === "petals") {
      item.group.children.forEach((petal) => {
        petal.position.x += delta * petal.userData.speed * 0.35;
        petal.position.y -= delta * petal.userData.speed * 0.28;
        petal.position.z += Math.sin(now * 0.0008 + petal.position.x) * delta * 0.18;
        petal.rotation.x += delta * 0.6;
        petal.rotation.z += delta * 0.42;
        if (petal.position.y < 0.25) {
          petal.position.set(random(-28, 28), random(3.0, 6.0), random(-28, 31));
        }
      });
    }
  });
}

function updateSpotLabel() {
  let closest = "Bridge";
  let distance = Infinity;
  Object.entries(spots).forEach(([name, spot]) => {
    const d = spot.position.distanceTo(camera.position);
    if (d < distance) {
      closest = name;
      distance = d;
    }
  });
  spotLabel.textContent = spots[closest].label;
}

function animate(now) {
  const delta = Math.min((now - state.last) / 1000, 0.05);
  state.last = now;
  movePlayer(delta);
  updateCamera(delta);
  updateLighting(delta);
  updateAnimated(delta, now);
  updateSpotLabel();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function teleportTo(name) {
  const spot = spots[name];
  if (!spot) return;
  intro.classList.add("is-hidden");
  state.velocity.set(0, 0, 0);
  camera.position.copy(spot.position);
  state.yaw = spot.yaw;
  state.targetYaw = spot.yaw;
  state.pitch = 0;
  state.targetPitch = 0;
  updateCamera(0.016);
  updateSpotLabel();
}

function requestLookControl() {
  try {
    const request = canvas.requestPointerLock?.();
    if (request && typeof request.catch === "function") {
      request.catch(() => {
        state.pointerLocked = false;
      });
    }
  } catch {
    state.pointerLocked = false;
  }
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

enterButton.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  requestLookControl();
});

canvas.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  requestLookControl();
});

canvas.addEventListener("mousedown", () => {
  state.dragLook = true;
});

document.addEventListener("mouseup", () => {
  state.dragLook = false;
});

document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (event) => {
  if (!state.pointerLocked && !state.dragLook) return;
  state.targetYaw -= event.movementX * mouseSensitivity;
  state.targetPitch -= event.movementY * mouseSensitivity;
  state.targetPitch = Math.max(-0.9, Math.min(0.72, state.targetPitch));
  state.lookSway = THREE.MathUtils.clamp(event.movementX * -0.00014, -0.014, 0.014);
});

document.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "Space") {
    intro.classList.add("is-hidden");
    requestLookControl();
  }
});

document.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

document.addEventListener("pointerdown", (event) => {
  const button = event.target.closest?.("[data-spot]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  teleportTo(button.dataset.spot);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-spot]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  teleportTo(button.dataset.spot);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
});
