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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = false;
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
  cedar: "#7a3f29",
  cedarDark: "#3a211a",
  cedarLight: "#b5653c",
  roof: "#c86432",
  roofDark: "#843820",
  roofHighlight: "#e4884a",
  paper: "#fff0c9",
  paperDim: "#ead0a5",
  stone: "#9c9588",
  water: "#5f8fb2",
  deepWater: "#355d87",
  sakura: "#ebaebe",
  sakuraLight: "#ffd6de",
  sakuraDark: "#c5748c",
  leaf: "#6f8658",
  grass: "#536a45",
  shore: "#9b8063",
  mountain: "#8b7898",
  mountainSnow: "#f1e3dc",
  lantern: "#ffd28a",
  gold: "#d9a563",
};

const waterUniforms = {
  time: { value: 0 },
  shallowColor: { value: new THREE.Color("#6fa8c9") },
  deepColor: { value: new THREE.Color("#365e91") },
  glowColor: { value: new THREE.Color("#ffd0b0") },
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
  shore: blockMaterial(palette.shore, "#826650"),
  mountain: blockMaterial(palette.mountain, "#68516e"),
  mountainSnow: blockMaterial(palette.mountainSnow, "#f0e0d6"),
  sakura: blockMaterial(palette.sakura, palette.sakuraLight),
  sakuraDark: blockMaterial(palette.sakuraDark, "#c8738a"),
  leaf: blockMaterial(palette.leaf, "#6f8457"),
  trunk: blockMaterial("#6a3928", "#8a5137"),
  hedge: blockMaterial("#49663c", "#6b8454"),
  flower: blockMaterial("#ef9fb9", "#ffd0dc"),
  lily: new THREE.MeshBasicMaterial({ color: "#6f965c", side: THREE.DoubleSide }),
  lotus: new THREE.MeshBasicMaterial({ color: "#ff96bd", side: THREE.DoubleSide }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: palette.lantern }),
  water: createWaterMaterial(),
};

const colliders = [];
const playable = [];
const animated = [];

const skyUniforms = {
  topColor: { value: new THREE.Color("#894e8c") },
  horizonColor: { value: new THREE.Color("#ffb082") },
  bottomColor: { value: new THREE.Color("#273057") },
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(95, 24, 12),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 lower = mix(bottomColor, horizonColor, smoothstep(-0.35, 0.16, h));
        vec3 upper = mix(horizonColor, topColor, smoothstep(0.05, 0.85, h));
        gl_FragColor = vec4(mix(lower, upper, smoothstep(0.0, 0.42, h)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  }),
);
scene.add(skyDome);

const sunSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: makeRadialTexture("#fff4c6", "#ffd47f"),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  }),
);
sunSprite.scale.set(5.8, 5.8, 1);
scene.add(sunSprite);

const moonSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: makeRadialTexture("#eef2ff", "#b9c8ff"),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  }),
);
moonSprite.scale.set(3.2, 3.2, 1);
scene.add(moonSprite);

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

const moonLight = new THREE.DirectionalLight("#b9caff", 0.25);
moonLight.position.set(18, 18, 20);
scene.add(moonLight);

buildWorld();
requestAnimationFrame(animate);

function buildWorld() {
  addWater();
  addDistantTerrain();
  addMountainRing();
  addBridge();
  addHouse();
  addExteriorDetails();
  addSakuraForest();
  addLakeDetails();
  addPetals();
}

function addWater() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(170, 170, 64, 64), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.34;
  water.receiveShadow = true;
  scene.add(water);
  animated.push({ type: "water", mesh: water });

  const streakMaterial = new THREE.MeshBasicMaterial({
    color: "#fff0c7",
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 10; i += 1) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(random(4, 11), 0.055), streakMaterial.clone());
    streak.rotation.x = -Math.PI / 2;
    streak.rotation.z = random(-0.08, 0.08);
    streak.position.set(random(-20, 20), -0.245, random(1, 32));
    streak.userData.phase = random(0, Math.PI * 2);
    scene.add(streak);
    animated.push({ type: "waterStreak", mesh: streak });
  }
}

function addDistantTerrain() {
  const shoreline = [
    [0, 43, 92, 6],
    [0, -43, 92, 6],
    [-46, 0, 6, 86],
    [46, 0, 6, 86],
    [-34, 34, 28, 7],
    [34, 34, 28, 7],
    [-34, -34, 28, 7],
    [34, -34, 28, 7],
  ];

  shoreline.forEach(([x, z, w, d]) => {
    block(w + 1.4, 0.18, d + 1.4, materials.shore, x, -0.26, z);
    block(w, 0.5, d, materials.grass, x, -0.06, z);
  });

  addLakeTreeRing();
}

function addMountainRing() {
  addRidgeRange({
    x: 0,
    z: -92,
    baseY: 0.7,
    width: 178,
    peaks: [-1, 4, 7, 11, 8, 14, 10, 18, 13, 21, 15, 17, 11, 16, 9, 13, 8, 10, 6, -1],
    color: "#8e7ca0",
    opacity: 0.5,
  });
  addRidgeRange({
    x: 0,
    z: -98,
    baseY: 1.6,
    width: 192,
    peaks: [-1, 3, 5, 8, 6, 10, 8, 13, 10, 15, 11, 14, 9, 12, 7, 10, 6, 7, 4, -1],
    color: "#b9a6bd",
    opacity: 0.32,
  });
  addRidgeRange({
    x: 0,
    z: -105,
    baseY: 2.1,
    width: 204,
    peaks: [-1, 2, 4, 6, 5, 7, 6, 9, 7, 10, 8, 9, 6, 8, 5, 7, 4, 5, 3, -1],
    color: "#d2bdc9",
    opacity: 0.22,
  });
  addRidgeRange({
    x: -90,
    z: 2,
    baseY: 0.45,
    width: 156,
    peaks: [-1, 3, 6, 9, 7, 12, 8, 15, 10, 13, 8, 11, 7, 9, 5, -1],
    color: "#967fa3",
    opacity: 0.34,
    rotationY: Math.PI / 2,
  });
  addRidgeRange({
    x: 90,
    z: 2,
    baseY: 0.45,
    width: 156,
    peaks: [-1, 4, 7, 10, 6, 13, 9, 16, 11, 14, 9, 12, 6, 8, 5, -1],
    color: "#967fa3",
    opacity: 0.34,
    rotationY: -Math.PI / 2,
  });
  addRidgeRange({
    x: 0,
    z: 86,
    baseY: 0.35,
    width: 172,
    peaks: [-1, 3, 5, 7, 5, 9, 7, 12, 8, 11, 7, 10, 6, 8, 4, -1],
    color: "#a991ae",
    opacity: 0.24,
    rotationY: Math.PI,
  });
}

function addRidgeRange({ x = 0, z, baseY, width, peaks, color, opacity, rotationY = 0 }) {
  const vertices = [];
  const indices = [];
  const step = width / (peaks.length - 1);
  const startX = -width / 2;

  peaks.forEach((peak, index) => {
    const x = startX + index * step;
    const shoulder = peak <= 0 ? peak : peak * (0.78 + Math.sin(index * 1.7) * 0.08);
    vertices.push(x, baseY, 0, x, baseY + shoulder, 0);
  });

  for (let i = 0; i < peaks.length - 1; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ridge = new THREE.Mesh(geometry, material);
  ridge.position.set(x, 0, z);
  ridge.rotation.y = rotationY;
  scene.add(ridge);
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
  block(22.0, 0.24, 18.8, materials.shore, 0, -0.18, 0.2);
  block(20.2, 0.36, 17.0, materials.grass, 0, -0.02, 0.2);

  addLantern(-4.6, 7.1, 2.1, 0.52);
  addLantern(4.6, 7.1, 2.1, 0.52);
  addLantern(-6.9, 5.4, 2.0, 0.42);
  addLantern(6.9, 5.4, 2.0, 0.42);

  for (let x = -6.6; x <= 6.6; x += 1.2) {
    block(0.18, 0.58, 0.18, materials.bridgeDark, x, 1.05, 7.12);
  }
  block(14.0, 0.18, 0.18, materials.bridgeDark, 0, 1.34, 7.12);

  addSakuraTree(-9.3, 7.7, 0.95);
  addSakuraTree(9.2, 7.9, 0.9);
  addSakuraTree(-9.8, -5.6, 0.88);
  addSakuraTree(9.8, -5.4, 0.86);

  addGardenBed(-5.8, 7.4, 3.8, 0.62);
  addGardenBed(5.8, 7.4, 3.8, 0.62);
  addGardenBed(-8.4, 2.2, 0.62, 5.0);
  addGardenBed(8.4, 2.2, 0.62, 5.0);
}

function addGardenBed(x, z, w, d) {
  block(w, 0.34, d, materials.hedge, x, 0.9, z);
  const count = Math.max(3, Math.floor((w + d) * 1.1));
  for (let i = 0; i < count; i += 1) {
    block(0.18, 0.16, 0.18, materials.flower, x + random(-w * 0.42, w * 0.42), 1.15, z + random(-d * 0.42, d * 0.42));
  }
}

function addSakuraForest() {
  const positions = [
    [-41, 31, 1.18],
    [-31, 38, 1.02],
    [-18, 39, 1.16],
    [-6, 40, 0.94],
    [8, 39, 1.08],
    [22, 38, 1.22],
    [35, 33, 1.0],
    [42, 22, 1.14],
    [43, 9, 0.96],
    [42, -8, 1.1],
    [37, -26, 1.0],
    [24, -39, 1.16],
    [8, -42, 0.94],
    [-9, -42, 1.08],
    [-25, -38, 1.18],
    [-38, -27, 1.0],
    [-43, -10, 1.12],
    [-44, 8, 0.98],
    [-42, 22, 1.08],
  ];
  positions.forEach(([x, z, scale]) => addSakuraTree(x, z, scale));
}

function addLakeTreeRing() {
  const ring = [];
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    const jitter = Math.sin(i * 2.17) * 1.55;
    const x = Math.cos(angle) * (43 + jitter);
    const z = Math.sin(angle) * (40 + Math.cos(i * 1.31) * 1.7);
    if (Math.abs(x) < 15 && z > 28) continue;
    ring.push([x, z, 0.66 + ((i % 5) * 0.07)]);
  }

  ring.forEach(([x, z, scale]) => {
    addSakuraTree(x, z, scale);
  });
}

function addForegroundBlossoms() {
  addBranchingCanopy(-16.0, 20.5, 0.82, 1);
  addBranchingCanopy(16.0, 20.0, 0.74, -1);
}

function addBranchingCanopy(x, z, scale, side) {
  const root = new THREE.Vector3(x, 1.1, z);
  const trunkTop = new THREE.Vector3(x + side * 0.8, 5.6 * scale, z - 1.8);
  cylinderBetween(root, trunkTop, 0.18 * scale, materials.trunk);

  const branches = [
    [trunkTop, new THREE.Vector3(x + side * 3.2, 6.6 * scale, z - 5.2), 0.08],
    [trunkTop, new THREE.Vector3(x + side * 1.6, 6.9 * scale, z - 7.4), 0.07],
    [trunkTop, new THREE.Vector3(x + side * 4.8, 5.8 * scale, z - 2.4), 0.06],
  ];
  branches.forEach(([start, end, radius]) => cylinderBetween(start, end, radius * scale, materials.trunk));

  [
    [side * 3.2, 6.9, -5.4, 1.0],
    [side * 1.4, 7.2, -7.2, 0.92],
    [side * 4.8, 6.1, -2.5, 0.86],
    [side * 2.7, 6.3, -3.5, 0.78],
  ].forEach(([ox, oy, oz, size], index) => {
    block(size * scale, size * 0.68 * scale, size * scale, index % 2 ? materials.sakuraDark : materials.sakura, x + ox * scale, oy * scale, z + oz * scale);
  });
}

function addLakeDetails() {
  const pads = [
    [-12, 15, 0.72],
    [-15, 9, 0.58],
    [13, 13, 0.62],
    [16, 5, 0.7],
    [-8, -15, 0.55],
    [9, -17, 0.68],
    [20, -9, 0.54],
    [-21, -8, 0.6],
  ];

  pads.forEach(([x, z, scale], index) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(scale, 16), materials.lily);
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = index * 0.8;
    pad.position.set(x, -0.18, z);
    scene.add(pad);

    if (index % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.22, 8), materials.lotus);
      flower.rotation.x = -Math.PI / 2;
      flower.position.set(x + scale * 0.22, -0.165, z - scale * 0.12);
      scene.add(flower);
    }
  });
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
  const shouldCastLight = size >= 0.42 || Math.abs(x) > 3.9 || Math.abs(z) < 11;
  const light = shouldCastLight ? new THREE.PointLight("#ffb36b", 1.6, 8, 2) : null;
  if (light) {
    light.position.set(x, y + size * 0.24, z);
    scene.add(light);
  }
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
  for (let i = 0; i < 60; i += 1) {
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
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, length, 8), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  scene.add(mesh);
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

function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWave;
      varying float vRipple;
      uniform float time;
      float sineWave(vec2 point, float frequency, float speed, float amplitude, float phase) {
        return sin(point.x * frequency + point.y * frequency * 0.62 + time * speed + phase) * amplitude;
      }
      void main() {
        vUv = uv;
        vec3 pos = position;
        float waveA = sineWave(pos.xy, 0.24, 1.15, 0.07, 0.0);
        float waveB = sineWave(pos.yx, 0.16, -0.82, 0.05, 1.7);
        float waveC = sineWave(pos.xy + vec2(8.0, -3.0), 0.08, 0.48, 0.035, 2.4);
        vWave = waveA + waveB + waveC;
        vRipple = sin(pos.x * 0.48 + time * 1.8) * sin(pos.y * 0.31 - time * 1.25);
        pos.z += vWave;
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 shallowColor;
      uniform vec3 deepColor;
      uniform vec3 glowColor;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWave;
      varying float vRipple;
      float sineLine(float value, float frequency, float speed, float phase) {
        return sin(value * frequency + time * speed + phase) * 0.5 + 0.5;
      }
      void main() {
        float rippleA = sineLine(vWorldPosition.x + vWorldPosition.z * 0.35, 0.23, 1.08, 0.0);
        float rippleB = sineLine(vWorldPosition.z - vWorldPosition.x * 0.24, 0.18, -0.72, 1.3);
        float rippleC = sineLine(vWorldPosition.x + vWorldPosition.z, 0.08, 0.36, 2.1);
        float band = smoothstep(0.15, 0.95, vUv.y);
        float reflection = smoothstep(0.48, 0.52, vUv.x) * smoothstep(0.15, 0.92, vUv.y);
        float waveCrest = smoothstep(0.72, 0.97, rippleA * 0.58 + rippleB * 0.32 + rippleC * 0.1);
        float sparkle = pow(max(0.0, rippleA * rippleB), 4.5) * 0.18;
        vec3 color = mix(shallowColor, deepColor, band * 0.72);
        color += glowColor * (reflection * 0.16 + sparkle + waveCrest * 0.12 + abs(vWave) * 0.95);
        color += vec3(0.10, 0.16, 0.19) * (vRipple * 0.035);
        float alpha = 0.78 + rippleA * 0.06;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

function makeRadialTexture(inner, outer) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const ctx = textureCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.58, outer);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  state.dayTime = (state.dayTime + delta * 0.0026) % 1;
  const t = state.dayTime;
  const angle = t * Math.PI * 2;
  const sunHeight = Math.sin(angle) * 18;
  const dayTop = new THREE.Color("#7bb7ff");
  const dayHorizon = new THREE.Color("#ffe0ad");
  const dayBottom = new THREE.Color("#f4b58e");
  const sunsetTop = new THREE.Color("#9c7bc1");
  const sunsetHorizon = new THREE.Color("#ffad78");
  const sunsetBottom = new THREE.Color("#816098");
  const nightTop = new THREE.Color("#27365f");
  const nightHorizon = new THREE.Color("#5b5684");
  const nightBottom = new THREE.Color("#26304f");

  const top = new THREE.Color();
  const horizon = new THREE.Color();
  const bottom = new THREE.Color();
  const daylight = THREE.MathUtils.smoothstep(sunHeight, -2, 12);
  const evening = 1 - THREE.MathUtils.smoothstep(Math.abs(sunHeight), 0, 9);

  if (sunHeight > 6) {
    top.copy(dayTop);
    horizon.copy(dayHorizon);
    bottom.copy(dayBottom);
    timeLabel.textContent = "Golden Hour";
  } else if (sunHeight > -3) {
    const blend = Math.max(sunHeight + 3, 0) / 9;
    top.copy(sunsetTop).lerp(dayTop, blend);
    horizon.copy(sunsetHorizon).lerp(dayHorizon, blend);
    bottom.copy(sunsetBottom).lerp(dayBottom, blend);
    timeLabel.textContent = "Sunset";
  } else {
    const blend = Math.max(sunHeight + 18, 0) / 15;
    top.copy(nightTop).lerp(sunsetTop, blend);
    horizon.copy(nightHorizon).lerp(sunsetHorizon, blend);
    bottom.copy(nightBottom).lerp(sunsetBottom, blend);
    timeLabel.textContent = "Lantern Night";
  }

  skyUniforms.topColor.value.copy(top);
  skyUniforms.horizonColor.value.copy(horizon);
  skyUniforms.bottomColor.value.copy(bottom);
  scene.background.copy(horizon);
  scene.fog.color.copy(horizon);

  const sunX = -Math.cos(angle) * 54;
  const sunY = sunHeight + 18;
  sun.position.set(-Math.cos(angle) * 22, Math.max(4, sunHeight + 12), -28);
  sunSprite.position.set(sunX, sunY, -78);
  sunSprite.material.opacity = THREE.MathUtils.clamp(daylight + evening * 0.7, 0, 1);

  moonSprite.position.set(-sunX * 0.9, Math.max(8, -sunHeight + 13), -78);
  moonSprite.material.opacity = THREE.MathUtils.clamp(1 - daylight + evening * 0.2, 0, 0.82);

  sun.intensity = THREE.MathUtils.clamp(0.75 + daylight * 2.25 + evening * 0.55, 0.55, 3.0);
  moonLight.position.set(-sun.position.x, Math.max(8, -sunHeight + 12), 30);
  moonLight.intensity = THREE.MathUtils.clamp((1 - daylight) * 1.25 + evening * 0.35, 0.18, 1.35);
  hemiLight.intensity = THREE.MathUtils.clamp(1.0 + daylight * 1.25 + evening * 0.48, 0.95, 2.35);
  renderer.toneMappingExposure = THREE.MathUtils.clamp(1.12 + daylight * 0.22 + evening * 0.12, 1.06, 1.38);
  scene.fog.near = 36;
  scene.fog.far = 108;

  animated.forEach((item) => {
    if (item.type !== "lantern") return;
    const nightBoost = THREE.MathUtils.clamp(1.35 - daylight + evening * 0.9, 0.45, 1.85);
    item.mesh.material.opacity = 1;
    if (item.light) item.light.userData.targetIntensity = 1.35 * nightBoost;
  });
}

function updateAnimated(delta, now) {
  animated.forEach((item) => {
    if (item.type === "water") {
      item.mesh.material.uniforms.time.value = now * 0.001;
    }
    if (item.type === "waterStreak") {
      item.mesh.material.opacity = 0.08 + Math.sin(now * 0.0015 + item.mesh.userData.phase) * 0.035;
      item.mesh.position.x += Math.sin(now * 0.00045 + item.mesh.userData.phase) * delta * 0.12;
    }
    if (item.type === "lantern") {
      const flicker = 0.88 + Math.sin(now * 0.006 + item.mesh.position.x) * 0.12;
      if (item.light) item.light.intensity = (item.light.userData.targetIntensity ?? 1.1) * flicker;
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
});
