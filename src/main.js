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
const UPPER_FLOOR_Y = 3.28;
const GRAVITY = 11.5;
const JUMP_VELOCITY = 4.35;
const mouseSensitivity = 0.00135;
const keyboardTurnSpeed = 1.7;
const lookEase = 18;
const moveEase = 9.5;
const stopEase = 12;

const palette = {
  cedar: "#a66b3f",
  cedarDark: "#5b3525",
  cedarLight: "#c98b58",
  roof: "#d5743d",
  roofDark: "#994a2b",
  roofHighlight: "#ef9b5d",
  blossomPanel: "#f5b6bf",
  paper: "#fff5da",
  paperDim: "#f2dfbf",
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
  shallowColor: { value: new THREE.Color("#4d7a88") },
  deepColor: { value: new THREE.Color("#152634") },
  horizonColor: { value: new THREE.Color("#d8b8b4") },
  sunColor: { value: new THREE.Color("#fff0c8") },
  sunDir: { value: new THREE.Vector3(0.35, 0.78, 0.5).normalize() },
  fogColor: { value: new THREE.Color("#d58b82") },
  fogNear: { value: 36 },
  fogFar: { value: 108 },
};

const materials = {
  bridge: blockMaterial("#b98251", "#d8a66d"),
  bridgeDark: blockMaterial(palette.cedarDark, "#75462f"),
  roof: blockMaterial(palette.roof, palette.roofHighlight),
  roofDark: blockMaterial(palette.roofDark, "#9b4526"),
  blossomPanel: blockMaterial(palette.blossomPanel, "#ffd4da"),
  paper: blockMaterial(palette.paper, "#fff0ce"),
  paperDim: blockMaterial(palette.paperDim, "#fff0ce"),
  floor: blockMaterial("#c08a58", "#e2b77e"),
  floorAlt: plankMaterial("#d6a66d", "#f1ca92", 10),
  woodLight: blockMaterial("#bf8454", "#e0ad76"),
  tatami: blockMaterial("#d8c98d", "#eee0a8"),
  rug: blockMaterial("#ead0ae", "#fff0c9"),
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
  leafBright: blockMaterial("#7fa15b", "#a6c377"),
  flower: blockMaterial("#ef9fb9", "#ffd0dc"),
  ceramic: blockMaterial("#e4d7bf", "#fff1cf"),
  paperWarm: blockMaterial("#ffe2bc", "#fff3ce"),
  lily: new THREE.MeshBasicMaterial({ color: "#6f965c", side: THREE.DoubleSide }),
  lotus: new THREE.MeshBasicMaterial({ color: "#ff96bd", side: THREE.DoubleSide }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: palette.lantern }),
  lanternWarm: new THREE.MeshBasicMaterial({ color: "#ffdba6" }),
  water: createWaterMaterial(),
  tatamiWeave: tatamiMaterial(1, 1),
  scrollMountain: scrollMaterial("mountain"),
  scrollSakura: scrollMaterial("sakura"),
  scrollBamboo: scrollMaterial("bamboo"),
  scrollCalligraphy: scrollMaterial("calligraphy"),
  scrollCrane: scrollMaterial("crane"),
  charcoal: blockMaterial("#352822", "#48362d"),
  jade: blockMaterial("#5c7a5e", "#86a78a"),
  blackLacquer: blockMaterial("#1d1612", "#2a1f1a"),
  gold: blockMaterial(palette.gold, "#fff5da"),
  cedarDark: blockMaterial(palette.cedarDark, "#75462f"),
  vermillion: blockMaterial("#b53a2b", "#d04937"),
  toriiBlack: blockMaterial("#1a1410", "#2a201a"),
};

[materials.paperDim, materials.paperWarm, materials.tatamiWeave].forEach((material) => {
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
});

const colliders = [];
const playable = [];
const animated = [];
const frontDoor = {
  panels: [],
  colliders: [],
  open: true,
  progress: 1,
  target: 1,
};

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
  "Rear Room": { position: new THREE.Vector3(0, EYE_HEIGHT, -8.8), yaw: Math.PI, label: "Rear Room" },
  "Upper Floor": { position: new THREE.Vector3(2.6, UPPER_FLOOR_Y + EYE_HEIGHT, -1.0), yaw: -Math.PI / 2, label: "Second Floor" },
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
  floorY: 0,
  jumpOffset: 0,
  verticalVelocity: 0,
  grounded: true,
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
  const water = new THREE.Mesh(new THREE.PlaneGeometry(170, 170, 96, 96), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.34;
  scene.add(water);
  animated.push({ type: "water", mesh: water });

  const ringMat = new THREE.MeshBasicMaterial({
    color: "#cfe0e6",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i += 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), ringMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(random(-22, 22), -0.27, random(-22, 32));
    ring.userData.phase = random(0, Math.PI * 2);
    ring.userData.origin = ring.position.clone();
    ring.userData.period = random(4.5, 7.5);
    scene.add(ring);
    animated.push({ type: "ripple", mesh: ring });
  }

  addFloatingPetals();
}

function addFloatingPetals() {
  const baseMat = new THREE.MeshBasicMaterial({
    color: "#ffc5d0",
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geo = new THREE.CircleGeometry(0.075, 6);
  for (let i = 0; i < 48; i += 1) {
    const mat = baseMat.clone();
    mat.color = new THREE.Color(i % 3 === 0 ? "#ffd6dc" : i % 3 === 1 ? "#f7a4bc" : "#ffe2e7");
    const petal = new THREE.Mesh(geo, mat);
    petal.rotation.x = -Math.PI / 2;
    petal.rotation.z = random(0, Math.PI * 2);
    petal.position.set(random(-26, 26), -0.215, random(-26, 32));
    petal.userData = {
      phase: random(0, Math.PI * 2),
      driftX: random(0.015, 0.075),
      origY: -0.215 + random(-0.005, 0.015),
      spin: random(-0.08, 0.08),
    };
    scene.add(petal);
    animated.push({ type: "floatPetal", mesh: petal });
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
  addPlayable(0, 16.4, 5.4, 23.8);
  addCollider(-2.25, 16.2, 0.55, 17.2);
  addCollider(2.25, 16.2, 0.55, 17.2);

  for (let z = 7.1; z <= 25.5; z += 0.72) {
    const plank = block(3.55, 0.16, 0.55, materials.bridge, 0, 0.05, z);
    plank.castShadow = true;
    plank.receiveShadow = true;
  }

  [-2.05, 2.05].forEach((x) => {
    block(0.22, 0.45, 19.4, materials.bridgeDark, x, 0.38, 16.35);
    for (let z = 7.4; z <= 25.3; z += 1.8) {
      block(0.34, 1.15, 0.34, materials.bridgeDark, x, 0.72, z);
      addLantern(x, z, 1.5, 0.36);
    }
  });

  addEntryLanding();
  addToriiGate(0, 9.4, Math.PI);
}

function addEntryLanding() {
  block(5.5, 0.22, 2.6, materials.floorAlt, 0, 0.22, 7.3);
  block(4.7, 0.18, 0.75, materials.woodLight, 0, 0.42, 6.55);
  block(4.1, 0.16, 0.62, materials.woodLight, 0, 0.28, 7.15);
  block(3.7, 0.14, 0.58, materials.woodLight, 0, 0.16, 7.78);
  [-2.45, -1.75, 1.75, 2.45].forEach((x) => {
    block(0.12, 0.62, 0.12, materials.bridgeDark, x, 0.78, 6.35);
  });
  block(1.5, 0.14, 0.14, materials.bridgeDark, -2.1, 1.08, 6.35);
  block(1.5, 0.14, 0.14, materials.bridgeDark, 2.1, 1.08, 6.35);
}

function addHouse() {
  addPlayable(0, 0.3, 15.2, 14.8);
  addPlayable(-5.3, -3.0, 6.2, 7.4);
  addPlayable(5.3, -3.0, 6.2, 7.4);
  addPlayable(0, -8.5, 9.8, 5.5);

  block(16.5, 0.8, 15.5, materials.stone, 0, 0, 0);
  block(15.2, 0.28, 14.2, materials.floor, 0, 0.54, 0);
  block(11.1, 0.72, 5.6, materials.stone, 0, 0, -8.55);
  block(9.9, 0.24, 4.9, materials.floor, 0, 0.56, -8.55);

  addInteriorFloor(0, 0, 14.2, 13.2);
  addInteriorFloor(0, -8.55, 9.2, 4.2);
  addHouseWalls();
  addFrontDoor();
  addUpperStory();
  addFloorSeparation();
  addUpperRooms();
  addRoofs();
  addRoomPartitions();
  addInteriorPosts();
  addStaircase();
  addInteriorDetails();
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
  wallSegment(xLeft, 0, 13.6, h, "z", wallY);
  wallSegment(xRight, 0, 13.6, h, "z", wallY);
  partitionWithDoor(0, zBack, 10.6, "x", 0, 2.1);
  wallSegment(-5.25, -8.9, 4.5, h, "z", wallY);
  wallSegment(5.25, -8.9, 4.5, h, "z", wallY);
  wallSegment(0, -11.15, 10.5, h, "x", wallY);

  addCollider(-5.1, zFront, 3.7, 0.5);
  addCollider(5.1, zFront, 3.7, 0.5);
  addCollider(xLeft, 0, 0.5, 13.6);
  addCollider(xRight, 0, 0.5, 13.6);
  addCollider(-5.25, -8.9, 0.5, 4.5);
  addCollider(5.25, -8.9, 0.5, 4.5);
  addCollider(0, -11.15, 10.5, 0.5);

  addWindow(-5.1, zFront + 0.03, 2.2, "x");
  addWindow(5.1, zFront + 0.03, 2.2, "x");
  addWindow(-7.63, -2.6, 2.2, "z");
  addWindow(7.63, -2.6, 2.2, "z");
  addWindow(-5.28, -9.0, 1.7, "z");
  addWindow(5.28, -9.0, 1.7, "z");
  addWindow(0, -11.18, 2.0, "x");
}

function addFrontDoor() {
  const z = 6.86;
  block(0.24, 2.3, 0.18, materials.bridgeDark, -1.28, 1.86, z + 0.02);
  block(0.24, 2.3, 0.18, materials.bridgeDark, 1.28, 1.86, z + 0.02);
  block(2.85, 0.2, 0.2, materials.bridgeDark, 0, 2.98, z + 0.02);
  block(2.65, 0.12, 0.18, materials.gold, 0, 2.78, z + 0.04);
  block(2.5, 0.12, 0.42, materials.woodLight, 0, 0.82, z - 0.04);

  [
    { side: -1, closedX: -0.45, openX: -1.46 },
    { side: 1, closedX: 0.45, openX: 1.46 },
  ].forEach(({ side, closedX, openX }) => {
    const group = new THREE.Group();
    group.position.set(openX, 0, z);
    block(0.96, 1.76, 0.08, materials.paperWarm, 0, 1.75, side * 0.018, group);
    block(1.04, 0.1, 0.12, materials.bridgeDark, 0, 2.64, side * 0.018, group);
    block(1.04, 0.1, 0.12, materials.bridgeDark, 0, 0.86, side * 0.018, group);
    block(0.08, 1.8, 0.12, materials.bridgeDark, side * -0.48, 1.75, side * 0.018, group);
    block(0.08, 1.8, 0.12, materials.bridgeDark, side * 0.48, 1.75, side * 0.018, group);
    block(0.08, 1.7, 0.14, materials.bridgeDark, side * -0.5, 1.74, side * 0.018, group);
    block(0.18, 0.18, 0.12, materials.gold, side * -0.18, 1.72, 0.02, group);
    scene.add(group);
    const collider = addCollider(closedX, z, 0.88, 0.32, false, -0.5, 2.9);
    frontDoor.panels.push({ group, closedX, openX });
    frontDoor.colliders.push(collider);
  });
}

function addUpperStory() {
  const y = 4.22;
  const h = 1.85;
  const z = -0.8;
  wallSegment(-3.2, 4.15, 3.2, h, "x", y);
  wallSegment(3.2, 4.15, 3.2, h, "x", y);
  wallSegment(0, -5.75, 10.6, h, "x", y);
  wallSegment(-5.3, -0.8, 9.9, h, "z", y);
  wallSegment(5.3, 1.4, 5.5, h, "z", y);
  wallSegment(5.3, -4.275, 2.95, h, "z", y);

  block(9.05, 0.24, 10.2, materials.floorAlt, -1.18, 3.3, z);
  block(2.05, 0.24, 3.0, materials.floorAlt, 5.15, 3.3, -4.25);
  block(2.05, 0.24, 0.68, materials.floorAlt, 5.15, 3.3, 4.08);
  block(11.4, 0.24, 2.5, materials.floorAlt, 0, 3.3, -7.0);
  block(12.4, 0.22, 1.0, materials.bridge, 0, 3.46, 4.75);
  for (let x = -5.6; x <= 5.6; x += 0.9) {
    block(0.14, 0.74, 0.14, materials.bridgeDark, x, 3.86, 5.08);
  }
  block(11.8, 0.14, 0.14, materials.bridgeDark, 0, 4.18, 5.08);

  addWindow(-3.2, 4.18, 1.45, "x", 4.34);
  addWindow(3.2, 4.18, 1.45, "x", 4.34);
  addWindow(-5.33, -2.0, 1.65, "z", 4.34);

  const upperMinY = UPPER_FLOOR_Y - 0.4;
  const upperMaxY = UPPER_FLOOR_Y + 2.0;
  addCollider(-3.2, 4.15, 3.7, 0.42, true, upperMinY, upperMaxY);
  addCollider(3.2, 4.15, 3.7, 0.42, true, upperMinY, upperMaxY);
  addCollider(0, -5.75, 10.7, 0.42, true, upperMinY, upperMaxY);
  addCollider(-5.3, -0.8, 0.42, 10.0, true, upperMinY, upperMaxY);
  addCollider(5.3, 1.4, 0.42, 5.5, true, upperMinY, upperMaxY);
  addCollider(5.3, -4.275, 0.42, 2.95, true, upperMinY, upperMaxY);
  addCollider(0, 5.15, 11.2, 0.42, true, upperMinY, upperMaxY);
}

function addFloorSeparation() {
  const ceilingY = UPPER_FLOOR_Y - 0.28;
  block(9.25, 0.12, 10.2, materials.paperDim, -0.95, ceilingY, -0.8);
  block(2.0, 0.12, 3.0, materials.paperDim, 5.1, ceilingY, -4.25);
  block(2.0, 0.12, 0.55, materials.paperDim, 5.1, ceilingY, 4.18);

  [-5.1, -2.55, 0, 2.55].forEach((x) => {
    block(0.18, 0.18, 10.0, materials.bridgeDark, x, ceilingY + 0.02, -0.8);
  });
  [-5.5, -2.6, 0, 2.6, 4.45].forEach((z) => {
    block(9.0, 0.16, 0.18, materials.bridgeDark, -0.95, ceilingY + 0.04, z);
  });

  block(0.16, 0.74, 6.4, materials.bridgeDark, 3.88, UPPER_FLOOR_Y + 0.38, 0.62);
  block(0.16, 0.74, 6.4, materials.bridgeDark, 6.22, UPPER_FLOOR_Y + 0.38, 0.62);
  block(2.5, 0.16, 0.16, materials.bridgeDark, 5.05, UPPER_FLOOR_Y + 0.76, 3.88);
  block(2.5, 0.16, 0.16, materials.bridgeDark, 5.05, UPPER_FLOOR_Y + 0.76, -2.62);
}

function addUpperRooms() {
  upperPartitionWithDoor(-1.85, -0.8, 8.2, "z", 1.0, 1.45);
  upperPartitionWithDoor(1.85, -0.8, 8.2, "z", 1.0, 1.45);
  upperPartitionWithDoor(0, -3.95, 7.2, "x", 0, 1.55);

  addUpperRoomMarker(-3.55, 1.5, "Studio");
  addUpperRoomMarker(3.55, 1.5, "Gallery");
  addUpperRoomMarker(0, -4.75, "Archive");

  addUpperDesk(-3.65, -0.6);
  addUpperDesk(3.65, -0.6);
  addUpperPlanter(-4.8, 3.25);
  addUpperPlanter(4.8, 3.25);
  addUpperShelf(-3.8, -5.42, 2.3);
  addUpperShelf(3.8, -5.42, 2.3);
  addUpperLowTable(0, -2.1, 2.0, 1.25);
  addLantern(0, -0.8, UPPER_FLOOR_Y + 1.72, 0.32);
  addLantern(-3.6, 1.7, UPPER_FLOOR_Y + 1.55, 0.28);
  addLantern(3.6, 1.7, UPPER_FLOOR_Y + 1.55, 0.28);
}

function upperPartitionWithDoor(x, z, length, axis, gapCenter, gapSize) {
  const start = -length / 2;
  const end = length / 2;
  const gapStart = gapCenter - gapSize / 2;
  const gapEnd = gapCenter + gapSize / 2;
  [
    [start, gapStart],
    [gapEnd, end],
  ].forEach(([a, b]) => {
    const segmentLength = b - a;
    if (segmentLength <= 0.24) return;
    const centerOffset = (a + b) / 2;
    const sx = axis === "x" ? x + centerOffset : x;
    const sz = axis === "z" ? z + centerOffset : z;
    upperWallSegment(sx, sz, segmentLength, axis);
    addCollider(sx, sz, axis === "x" ? segmentLength : 0.34, axis === "z" ? segmentLength : 0.34, true, UPPER_FLOOR_Y - 0.35, UPPER_FLOOR_Y + 1.3);
  });

  const headerX = axis === "x" ? x + gapCenter : x;
  const headerZ = axis === "z" ? z + gapCenter : z;
  block(axis === "x" ? gapSize : 0.34, 0.16, axis === "z" ? gapSize : 0.34, materials.bridgeDark, headerX, UPPER_FLOOR_Y + 1.55, headerZ);
}

function upperWallSegment(x, z, length, axis) {
  block(
    axis === "x" ? length : 0.26,
    1.35,
    axis === "z" ? length : 0.26,
    materials.paperDim,
    x,
    UPPER_FLOOR_Y + 0.78,
    z,
  );
  block(axis === "x" ? length + 0.12 : 0.34, 0.12, axis === "z" ? length + 0.12 : 0.34, materials.bridgeDark, x, UPPER_FLOOR_Y + 1.48, z);
  block(axis === "x" ? length + 0.12 : 0.34, 0.12, axis === "z" ? length + 0.12 : 0.34, materials.bridgeDark, x, UPPER_FLOOR_Y + 0.1, z);
}

function addUpperRoomMarker(x, z, label) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 512;
  canvasTexture.height = 160;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = "#2c1713";
  roundRect(ctx, 0, 0, 512, 160, 16);
  ctx.fill();
  ctx.fillStyle = "#ffe7c2";
  ctx.font = "700 44px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 98);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.48), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  sign.position.set(x, UPPER_FLOOR_Y + 1.25, z);
  sign.rotation.y = Math.PI;
  scene.add(sign);
}

function addUpperDesk(x, z) {
  block(1.45, 0.2, 0.72, materials.woodLight, x, UPPER_FLOOR_Y + 0.55, z);
  block(0.18, 0.55, 0.18, materials.bridgeDark, x - 0.55, UPPER_FLOOR_Y + 0.3, z - 0.22);
  block(0.18, 0.55, 0.18, materials.bridgeDark, x + 0.55, UPPER_FLOOR_Y + 0.3, z - 0.22);
  block(0.55, 0.08, 0.36, materials.paperWarm, x, UPPER_FLOOR_Y + 0.72, z);
}

function addUpperPlanter(x, z) {
  block(0.9, 0.38, 0.9, materials.woodLight, x, UPPER_FLOOR_Y + 0.35, z);
  block(0.5, 0.45, 0.5, materials.leafBright, x, UPPER_FLOOR_Y + 0.76, z);
  block(0.38, 0.32, 0.38, materials.flower, x + 0.18, UPPER_FLOOR_Y + 1.06, z - 0.1);
}

function addUpperShelf(x, z, width) {
  block(width, 0.14, 0.2, materials.bridgeDark, x, UPPER_FLOOR_Y + 0.95, z);
  block(width, 0.14, 0.2, materials.bridgeDark, x, UPPER_FLOOR_Y + 1.38, z);
  for (let i = 0; i < 5; i += 1) {
    block(0.16, 0.28, 0.22, i % 2 ? materials.paperWarm : materials.flower, x + (i - 2) * 0.42, UPPER_FLOOR_Y + 1.12, z - 0.1);
  }
}

function addUpperLowTable(x, z, w, d) {
  block(w, 0.18, d, materials.woodLight, x, UPPER_FLOOR_Y + 0.42, z);
  block(w * 0.78, 0.08, d * 0.7, materials.rug, x, UPPER_FLOOR_Y + 0.27, z);
}

function addRoomPartitions() {
  partitionWithDoor(-3.0, -1.5, 5.7, "z", -1.15, 1.65);
  partitionWithDoor(3.0, -1.5, 5.7, "z", -1.15, 1.65);
  partitionWithDoor(0, -5.5, 4.8, "x", 0, 1.9);

  addRoomMarker(-5.2, -3.1, "Room A");
  addRoomMarker(5.2, -3.1, "Room B");
  addRoomMarker(0, -8.2, "Rear Room");
}

function partitionWithDoor(x, z, length, axis, gapCenter, gapSize) {
  const start = -length / 2;
  const end = length / 2;
  const gapStart = gapCenter - gapSize / 2;
  const gapEnd = gapCenter + gapSize / 2;
  const segments = [
    [start, gapStart],
    [gapEnd, end],
  ];

  segments.forEach(([a, b]) => {
    const segmentLength = b - a;
    if (segmentLength <= 0.24) return;
    const centerOffset = (a + b) / 2;
    const sx = axis === "x" ? x + centerOffset : x;
    const sz = axis === "z" ? z + centerOffset : z;
    wallSegment(sx, sz, segmentLength, 1.9, axis, 1.64);
    addCollider(sx, sz, axis === "x" ? segmentLength : 0.42, axis === "z" ? segmentLength : 0.42);
  });

  const headerX = axis === "x" ? x + gapCenter : x;
  const headerZ = axis === "z" ? z + gapCenter : z;
  block(axis === "x" ? gapSize : 0.42, 0.18, axis === "z" ? gapSize : 0.42, materials.bridgeDark, headerX, 2.48, headerZ);
}

function addInteriorPosts() {
  [-6.5, -3.1, 3.1, 6.5].forEach((x) => {
    [-5.8, 5.8].forEach((z) => {
      block(0.42, 3.0, 0.42, materials.bridgeDark, x, 1.88, z);
      addCollider(x, z, 0.55, 0.55);
    });
  });
}

function addStaircase() {
  const x = 5.05;
  const stepCount = 12;
  const zoneStart = 3.9;
  const zoneEnd = -1.7;
  const zoneRange = zoneStart - zoneEnd;
  const stepDz = (zoneStart - zoneEnd - 0.6) / stepCount;
  for (let i = 0; i < stepCount; i += 1) {
    const zTop = zoneStart - 0.3 - i * stepDz;
    const stepFront = zTop - stepDz * 0.5;
    const stepBack = zTop + stepDz * 0.5;
    const stepTop = ((zoneStart - stepFront) / zoneRange) * UPPER_FLOOR_Y;
    const riserHeight = Math.max(stepTop, 0.12);
    block(1.66, riserHeight, stepDz + 0.08, materials.woodLight, x, riserHeight / 2, zTop);
    block(1.7, 0.045, stepDz + 0.1, materials.floorAlt, x, stepTop + 0.025, zTop);
    block(1.68, 0.12, 0.05, materials.bridgeDark, x, stepTop - 0.045, stepBack);
  }
  block(0.14, 1.05, 0.14, materials.bridgeDark, x - 0.95, 0.55, zoneStart - 0.3);
  block(0.14, 1.45, 0.14, materials.bridgeDark, x + 0.95, 0.75, zoneStart - 0.3);
  block(0.14, 2.4, 0.14, materials.bridgeDark, x - 0.95, 2.55, zoneEnd + 0.3);
  block(0.14, 2.4, 0.14, materials.bridgeDark, x + 0.95, 2.55, zoneEnd + 0.3);
  block(0.14, 0.14, zoneRange - 0.6, materials.bridgeDark, x - 0.95, UPPER_FLOOR_Y * 0.55, (zoneStart + zoneEnd) / 2);
  block(0.14, 0.14, zoneRange - 0.6, materials.bridgeDark, x + 0.95, UPPER_FLOOR_Y * 0.55, (zoneStart + zoneEnd) / 2);
  block(2.4, 0.2, 1.4, materials.floorAlt, x, UPPER_FLOOR_Y - 0.1, -2.3);
}

function addInteriorDetails() {
  addCeilingBeams();

  [
    [0, 4.2, 2.74, 0.42],
    [0, -1.6, 2.68, 0.38],
    [0, -8.8, 2.56, 0.34],
    [-5.5, -3.0, 2.55, 0.34],
    [5.5, -3.0, 2.55, 0.34],
  ].forEach(([x, z, y, size]) => addLantern(x, z, y, size));

  addInteriorLight(0, 2.2, 2.35, 1.25, 14);
  addInteriorLight(0, -5.8, 2.2, 1.0, 12);
  addInteriorLight(-5.4, -3.2, 2.1, 0.75, 9);
  addInteriorLight(5.4, -3.2, 2.1, 0.75, 9);
  addInteriorLight(0, -9.4, 2.25, 0.9, 10);
  addInteriorLight(5.0, 0.8, 2.8, 0.85, 8);
  addInteriorLight(0, -1.0, UPPER_FLOOR_Y + 1.35, 0.85, 9);
  addInteriorLight(-3.5, 1.8, UPPER_FLOOR_Y + 1.25, 0.55, 7);
  addInteriorLight(3.5, 1.8, UPPER_FLOOR_Y + 1.25, 0.55, 7);

  // --- Main Hall ---
  addTatamiArea(-2.4, 1.6, 3, 3);
  addLowTable(-2.4, 1.6, 2.2, 1.3);
  addFloorCushion(-3.8, 1.6, 0);
  addFloorCushion(-1.0, 1.6, 0);
  addFloorCushion(-2.4, 2.85, Math.PI / 2);
  addFloorCushion(-2.4, 0.35, Math.PI / 2);
  addTeaSet(-2.4, 1.07, 1.6);

  addTokonoma(-3.6, -5.95, "+z", "mountain");

  addPaperLantern(-2.4, 2.45, 1.6);
  addPaperLantern(2.4, 2.55, 2.4);

  addCabinetWall(-6.95, 2.6, 0.55, 4.2, "z");
  addCabinetWall(6.95, 2.1, 0.55, 4.8, "z");
  addShelf(-4.7, 5.85, 3.2, "x");
  addShelf(4.7, 5.85, 3.2, "x");

  addBonsai(6.95, 1.68, 0.5);
  addBonsai(-6.95, 1.68, 4.4);

  addHangingScroll(-4.7, 1.85, 6.6, "crane", "-z", 0.85);
  addHangingScroll(4.7, 1.85, 6.6, "sakura", "-z", 0.85);
  addHangingScroll(3.6, 1.78, -6.58, "calligraphy", "+z", 0.85);

  addFloorLantern(-6.3, 5.5, 1.2);
  addFloorLantern(6.3, 5.5, 1.2);

  // --- Room A (West) ---
  addTatamiArea(-5.4, -2.9, 2, 2);
  addPlanter(-6.8, -1.4, 1.0, 2.4, "z");
  addIvyPanel(-6.88, -1.6, 2.3, 1.7, "z");
  addLowTable(-5.45, -2.5, 1.9, 1.15);
  addBonsai(-5.45, 1.07, -2.5);
  addHangingScroll(-7.38, 1.85, -3.1, "bamboo", "+x", 0.95);
  addHangingScroll(-7.38, 1.85, -4.5, "calligraphy", "+x", 0.7);
  addFloorLantern(-6.7, -4.7, 1.15);

  // --- Room B (East) ---
  addTatamiArea(5.4, -2.9, 2, 2);
  addPlanter(6.8, -1.4, 1.0, 2.4, "z");
  addIvyPanel(6.88, -1.6, 2.3, 1.7, "z");
  addLowTable(5.45, -2.5, 1.9, 1.15);
  addIkebana(5.45, 1.07, -2.5);
  addHangingScroll(7.38, 1.85, -3.1, "sakura", "-x", 0.95);
  addHangingScroll(7.38, 1.85, -4.5, "crane", "-x", 0.7);
  addFloorLantern(6.7, -4.7, 1.15);

  // --- Corridor between Main Hall and Rear Room ---
  addShojiPanel(-6.85, -5.1, "z");
  addShojiPanel(6.85, -5.1, "z");
  addShojiPanel(-1.9, -6.65, "x");
  addShojiPanel(1.9, -6.65, "x");

  // --- Rear Room ---
  addTatamiArea(0, -8.85, 4, 2);
  addLowTable(0, -9.0, 2.4, 1.4);
  addTeaSet(0, 1.07, -9.0);
  addFloorCushion(-1.7, -9.0, Math.PI / 2);
  addFloorCushion(1.7, -9.0, Math.PI / 2);
  addFloorCushion(0, -10.05, 0);
  addFloorCushion(0, -7.95, 0);

  addHangingScroll(0, 1.95, -10.93, "calligraphy", "+z", 1.15);
  addHangingScroll(-5.03, 1.85, -8.4, "crane", "+x", 0.85);
  addHangingScroll(5.03, 1.85, -8.4, "bamboo", "-x", 0.85);

  addBambooStalk(-4.2, -10.4, 1.95, 3);
  addBambooStalk(4.2, -10.4, 1.95, 3);
  addBonsai(-3.5, 0.72, -10.6);
  addBonsai(3.5, 0.72, -10.6);

  addFloorLantern(-3.6, -7.55, 1.1);
  addFloorLantern(3.6, -7.55, 1.1);
  addPaperLantern(0, 2.4, -9.0);
}

function addInteriorLight(x, z, y, intensity, distance) {
  const light = new THREE.PointLight("#ffd2a0", intensity, distance, 2.2);
  light.position.set(x, y, z);
  scene.add(light);
}

function addCeilingBeams() {
  [-4.8, 0, 4.8].forEach((x) => {
    block(0.28, 0.32, 13.2, materials.bridgeDark, x, 3.04, 0);
  });
  [-4.8, -1.6, 1.6, 4.8].forEach((z) => {
    block(14.5, 0.28, 0.28, materials.bridgeDark, 0, 2.92, z);
  });
}

function addLowTable(x, z, w, d) {
  block(w, 0.22, d, materials.woodLight, x, 0.96, z);
  block(w * 0.84, 0.1, d * 0.74, materials.rug, x, 0.78, z);
  [
    [-w * 0.38, -d * 0.32],
    [w * 0.38, -d * 0.32],
    [-w * 0.38, d * 0.32],
    [w * 0.38, d * 0.32],
  ].forEach(([ox, oz]) => block(0.18, 0.42, 0.18, materials.bridgeDark, x + ox, 0.73, z + oz));
  addCollider(x, z, w + 0.2, d + 0.2);
}

function addFloorCushion(x, z, rotationY) {
  const cushion = block(0.82, 0.16, 0.72, materials.paperWarm, x, 0.86, z);
  cushion.rotation.y = rotationY;
}

function addCabinetWall(x, z, w, d, axis) {
  block(axis === "z" ? w : d, 1.0, axis === "z" ? d : w, materials.woodLight, x, 1.18, z);
  addCollider(x, z, axis === "z" ? w + 0.12 : d + 0.12, axis === "z" ? d + 0.12 : w + 0.12);
  const drawerCount = 5;
  for (let i = 0; i < drawerCount; i += 1) {
    const offset = (i - (drawerCount - 1) / 2) * (d / drawerCount);
    const px = axis === "z" ? x - 0.29 : x + offset;
    const pz = axis === "z" ? z + offset : z - 0.29;
    block(axis === "z" ? 0.08 : 0.46, 0.08, axis === "z" ? 0.46 : 0.08, materials.gold, px, 1.32, pz);
  }
}

function addShelf(x, z, width, axis) {
  block(axis === "x" ? width : 0.2, 0.16, axis === "z" ? width : 0.2, materials.bridgeDark, x, 1.95, z);
  block(axis === "x" ? width : 0.2, 0.16, axis === "z" ? width : 0.2, materials.bridgeDark, x, 2.55, z);
  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * 0.52;
    block(0.18, 0.34, 0.28, i % 2 ? materials.paperWarm : materials.flower, x + offset, 2.18, z - 0.12);
  }
}

function addPlanter(x, z, w, d, axis) {
  block(axis === "z" ? w : d, 0.46, axis === "z" ? d : w, materials.woodLight, x, 1.0, z);
  addCollider(x, z, axis === "z" ? w + 0.12 : d + 0.12, axis === "z" ? d + 0.12 : w + 0.12);
  const count = Math.floor(d * 2.8);
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 0.34;
    const leafX = axis === "z" ? x : x + offset;
    const leafZ = axis === "z" ? z + offset : z;
    block(0.36, 0.36, 0.36, i % 2 ? materials.leafBright : materials.hedge, leafX, 1.38 + (i % 3) * 0.12, leafZ);
  }
}

function addIvyPanel(x, z, width, height, axis) {
  block(axis === "z" ? 0.08 : width, height, axis === "z" ? width : 0.08, materials.leafBright, x, 1.88, z);
  for (let i = 0; i < 12; i += 1) {
    const ox = axis === "z" ? 0 : random(-width * 0.43, width * 0.43);
    const oz = axis === "z" ? random(-width * 0.43, width * 0.43) : 0;
    block(0.22, 0.22, 0.22, i % 3 ? materials.hedge : materials.flower, x + ox, random(1.2, 2.55), z + oz);
  }
}

function addVase(x, z, scale) {
  block(0.38 * scale, 0.52 * scale, 0.38 * scale, materials.ceramic, x, 1.34, z);
  block(0.18 * scale, 0.32 * scale, 0.18 * scale, materials.leafBright, x, 1.78, z);
  [
    [-0.22, 0.08],
    [0.24, -0.05],
    [0.04, 0.24],
  ].forEach(([ox, oz]) => block(0.28 * scale, 0.28 * scale, 0.28 * scale, materials.flower, x + ox * scale, 1.98, z + oz * scale));
}

function addBookStack(x, z) {
  block(0.8, 0.12, 0.46, materials.paperWarm, x, 0.86, z);
  block(0.72, 0.1, 0.42, materials.flower, x + 0.04, 0.98, z + 0.02);
  block(0.62, 0.1, 0.38, materials.roof, x - 0.04, 1.09, z - 0.02);
}

function addShojiPanel(x, z, axis) {
  block(axis === "x" ? 1.4 : 0.08, 1.45, axis === "z" ? 1.4 : 0.08, materials.paperWarm, x, 1.7, z);
  block(axis === "x" ? 1.56 : 0.12, 0.12, axis === "z" ? 1.56 : 0.12, materials.bridgeDark, x, 2.42, z);
  block(axis === "x" ? 1.56 : 0.12, 0.12, axis === "z" ? 1.56 : 0.12, materials.bridgeDark, x, 0.98, z);
  const gridColor = materials.bridgeDark;
  if (axis === "x") {
    for (let i = -1; i <= 1; i += 1) {
      block(0.05, 1.35, 0.06, gridColor, x + i * 0.46, 1.7, z);
    }
    for (let j = -1; j <= 1; j += 1) {
      block(1.4, 0.05, 0.06, gridColor, x, 1.7 + j * 0.4, z);
    }
  } else {
    for (let i = -1; i <= 1; i += 1) {
      block(0.06, 1.35, 0.05, gridColor, x, 1.7, z + i * 0.46);
    }
    for (let j = -1; j <= 1; j += 1) {
      block(0.06, 0.05, 1.4, gridColor, x, 1.7 + j * 0.4, z);
    }
  }
}

function addHangingScroll(x, y, z, theme, facing, scale = 1) {
  const facingRot = { "+z": 0, "-z": Math.PI, "+x": Math.PI / 2, "-x": -Math.PI / 2 };
  const w = 0.55 * scale;
  const h = 1.5 * scale;
  const group = new THREE.Group();

  const matKey = `scroll${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
  const scrollMat = materials[matKey] || materials.scrollMountain;

  const paper = new THREE.Mesh(new THREE.PlaneGeometry(w, h), scrollMat);
  paper.position.set(0, 0, 0.01);
  group.add(paper);

  const topRod = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, 0.07, 0.06),
    materials.bridgeDark,
  );
  topRod.position.set(0, h / 2 + 0.035, 0);
  group.add(topRod);

  const botRod = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.14, 0.055, 0.07),
    materials.bridgeDark,
  );
  botRod.position.set(0, -h / 2 - 0.028, 0);
  group.add(botRod);

  const finialL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.09, 8),
    materials.gold,
  );
  finialL.rotation.z = Math.PI / 2;
  finialL.position.set(-(w / 2 + 0.12), -h / 2 - 0.028, 0);
  group.add(finialL);

  const finialR = finialL.clone();
  finialR.position.x = (w / 2 + 0.12);
  group.add(finialR);

  const cord = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.16, 0.022),
    materials.bridgeDark,
  );
  cord.position.set(0, h / 2 + 0.12, 0);
  group.add(cord);

  group.position.set(x, y, z);
  group.rotation.y = facingRot[facing] ?? 0;
  scene.add(group);
}

function addIkebana(x, y, z) {
  block(0.3, 0.12, 0.3, materials.blackLacquer, x, y + 0.06, z);
  block(0.24, 0.16, 0.24, materials.ceramic, x, y + 0.2, z);
  block(0.2, 0.04, 0.2, materials.charcoal, x, y + 0.3, z);

  block(0.04, 0.68, 0.04, materials.trunk, x - 0.05, y + 0.64, z + 0.03);
  block(0.04, 0.42, 0.04, materials.trunk, x + 0.07, y + 0.51, z - 0.03);
  block(0.04, 0.05, 0.18, materials.trunk, x - 0.1, y + 0.78, z + 0.08);
  block(0.18, 0.05, 0.04, materials.trunk, x + 0.13, y + 0.66, z - 0.05);

  block(0.18, 0.06, 0.06, materials.leafBright, x + 0.04, y + 0.4, z + 0.1);
  block(0.06, 0.06, 0.16, materials.hedge, x - 0.08, y + 0.36, z - 0.06);

  block(0.1, 0.1, 0.1, materials.flower, x - 0.05, y + 0.96, z + 0.02);
  block(0.08, 0.08, 0.08, materials.sakuraDark, x + 0.1, y + 0.82, z - 0.04);
  block(0.07, 0.07, 0.07, materials.flower, x - 0.12, y + 0.74, z + 0.1);
}

function addBonsai(x, y, z) {
  block(0.5, 0.06, 0.4, materials.blackLacquer, x, y + 0.03, z);
  block(0.46, 0.04, 0.36, materials.bridgeDark, x, y + 0.08, z);
  block(0.42, 0.05, 0.32, materials.cedarDark, x, y + 0.125, z);

  block(0.08, 0.28, 0.08, materials.trunk, x, y + 0.29, z);
  block(0.16, 0.06, 0.07, materials.trunk, x + 0.06, y + 0.38, z);
  block(0.07, 0.06, 0.16, materials.trunk, x - 0.04, y + 0.44, z - 0.06);
  block(0.06, 0.18, 0.06, materials.trunk, x + 0.1, y + 0.5, z);

  block(0.34, 0.16, 0.3, materials.jade, x + 0.06, y + 0.52, z);
  block(0.24, 0.14, 0.22, materials.hedge, x - 0.08, y + 0.6, z - 0.06);
  block(0.18, 0.12, 0.18, materials.leafBright, x + 0.1, y + 0.66, z + 0.02);
  block(0.12, 0.1, 0.12, materials.jade, x - 0.04, y + 0.7, z + 0.06);
}

function addFloorLantern(x, z, height = 1.25, baseY = 0.72) {
  block(0.32, 0.08, 0.32, materials.blackLacquer, x, baseY + 0.04, z);
  block(0.26, 0.04, 0.26, materials.bridgeDark, x, baseY + 0.1, z);
  for (const ox of [-1, 1]) {
    for (const oz of [-1, 1]) {
      block(0.04, height - 0.22, 0.04, materials.bridgeDark, x + ox * 0.1, baseY + 0.12 + (height - 0.22) / 2, z + oz * 0.1);
    }
  }
  const shade = block(0.22, height - 0.34, 0.22, materials.lanternWarm, x, baseY + 0.16 + (height - 0.34) / 2, z);
  block(0.34, 0.06, 0.34, materials.bridgeDark, x, baseY + height + 0.02, z);
  block(0.22, 0.04, 0.22, materials.bridgeDark, x, baseY + height + 0.07, z);
  const light = new THREE.PointLight("#ffc285", 1.2, 5.2, 2);
  light.position.set(x, baseY + height * 0.55, z);
  scene.add(light);
  shade.userData.baseIntensity = 1;
  animated.push({ type: "lantern", mesh: shade, light });
}

function addBambooStalk(x, z, height = 2.0, count = 3) {
  const baseY = 0.72;
  for (let i = 0; i < count; i += 1) {
    const ox = (i - (count - 1) / 2) * 0.18;
    const oz = i % 2 ? 0.08 : -0.06;
    const h = height + random(-0.25, 0.25);
    block(0.08, h, 0.08, materials.leafBright, x + ox, baseY + h / 2, z + oz);
    for (let j = 0; j < 5; j += 1) {
      block(0.1, 0.03, 0.1, materials.hedge, x + ox, baseY + 0.3 + j * (h / 6), z + oz);
    }
    block(0.22, 0.04, 0.1, materials.leafBright, x + ox - 0.1, baseY + h * 0.85, z + oz);
    block(0.1, 0.04, 0.22, materials.hedge, x + ox + 0.08, baseY + h * 0.7, z + oz + 0.04);
  }
}

function addTeaSet(x, y, z) {
  block(0.66, 0.025, 0.36, materials.blackLacquer, x, y + 0.012, z);
  block(0.22, 0.13, 0.2, materials.ceramic, x, y + 0.09, z);
  block(0.08, 0.04, 0.08, materials.ceramic, x, y + 0.17, z);
  block(0.06, 0.03, 0.04, materials.ceramic, x - 0.16, y + 0.07, z);
  block(0.04, 0.03, 0.12, materials.ceramic, x + 0.14, y + 0.09, z + 0.02);
  block(0.085, 0.05, 0.085, materials.ceramic, x - 0.22, y + 0.04, z + 0.1);
  block(0.085, 0.05, 0.085, materials.ceramic, x - 0.22, y + 0.04, z - 0.1);
  block(0.085, 0.05, 0.085, materials.ceramic, x + 0.22, y + 0.04, z + 0.1);
}

function addTatamiArea(x, z, cols, rows, y = 0.78) {
  const tw = 0.95;
  const td = 1.85;
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const px = x + (i - (cols - 1) / 2) * tw;
      const pz = z + (j - (rows - 1) / 2) * td;
      block(tw - 0.04, 0.03, td - 0.04, materials.tatamiWeave, px, y, pz);
    }
  }
}

function addTokonoma(x, z, facing, theme = "mountain") {
  const facingZ = facing === "+z" ? 1 : facing === "-z" ? -1 : 0;
  const facingX = facing === "+x" ? 1 : facing === "-x" ? -1 : 0;
  const isZAxis = facingZ !== 0;

  const platformW = 1.7;
  const platformD = 0.85;
  const w = isZAxis ? platformW : platformD;
  const d = isZAxis ? platformD : platformW;

  block(w, 0.16, d, materials.woodLight, x, 0.84, z);
  block(isZAxis ? w + 0.06 : 0.07, 0.07, isZAxis ? 0.07 : d + 0.06, materials.blackLacquer, x + facingX * (d / 2), 0.78, z + facingZ * (d / 2));

  const backOffsetX = -facingX * (platformD / 2);
  const backOffsetZ = -facingZ * (platformD / 2);
  const panelW = isZAxis ? platformW + 0.2 : 0.08;
  const panelD = isZAxis ? 0.08 : platformW + 0.2;
  block(panelW, 1.95, panelD, materials.paperWarm, x + backOffsetX, 1.88, z + backOffsetZ);

  const sideW = isZAxis ? 0.1 : platformD;
  const sideD = isZAxis ? platformD : 0.1;
  block(sideW, 1.95, sideD, materials.bridgeDark, x - (isZAxis ? (platformW / 2 + 0.04) : 0), 1.88, z + (isZAxis ? 0 : -(platformW / 2 + 0.04)));
  block(sideW, 1.95, sideD, materials.bridgeDark, x + (isZAxis ? (platformW / 2 + 0.04) : 0), 1.88, z + (isZAxis ? 0 : (platformW / 2 + 0.04)));

  const beamW = isZAxis ? platformW + 0.3 : 0.18;
  const beamD = isZAxis ? 0.18 : platformW + 0.3;
  block(beamW, 0.18, beamD, materials.bridgeDark, x, 2.82, z);

  const scrollX = x + backOffsetX + facingX * 0.07;
  const scrollZ = z + backOffsetZ + facingZ * 0.07;
  addHangingScroll(scrollX, 1.85, scrollZ, theme, facing, 1.05);

  const ikebanaX = x + facingX * 0.05 - (isZAxis ? platformW * 0.3 : 0);
  const ikebanaZ = z + facingZ * 0.05 - (isZAxis ? 0 : platformW * 0.3);
  addIkebana(ikebanaX, 0.92, ikebanaZ);

  const bowlX = x + facingX * 0.05 + (isZAxis ? platformW * 0.28 : 0);
  const bowlZ = z + facingZ * 0.05 + (isZAxis ? 0 : platformW * 0.28);
  block(0.22, 0.04, 0.22, materials.blackLacquer, bowlX, 0.94, bowlZ);
  block(0.18, 0.08, 0.18, materials.ceramic, bowlX, 1.0, bowlZ);
  block(0.06, 0.05, 0.06, materials.flower, bowlX, 1.06, bowlZ);

  const light = new THREE.PointLight("#ffd2a0", 1.1, 4.4, 2);
  light.position.set(x + facingX * 0.3, 2.05, z + facingZ * 0.3);
  scene.add(light);
  addCollider(x, z, w + 0.1, d + 0.1);
}

function addWallShelf(x, y, z, width, axis, facing) {
  const isZ = axis === "z";
  block(isZ ? 0.22 : width, 0.05, isZ ? width : 0.22, materials.bridgeDark, x, y, z);
  block(isZ ? 0.18 : width * 0.94, 0.02, isZ ? width * 0.94 : 0.18, materials.gold, x, y + 0.035, z);
  const bracketOff = width * 0.4;
  if (isZ) {
    block(0.18, 0.18, 0.05, materials.bridgeDark, x + (facing === "+x" ? -0.06 : 0.06), y - 0.1, z - bracketOff);
    block(0.18, 0.18, 0.05, materials.bridgeDark, x + (facing === "+x" ? -0.06 : 0.06), y - 0.1, z + bracketOff);
  } else {
    block(0.05, 0.18, 0.18, materials.bridgeDark, x - bracketOff, y - 0.1, z + (facing === "+z" ? -0.06 : 0.06));
    block(0.05, 0.18, 0.18, materials.bridgeDark, x + bracketOff, y - 0.1, z + (facing === "+z" ? -0.06 : 0.06));
  }
}

function addPaperLantern(x, y, z) {
  block(0.28, 0.04, 0.28, materials.bridgeDark, x, y + 0.5, z);
  const shade = block(0.34, 0.42, 0.34, materials.lanternWarm, x, y + 0.22, z);
  block(0.06, 0.5, 0.06, materials.bridgeDark, x, y + 0.74, z);
  block(0.22, 0.04, 0.22, materials.bridgeDark, x, y + 0.005, z);
  const light = new THREE.PointLight("#ffc89a", 0.9, 4.6, 2);
  light.position.set(x, y + 0.22, z);
  scene.add(light);
  shade.userData.baseIntensity = 1;
  animated.push({ type: "lantern", mesh: shade, light });
}

function addRoofs() {
  addLayeredRoof(0, 3.2, 0, 19.6, 18.4, 0.42, 3);
  addLayeredRoof(0, 5.55, -0.85, 14.0, 11.8, 0.58, 4);
  addLayeredRoof(0, 6.95, -0.9, 8.2, 6.4, 0.44, 3);
  addLayeredRoof(0, 3.08, -8.8, 12.4, 7.4, 0.5, 3);

  block(1.0, 0.95, 11.0, materials.roofDark, -6.35, 5.72, -0.7);
  block(1.0, 0.95, 11.0, materials.roofDark, 6.35, 5.72, -0.7);
  block(12.1, 0.82, 0.9, materials.roofDark, 0, 5.82, -6.05);
  block(12.1, 0.82, 0.9, materials.roofDark, 0, 5.82, 4.35);
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

  addSakuraTree(-9.3, 7.7, 0.95);
  addSakuraTree(9.2, 7.9, 0.9);
  addSakuraTree(-9.8, -5.6, 0.88);
  addSakuraTree(9.8, -5.4, 0.86);

  addGardenBed(-5.8, 7.4, 3.8, 0.62);
  addGardenBed(5.8, 7.4, 3.8, 0.62);
  addGardenBed(-8.4, 2.2, 0.62, 5.0);
  addGardenBed(8.4, 2.2, 0.62, 5.0);
  addBackGarden();
}

function addBackGarden() {
  block(12.2, 0.18, 6.4, materials.shore, 0, -0.2, -14.1);
  block(11.4, 0.3, 5.6, materials.grass, 0, -0.06, -14.1);
  block(10.8, 0.12, 0.28, materials.hedge, 0, 0.22, -16.95);
  block(0.28, 0.12, 4.7, materials.hedge, -5.55, 0.22, -14.1);
  block(0.28, 0.12, 4.7, materials.hedge, 5.55, 0.22, -14.1);
  addSakuraTree(0, -14.2, 0.92);

  for (let i = 0; i < 34; i += 1) {
    const petal = block(random(0.08, 0.18), 0.012, random(0.05, 0.13), i % 3 ? materials.flower : materials.sakura, random(-4.7, 4.7), 0.11, random(-16.2, -12.15));
    petal.rotation.y = random(0, Math.PI);
  }
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
      const mat = (ix + iz) % 2 === 0 ? materials.floorAlt : materials.floor;
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

function addWindow(x, z, width, axis, y = 2.05) {
  const glow = block(
    axis === "x" ? width : 0.08,
    0.72,
    axis === "z" ? width : 0.08,
    materials.lanternGlow,
    x,
    y,
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

  [-1.95, 1.95].forEach((offset) => {
    block(0.6, 0.18, 0.6, materials.toriiBlack, offset, 0.09, 0, group);
    block(0.5, 0.08, 0.5, materials.toriiBlack, offset, 0.22, 0, group);
    block(0.42, 2.95, 0.42, materials.vermillion, offset, 1.74, 0, group);
    block(0.48, 0.08, 0.48, materials.toriiBlack, offset, 3.18, 0, group);
  });

  block(4.7, 0.32, 0.38, materials.vermillion, 0, 2.55, 0, group);
  block(0.34, 0.55, 0.16, materials.toriiBlack, 0, 2.99, 0.12, group);

  block(5.2, 0.18, 0.5, materials.toriiBlack, 0, 3.32, 0, group);
  block(6.0, 0.34, 0.62, materials.vermillion, 0, 3.6, 0, group);

  const leftCap = block(0.55, 0.32, 0.62, materials.vermillion, -3.05, 3.71, 0, group);
  leftCap.rotation.z = 0.22;
  const rightCap = block(0.55, 0.32, 0.62, materials.vermillion, 3.05, 3.71, 0, group);
  rightCap.rotation.z = -0.22;

  block(5.8, 0.06, 0.5, materials.toriiBlack, 0, 3.81, 0, group);

  block(0.22, 0.12, 0.22, materials.toriiBlack, 0, 3.79, 0, group);

  group.position.set(x, 0.0, z);
  group.rotation.y = rotationY;
  scene.add(group);
  addCollider(x - 1.95, z, 0.7, 0.7);
  addCollider(x + 1.95, z, 0.7, 0.7);
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

function plankMaterial(base, highlight, plankCount = 8) {
  const texture = document.createElement("canvas");
  texture.width = 128;
  texture.height = 128;
  const ctx = texture.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < plankCount; i += 1) {
    const y = Math.floor((i / plankCount) * 128);
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = i % 2 === 0 ? highlight : base;
    ctx.fillRect(0, y, 128, Math.ceil(128 / plankCount));
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(86, 50, 30, 0.22)";
    ctx.fillRect(0, y, 128, 1.5);
  }
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#fff4d2";
  for (let i = 0; i < 80; i += 1) {
    ctx.fillRect(Math.random() * 128, Math.random() * 128, random(8, 22), 1);
  }
  const map = new THREE.CanvasTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.2, 2.5);
  return new THREE.MeshStandardMaterial({ color: base, map, roughness: 0.72, metalness: 0.01 });
}

function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vWave;
      varying float vFogDepth;
      uniform float time;

      float wv(vec2 p, vec2 d, float f, float s, float a, float ph) {
        return sin(dot(p, d) * f + time * s + ph) * a;
      }
      float dwv(vec2 p, vec2 d, float f, float s, float a, float ph) {
        return cos(dot(p, d) * f + time * s + ph) * a * f;
      }

      void main() {
        vec3 pos = position;
        vec2 p = pos.xy;

        vec2 d1 = vec2(0.92, 0.38);
        vec2 d2 = vec2(-0.45, 0.89);
        vec2 d3 = vec2(0.67, -0.74);
        vec2 d4 = vec2(-0.83, -0.55);
        vec2 d5 = vec2(0.32, 0.95);

        float h = 0.0;
        h += wv(p, d1, 0.34, 1.55, 0.092, 0.0);
        h += wv(p, d2, 0.28, -1.24, 0.068, 1.7);
        h += wv(p, d3, 0.48, 1.85, 0.04, 2.3);
        h += wv(p, d4, 0.68, 0.98, 0.026, 3.4);
        h += wv(p, d5, 0.92, -1.42, 0.018, 4.2);

        pos.z += h;
        vWave = h;

        vec2 grad = vec2(0.0);
        grad += d1 * dwv(p, d1, 0.34, 1.55, 0.092, 0.0);
        grad += d2 * dwv(p, d2, 0.28, -1.24, 0.068, 1.7);
        grad += d3 * dwv(p, d3, 0.48, 1.85, 0.04, 2.3);
        grad += d4 * dwv(p, d4, 0.68, 0.98, 0.026, 3.4);
        grad += d5 * dwv(p, d5, 0.92, -1.42, 0.018, 4.2);

        vec3 localNormal = normalize(vec3(-grad.x, -grad.y, 1.0));
        vNormal = normalize(normalMatrix * localNormal);

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vFogDepth = -mvPos.z;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 shallowColor;
      uniform vec3 deepColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vWave;
      varying float vFogDepth;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 n = normalize(vNormal);
        if (n.y < 0.0) n = -n;

        float NdotV = clamp(dot(n, viewDir), 0.0, 1.0);
        float fresnel = pow(1.0 - NdotV, 4.0);
        fresnel = clamp(fresnel * 0.95 + 0.05, 0.0, 1.0);

        float dist = length(cameraPosition.xz - vWorldPos.xz);
        float depthMix = smoothstep(2.0, 26.0, dist);
        vec3 baseColor = mix(shallowColor, deepColor, depthMix);

        vec3 skyTint = mix(horizonColor * 0.95, vec3(1.0, 0.97, 0.94), 0.16);
        vec3 color = mix(baseColor, skyTint, fresnel * 0.85);

        vec3 sd = normalize(sunDir);
        vec3 halfDir = normalize(sd + viewDir);
        float spec = pow(max(dot(n, halfDir), 0.0), 110.0);
        color += sunColor * spec * 0.65;

        float caustic = vnoise(vWorldPos.xz * 0.38 + vec2(time * 0.13, time * 0.09));
        caustic += vnoise(vWorldPos.xz * 0.72 - vec2(time * 0.08, time * 0.11)) * 0.55;
        caustic = pow(caustic / 1.5, 1.7);
        color += vec3(0.05, 0.10, 0.12) * caustic * 0.45;

        float crest = smoothstep(0.035, 0.12, vWave);
        color += skyTint * crest * 0.18;

        color *= mix(1.0, 0.82, depthMix * 0.55);

        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        color = mix(color, fogColor, fogFactor);

        gl_FragColor = vec4(color, 0.95);
      }
    `,
  });
}

function scrollMaterial(theme) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, 640);
  grad.addColorStop(0, "#f5e2bf");
  grad.addColorStop(0.5, "#ecd09c");
  grad.addColorStop(1, "#dbb47a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 640);

  for (let i = 0; i < 700; i += 1) {
    ctx.globalAlpha = 0.04 + Math.random() * 0.06;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff6d6" : "#7a4f24";
    ctx.fillRect(Math.random() * 256, Math.random() * 640, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#3a201a";
  ctx.fillRect(0, 0, 256, 36);
  ctx.fillRect(0, 604, 256, 36);
  ctx.fillStyle = "#8a5a35";
  ctx.fillRect(0, 30, 256, 8);
  ctx.fillRect(0, 596, 256, 8);

  if (theme === "mountain") {
    ctx.fillStyle = "rgba(48, 32, 28, 0.85)";
    ctx.beginPath();
    ctx.moveTo(20, 330);
    ctx.lineTo(70, 215);
    ctx.lineTo(110, 270);
    ctx.lineTo(150, 190);
    ctx.lineTo(190, 246);
    ctx.lineTo(236, 305);
    ctx.lineTo(236, 380);
    ctx.lineTo(20, 380);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(78, 60, 52, 0.55)";
    ctx.beginPath();
    ctx.moveTo(20, 365);
    ctx.lineTo(60, 320);
    ctx.lineTo(120, 350);
    ctx.lineTo(170, 305);
    ctx.lineTo(220, 348);
    ctx.lineTo(236, 380);
    ctx.lineTo(20, 380);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 244, 218, 0.92)";
    ctx.beginPath();
    ctx.arc(196, 142, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 244, 218, 0.18)";
    ctx.beginPath();
    ctx.arc(196, 142, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c0f08";
    drawKanjiStroke(ctx, 48, 440, 28, 60);
    drawKanjiStroke(ctx, 48, 510, 24, 58);
  } else if (theme === "sakura") {
    ctx.strokeStyle = "#2a1810";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(220, 130);
    ctx.bezierCurveTo(170, 200, 130, 230, 60, 290);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(160, 200);
    ctx.bezierCurveTo(180, 170, 200, 165, 230, 175);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(110, 250);
    ctx.bezierCurveTo(90, 230, 75, 240, 50, 220);
    ctx.stroke();
    for (let i = 0; i < 24; i += 1) {
      const px = 50 + Math.random() * 180;
      const py = 130 + Math.random() * 180;
      drawCherryBlossom(ctx, px, py, 7 + Math.random() * 4);
    }
    ctx.fillStyle = "#1c0f08";
    drawKanjiStroke(ctx, 56, 440, 26, 50);
    drawKanjiStroke(ctx, 56, 500, 24, 56);
  } else if (theme === "bamboo") {
    for (let i = 0; i < 3; i += 1) {
      const bx = 70 + i * 60;
      ctx.fillStyle = "#3e6e36";
      ctx.fillRect(bx - 8, 80, 16, 460);
      ctx.fillStyle = "#5a8c4a";
      ctx.fillRect(bx - 5, 80, 4, 460);
      ctx.fillStyle = "#1f3618";
      for (let j = 0; j < 9; j += 1) {
        ctx.fillRect(bx - 11, 100 + j * 50, 22, 4);
      }
      ctx.fillStyle = "#456f2c";
      for (let j = 0; j < 3; j += 1) {
        const ly = 130 + j * 130;
        ctx.beginPath();
        ctx.ellipse(bx + 12 + j * 4, ly, 22, 6, 0.3 + j * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx - 16 - j * 3, ly + 25, 20, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === "calligraphy") {
    ctx.fillStyle = "#1c0f08";
    drawKanjiStroke(ctx, 90, 110, 70, 90);
    drawKanjiStroke(ctx, 90, 235, 70, 90);
    drawKanjiStroke(ctx, 90, 360, 70, 90);
    drawKanjiStroke(ctx, 90, 485, 70, 90);
    ctx.fillStyle = "#9a2018";
    ctx.fillRect(180, 540, 30, 30);
    ctx.fillStyle = "#fbe2bf";
    ctx.font = "bold 18px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("印", 195, 562);
  } else if (theme === "crane") {
    ctx.fillStyle = "rgba(48, 32, 28, 0.55)";
    ctx.beginPath();
    ctx.moveTo(20, 380);
    ctx.bezierCurveTo(60, 360, 110, 366, 140, 374);
    ctx.bezierCurveTo(170, 380, 210, 372, 236, 378);
    ctx.lineTo(236, 396);
    ctx.lineTo(20, 396);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40, 30, 26, 0.85)";
    ctx.fillStyle = "rgba(252, 246, 232, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(140, 280, 38, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(170, 270);
    ctx.lineTo(202, 220);
    ctx.lineTo(208, 226);
    ctx.lineTo(178, 280);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#9a2018";
    ctx.beginPath();
    ctx.arc(205, 222, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1410";
    ctx.fillRect(100, 290, 8, 56);
    ctx.fillRect(155, 290, 8, 56);
    ctx.fillStyle = "#1c0f08";
    drawKanjiStroke(ctx, 56, 460, 28, 60);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
}

function drawKanjiStroke(ctx, x, y, w, h) {
  ctx.fillRect(x, y, w, h * 0.16);
  ctx.fillRect(x + w * 0.4, y + h * 0.16, w * 0.18, h * 0.6);
  ctx.fillRect(x - w * 0.05, y + h * 0.55, w + w * 0.1, h * 0.16);
  ctx.fillRect(x + w * 0.15, y + h * 0.16, w * 0.12, h * 0.55);
  ctx.fillRect(x + w * 0.72, y + h * 0.18, w * 0.12, h * 0.55);
}

function drawCherryBlossom(ctx, cx, cy, r) {
  const colors = ["#f7a4bc", "#ffd6dd", "#ffbed1"];
  ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  for (let p = 0; p < 5; p += 1) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.45, r * 0.7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7c2c4a";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
}

function tatamiMaterial(repeatX = 1, repeatZ = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c8bd86";
  ctx.fillRect(0, 0, 128, 256);

  ctx.strokeStyle = "rgba(110, 95, 50, 0.32)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 128; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240, 220, 160, 0.28)";
  for (let x = 1; x < 128; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let i = 0; i < 280; i += 1) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff5d2" : "#5a4a1e";
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#3a2418";
  ctx.fillRect(0, 0, 6, 256);
  ctx.fillRect(122, 0, 6, 256);
  ctx.fillStyle = "#5a3924";
  ctx.fillRect(2, 0, 2, 256);
  ctx.fillRect(124, 0, 2, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatZ);
  return new THREE.MeshStandardMaterial({ color: "#c8bd86", map: tex, roughness: 0.92 });
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

function addCollider(x, z, w, d, active = true, minY = -0.75, maxY = 2.75) {
  const collider = box2D(x, z, w, d);
  collider.active = active;
  collider.minY = minY;
  collider.maxY = maxY;
  colliders.push(collider);
  return collider;
}

function box2D(x, z, w, d) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function isPlayable(x, z) {
  const r = 0.32;
  return playable.some((box) => x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ);
}

function getFloorHeight(x, z) {
  const inStairX = x > 4.05 && x < 6.05;
  const inStairZ = z > -2.6 && z < 3.95;
  if (inStairX && inStairZ) {
    const t = THREE.MathUtils.clamp((3.9 - z + 0.24) / 5.6, 0, 1);
    return t * UPPER_FLOOR_Y;
  }

  const onUpperFootprint = x > -5.65 && x < 6.2 && z > -5.8 && z < 4.45;
  if (onUpperFootprint && state.floorY > UPPER_FLOOR_Y * 0.45) {
    return UPPER_FLOOR_Y;
  }

  return 0;
}

function hitsCollider(x, z) {
  const r = 0.34;
  const y = state.floorY + state.jumpOffset;
  return colliders.some(
    (box) =>
      box.active !== false &&
      y >= box.minY &&
      y <= box.maxY &&
      x + r > box.minX &&
      x - r < box.maxX &&
      z + r > box.minZ &&
      z - r < box.maxZ,
  );
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

  const targetFloorY = getFloorHeight(camera.position.x, camera.position.z);
  const floorEase = Math.abs(targetFloorY - state.floorY) > 0.05 ? 10 : 18;
  state.floorY = damp(state.floorY, targetFloorY, floorEase, delta);

  if (!state.grounded || state.verticalVelocity > 0) {
    state.jumpOffset += state.verticalVelocity * delta;
    state.verticalVelocity -= GRAVITY * delta;
    if (state.jumpOffset <= 0) {
      state.jumpOffset = 0;
      state.verticalVelocity = 0;
      state.grounded = true;
    }
  }

  const planarSpeed = Math.hypot(state.velocity.x, state.velocity.z);
  state.bobPhase += delta * planarSpeed * 6.6;
  const bobTarget = THREE.MathUtils.clamp(planarSpeed / 3.15, 0, 1) * state.moveBlend;
  state.bobAmount = damp(state.bobAmount, bobTarget, 8, delta);
  const stepBob = Math.sin(state.bobPhase) * 0.03 * state.bobAmount;
  const stepLift = Math.abs(Math.cos(state.bobPhase)) * 0.015 * state.bobAmount;
  camera.position.y = state.floorY + EYE_HEIGHT + state.jumpOffset + stepBob + stepLift;
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

  waterUniforms.horizonColor.value.copy(horizon).lerp(top, 0.35);
  waterUniforms.fogColor.value.copy(horizon);
  waterUniforms.fogNear.value = scene.fog.near;
  waterUniforms.fogFar.value = scene.fog.far;
  const sunIntensityFactor = THREE.MathUtils.clamp(daylight + evening * 0.5, 0.0, 1.0);
  waterUniforms.sunColor.value
    .copy(new THREE.Color("#fff0c8"))
    .lerp(new THREE.Color("#b9c8ff"), 1 - sunIntensityFactor);
  waterUniforms.sunDir.value
    .copy(sun.position)
    .normalize();
  const shallow = new THREE.Color("#4d7a88");
  const shallowNight = new THREE.Color("#2d3a4a");
  waterUniforms.shallowColor.value
    .copy(shallow)
    .lerp(shallowNight, 1 - sunIntensityFactor);

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
  frontDoor.progress = damp(frontDoor.progress, frontDoor.target, 9, delta);
  frontDoor.panels.forEach((panel) => {
    panel.group.position.x = THREE.MathUtils.lerp(panel.closedX, panel.openX, frontDoor.progress);
  });
  frontDoor.colliders.forEach((collider) => {
    collider.active = frontDoor.target < 0.5 && frontDoor.progress < 0.18;
  });

  animated.forEach((item) => {
    if (item.type === "water") {
      item.mesh.material.uniforms.time.value = now * 0.00145;
    }
    if (item.type === "ripple") {
      const t = ((now * 0.001 + item.mesh.userData.phase) % item.mesh.userData.period) / item.mesh.userData.period;
      const scale = 0.4 + t * 4.2;
      item.mesh.scale.set(scale, scale, 1);
      item.mesh.material.opacity = Math.max(0, (1 - t) * 0.18);
    }
    if (item.type === "floatPetal") {
      const t = now * 0.0008;
      item.mesh.position.x += item.mesh.userData.driftX * delta;
      item.mesh.position.z += Math.sin(t * 1.4 + item.mesh.userData.phase) * delta * 0.08;
      item.mesh.position.y = item.mesh.userData.origY + Math.sin(t * 2.2 + item.mesh.userData.phase) * 0.012;
      item.mesh.rotation.z += delta * item.mesh.userData.spin;
      if (item.mesh.position.x > 30) item.mesh.position.x = -30;
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
  if (Math.abs(camera.position.x) < 2.4 && camera.position.z > 5.0 && camera.position.z < 8.0 && state.floorY < 0.8) {
    spotLabel.textContent = frontDoor.open ? "Front Door - F to close" : "Front Door - F to open";
    return;
  }

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

function toggleFrontDoor() {
  const nearDoor = Math.abs(camera.position.x) < 2.6 && camera.position.z > 5.0 && camera.position.z < 8.2 && state.floorY < 0.8;
  if (!nearDoor) return;
  frontDoor.open = !frontDoor.open;
  frontDoor.target = frontDoor.open ? 1 : 0;
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
  state.floorY = Math.max(0, spot.position.y - EYE_HEIGHT);
  const measuredFloor = getFloorHeight(camera.position.x, camera.position.z);
  if (measuredFloor > 0 || state.floorY < UPPER_FLOOR_Y * 0.5) {
    state.floorY = measuredFloor;
  }
  state.jumpOffset = 0;
  state.verticalVelocity = 0;
  state.grounded = true;
  camera.position.y = state.floorY + EYE_HEIGHT;
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
  if (event.code === "KeyF" && !event.repeat) {
    toggleFrontDoor();
  }
  if (event.code === "Space") {
    intro.classList.add("is-hidden");
    requestLookControl();
    if (state.grounded && !event.repeat) {
      state.verticalVelocity = JUMP_VELOCITY;
      state.grounded = false;
    }
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
