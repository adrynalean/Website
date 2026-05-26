import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#scene");
const enterButton = document.querySelector("#enterButton");
const intro = document.querySelector("#intro");
const spotLabel = document.querySelector("#spotLabel");
const timeLabel = document.querySelector("#timeLabel");
const timeToggle = document.querySelector("#timeToggle");
const portfolioPanel = document.querySelector("#portfolioPanel");
const portfolioTitle = document.querySelector("#portfolioTitle");
const portfolioEyebrow = document.querySelector("#portfolioEyebrow");
const portfolioBody = document.querySelector("#portfolioBody");
const portfolioClose = document.querySelector("#portfolioClose");
const interactionHint = document.querySelector("#interactionHint");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
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
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const EYE_HEIGHT = 1.7;
const GRAVITY = 11.5;
const JUMP_VELOCITY = 4.35;
const mouseSensitivity = 0.00135;
const keyboardTurnSpeed = 1.7;
const lookEase = 18;
const moveEase = 9.5;
const stopEase = 12;
const WORLD_SCALE = 0.65;

function sx(value) {
  return value * WORLD_SCALE;
}

function sz(value) {
  return value * WORLD_SCALE;
}

function scaledVector(x, y, z) {
  return new THREE.Vector3(sx(x), y, sz(z));
}

const palette = {
  cedar: "#a66b3f",
  cedarDark: "#d4b68a",
  cedarLight: "#efd6ad",
  roof: "#d5743d",
  roofDark: "#994a2b",
  roofHighlight: "#ef9b5d",
  blossomPanel: "#f5b6bf",
  paper: "#fff5da",
  paperDim: "#f2dfbf",
  stone: "#9c9588",
  water: "#54b4e3",
  deepWater: "#1c5f9f",
  sakura: "#ebaebe",
  sakuraLight: "#ffd6de",
  sakuraDark: "#c5748c",
  leaf: "#6f8658",
  grass: "#77945f",
  shore: "#9b8063",
  mountain: "#8b7898",
  mountainSnow: "#f1e3dc",
  lantern: "#ffd28a",
  gold: "#d9a563",
};

const waterUniforms = {
  time: { value: 0 },
  shallowColor: { value: new THREE.Color("#4fa8d8") },
  deepColor: { value: new THREE.Color("#1d5e9b") },
  horizonColor: { value: new THREE.Color("#a8d8f2") },
  sunColor: { value: new THREE.Color("#fff0c8") },
  sunDir: { value: new THREE.Vector3(0.35, 0.78, 0.5).normalize() },
  fogColor: { value: new THREE.Color("#d58b82") },
  fogNear: { value: 36 },
  fogFar: { value: 108 },
};

const materials = {
  bridge: blockMaterial("#b98251", "#d8a66d"),
  bridgeDark: blockMaterial("#d6bb91", "#f2dfbd"),
  roof: blockMaterial(palette.roof, palette.roofHighlight),
  roofDark: blockMaterial(palette.roofDark, "#9b4526"),
  blossomPanel: blockMaterial(palette.blossomPanel, "#ffd4da"),
  paper: blockMaterial(palette.paper, "#fff0ce"),
  paperDim: blockMaterial(palette.paperDim, "#fff0ce"),
  floor: blockMaterial("#d8b982", "#f1d6a7"),
  floorAlt: plankMaterial("#e7c894", "#fff0c7", 10),
  woodLight: blockMaterial("#d8b98a", "#f2d9ac"),
  tatami: blockMaterial("#d8c98d", "#eee0a8"),
  rug: blockMaterial("#ead0ae", "#fff0c9"),
  stone: blockMaterial(palette.stone, "#969085"),
  grass: createGrassMaterial(),
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
  ceiling: new THREE.MeshBasicMaterial({ color: "#f4dfbd" }),
  lily: new THREE.MeshBasicMaterial({ color: "#6f965c", side: THREE.DoubleSide }),
  lotus: new THREE.MeshBasicMaterial({ color: "#ff96bd", side: THREE.DoubleSide }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: palette.lantern }),
  lanternWarm: new THREE.MeshBasicMaterial({ color: "#ffdba6" }),
  water: createWaterMaterial(),
  tatamiWeave: tatamiMaterial(1, 1),
  charcoal: blockMaterial("#352822", "#48362d"),
  jade: blockMaterial("#5c7a5e", "#86a78a"),
  blackLacquer: blockMaterial("#5f4a38", "#8a7057"),
  gold: blockMaterial(palette.gold, "#fff5da"),
  cedarDark: blockMaterial("#d4b68a", "#f0d8b0"),
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
const boxGeometryCache = new Map();
const doors = [];
const interactables = [];
const frontDoor = createDoorController("Front Door", true);

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
  Bridge: { position: scaledVector(0, EYE_HEIGHT, 23), yaw: 0, label: "Bridge Approach" },
  Gate: { position: scaledVector(0, EYE_HEIGHT, 8.4), yaw: 0, label: "Lantern Gate" },
  Map: { position: scaledVector(0, EYE_HEIGHT, 0.15), yaw: 0, label: "Portfolio Map Table" },
  Hall: { position: scaledVector(-14.15, EYE_HEIGHT, 1.65), yaw: -Math.PI / 2, label: "Main Hall" },
  Tech: { position: scaledVector(14.4, EYE_HEIGHT, 2.35), yaw: Math.PI / 2, label: "Tool Wall" },
  "West Room": { position: scaledVector(-14.4, EYE_HEIGHT, -5.45), yaw: -Math.PI / 2, label: "West Room" },
  "East Room": { position: scaledVector(14.0, EYE_HEIGHT, -4.3), yaw: Math.PI / 2, label: "East Room" },
  "Rear Room": { position: scaledVector(-14.0, EYE_HEIGHT, -19.2), yaw: -Math.PI / 2, label: "Rear Room" },
  Garden: { position: scaledVector(0, EYE_HEIGHT, -34.1), yaw: 0, label: "Back Garden" },
};

const portfolioSections = {
  map: {
    title: "House Map",
    eyebrow: "Foyer Floor Plan",
    lead:
      "This house is the portfolio: each room is a section, and each wall exhibit opens a focused detail panel.",
    groups: [
      {
        heading: "Route",
        items: [
          "Main Hall - mission and personal direction.",
          "Tool Wall - languages, frameworks, and technical fields.",
          "West Room - education and awards.",
          "East Room - featured projects.",
          "Rear Room - experience timeline.",
          "Garden - contact links and resume.",
        ],
      },
    ],
  },
  mission: {
    title: "Mission Statement",
    eyebrow: "Main Hall Scroll",
    lead:
      "I'm Sashit Vijay, a computer science graduate focused on full-stack development, machine learning, and practical systems that make technology feel useful, approachable, and a little more human.",
    groups: [
      {
        heading: "What I Care About",
        items: [
          "Simplifying complex workflows with clean software and thoughtful interfaces.",
          "Combining strong engineering fundamentals with practical machine learning.",
          "Creating tools that connect people, improve access, and solve real problems.",
        ],
      },
    ],
  },
  education: {
    title: "Education",
    eyebrow: "West Study Room",
    lead: "Arizona State University, Ira A. Fulton School of Engineering - B.S. in Computer Science, May 2025.",
    groups: [
      {
        heading: "ASU Highlights",
        items: [
          "GPA: 4.0/4.0 with Dean's List recognition for 8 consecutive semesters.",
          "Moeur Award recipient, Summa Cum Laude, Class of 2025.",
          "NAMU Scholar, IEEE Scholar, Kaplan Scholar, and ASU Men's Ultimate Frisbee captain.",
        ],
      },
      {
        heading: "Earlier Foundation",
        items: [
          "St. Paul's High School, Kota, India - GPA: 4.0/4.0.",
          "Class valedictorian and school representative in marathon and ultra-marathon events.",
        ],
      },
    ],
  },
  experience: {
    title: "Experience",
    eyebrow: "Rear Workroom",
    lead: "A mix of software engineering, research, teaching, tutoring, and operations leadership.",
    groups: [
      {
        heading: "Recent Roles",
        cards: [
          {
            title: "High School Physics and Mathematics Teacher",
            meta: "Great Hearts Veritas Prep - July 2025 to Present",
            body: "Designs engaging lessons for 100+ students while reinforcing quantitative reasoning and adapting explanations to varied learning needs.",
          },
          {
            title: "Research Assistant",
            meta: "Laboratory for Learning Evaluation of autonomous Systems Lab, ASU - Oct. 2024 to July 2025",
            body: "Worked on a Unitree Go2 robotic dog assistant with diffusion-based navigation and LLM-powered command processing for visually impaired users.",
          },
          {
            title: "Fullstack Developer Co-op",
            meta: "Tnect Validation API, Bytewerx LLC - Aug. 2024 to May 2025",
            body: "Built API key management, RBAC, token-based recovery, Redis-backed rate limiting, and real-time usage analytics.",
          },
          {
            title: "Software Engineer Intern",
            meta: "PI Academy - May 2024 to July 2024",
            body: "Built image-analysis tooling to classify 400+ food waste types and improved model accuracy through ensemble learning.",
          },
        ],
      },
    ],
  },
  projects: {
    title: "Projects",
    eyebrow: "East Project Room",
    lead: "Selected projects from the latest resume, staged here as lightweight project cards.",
    groups: [
      {
        heading: "Featured Builds",
        cards: [
          {
            title: "Thred",
            meta: "React, CSS, JavaScript, Axios, Node.js, OpenAI Integration",
            body: "Responsive full-screen chatbot interface inspired by ChatGPT, focused on interface fluidity and usability.",
            href: "https://github.com/adrynalean/Thred",
          },
          {
            title: "SoccerSense",
            meta: "Python, OpenCV, YOLO, PyTorch, KMeans, Pandas, Numpy",
            body: "Live soccer analysis with tracking, interpolation, perspective transforms, clustering, and player statistics.",
            href: "https://github.com/adrynalean/SoccerSense",
          },
          {
            title: "SyncLink",
            meta: "C, Shell Scripting, Operating Systems, Networking, Socket Programming",
            body: "Network file system supporting seamless file operations and optimized server response handling.",
            href: "https://github.com/adrynalean/SyncLink",
          },
          {
            title: "ThreadIt",
            meta: "MongoDB, Express, React, Node, Docker",
            body: "Reddit-inspired social platform with fuzzy search, reporting, user registration, and Docker deployment.",
            href: "https://github.com/adrynalean/ThreadIt",
          },
        ],
      },
    ],
  },
  tech: {
    title: "Tech Stack",
    eyebrow: "Tool Cabinet",
    lead: "A compact view of the languages, libraries, and fields from the current resume.",
    tags: [
      "Python",
      "Java",
      "C++",
      "C",
      "CSS",
      "Ubuntu",
      "MySQL",
      "MATLAB",
      "Django",
      "Flask",
      "JavaFX",
      "PyTorch",
      "React",
      "MongoDB",
      "OpenCV",
      "scikit-learn",
      "NumPy",
      "Pandas",
      "Machine Learning",
      "Computer Vision",
      "Digital ASIC",
    ],
  },
  contact: {
    title: "Contact",
    eyebrow: "Garden Ema Board",
    lead: "The calm little end point: ways to reach me and a copy of the current resume.",
    actions: [
      { label: "Email", href: "mailto:sashitvijay@gmail.com" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/sashit-vijay-443b18194/" },
      { label: "GitHub", href: "https://github.com/adrynalean" },
      { label: "Website", href: "https://sashitvijay.com" },
      { label: "Resume PDF", href: "./assets/SV_CV_26.pdf" },
    ],
  },
};

const state = {
  keys: new Set(),
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  velocity: new THREE.Vector3(),
  activeInteractable: null,
  mapFocus: null,
  last: performance.now(),
  pointerLocked: false,
  dragLook: false,
  bobPhase: 0,
  bobAmount: 0,
  moveBlend: 0,
  sway: 0,
  lookSway: 0,
  dayTime: 0.12,
  timePresetIndex: 1,
  floorY: 0,
  jumpOffset: 0,
  verticalVelocity: 0,
  grounded: true,
};

const timePresets = [
  { label: "Sakura Dawn", value: 0.035 },
  { label: "Bright Day", value: 0.25 },
  { label: "Sunset", value: 0.49 },
  { label: "Lantern Night", value: 0.76 },
];

timeToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  state.timePresetIndex = (state.timePresetIndex + 1) % timePresets.length;
  state.dayTime = timePresets[state.timePresetIndex].value;
  updateLighting(0);
});

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
  addSakuraForest();
  addBridge();
  addHouse();
  addExteriorDetails();
  addPetals();
}

function addWater() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(sx(64), sz(76), 28, 32), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.34;
  water.position.z = sz(4);
  scene.add(water);
  animated.push({ type: "water", mesh: water });

  const ringMat = new THREE.MeshBasicMaterial({
    color: "#cfe0e6",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), ringMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx(random(-22, 22)), -0.27, sz(random(-22, 32)));
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
  for (let i = 0; i < 24; i += 1) {
    const mat = baseMat.clone();
    mat.color = new THREE.Color(i % 3 === 0 ? "#ffd6dc" : i % 3 === 1 ? "#f7a4bc" : "#ffe2e7");
    const petal = new THREE.Mesh(geo, mat);
    petal.rotation.x = -Math.PI / 2;
    petal.rotation.z = random(0, Math.PI * 2);
    petal.position.set(sx(random(-26, 26)), -0.215, sz(random(-26, 32)));
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

function addSakuraForestBackdrop() {
  const texture = createSakuraForestTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const panels = [
    { x: 0, z: -57, w: 128, h: 24, r: 0 },
    { x: -56, z: 0, w: 106, h: 22, r: Math.PI / 2 },
    { x: 56, z: 0, w: 106, h: 22, r: -Math.PI / 2 },
  ];

  panels.forEach(({ x, z, w, h, r }) => {
    const forest = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    forest.position.set(sx(x), h / 2 - 1.6, sz(z));
    forest.rotation.y = r;
    scene.add(forest);
  });
}

function createSakuraForestTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const skyFade = ctx.createLinearGradient(0, 0, 0, 512);
  skyFade.addColorStop(0, "rgba(255, 230, 220, 0)");
  skyFade.addColorStop(0.28, "rgba(255, 222, 216, 0.28)");
  skyFade.addColorStop(1, "rgba(96, 66, 72, 0.62)");
  ctx.fillStyle = skyFade;
  ctx.fillRect(0, 0, 2048, 512);

  for (let layer = 0; layer < 3; layer += 1) {
    const count = [34, 42, 56][layer];
    const yBase = [355, 392, 430][layer];
    const alpha = [0.38, 0.55, 0.82][layer];
    const scale = [0.72, 0.92, 1.14][layer];
    for (let i = 0; i < count; i += 1) {
      const x = ((i + Math.random() * 0.9) / count) * 2048;
      const trunkH = random(74, 132) * scale;
      const trunkW = random(8, 18) * scale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = layer === 2 ? "#3f241f" : "#67413a";
      ctx.fillRect(x - trunkW / 2, yBase - trunkH, trunkW, trunkH + 50);

      const blobCount = 5 + layer * 2;
      for (let b = 0; b < blobCount; b += 1) {
        const radius = random(34, 78) * scale;
        const cx = x + random(-56, 56) * scale;
        const cy = yBase - trunkH + random(-42, 26) * scale;
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
        grad.addColorStop(0, layer === 2 ? "rgba(255, 196, 209, 0.95)" : "rgba(238, 166, 185, 0.7)");
        grad.addColorStop(0.7, layer === 2 ? "rgba(210, 92, 124, 0.78)" : "rgba(185, 96, 126, 0.48)");
        grad.addColorStop(1, "rgba(120, 48, 76, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  const groundFade = ctx.createLinearGradient(0, 360, 0, 512);
  groundFade.addColorStop(0, "rgba(80, 82, 48, 0)");
  groundFade.addColorStop(1, "rgba(50, 66, 34, 0.9)");
  ctx.fillStyle = groundFade;
  ctx.fillRect(0, 340, 2048, 172);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
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
  ridge.position.set(sx(x), 0, sz(z));
  ridge.rotation.y = rotationY;
  scene.add(ridge);
}

function addBridge() {
  addPlayable(0, 16.4, 5.4, 23.8);
  addCollider(-2.25, 16.2, 0.55, 17.2);
  addCollider(2.25, 16.2, 0.55, 17.2);
  addCollider(0, 26.0, 4.7, 0.55);

  const planks = [];
  for (let z = 7.1; z <= 25.5; z += 0.72) {
    planks.push({ w: 3.55, h: 0.16, d: 0.55, x: 0, y: 0.05, z });
  }
  addInstancedBoxes(planks, materials.bridge);

  [-2.05, 2.05].forEach((x) => {
    block(0.22, 0.45, 19.4, materials.bridgeDark, x, 0.38, 16.35);
    for (let z = 7.4; z <= 25.3; z += 3.6) {
      block(0.34, 1.15, 0.34, materials.bridgeDark, x, 0.72, z);
      addLantern(x, z, 1.5, 0.36);
    }
  });
  addBoundaryFence(0, 26.0, 4.8, "x");

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
  addPlayable(0, -9.6, 33.9, 33.3);
  addPlayable(0, -38.0, 42.0, 24.0);

  block(35.4, 0.8, 34.5, materials.stone, 0, 0, -9.6);
  block(34.1, 0.28, 33.2, materials.floor, 0, 0.54, -9.6);

  addInteriorFloor(0, -9.6, 32.4, 31.5);
  addHouseWalls();
  addFrontDoor();
  addRoofs();
  addRoomPartitions();
  addInteriorDetails();
}

function addHouseWalls() {
  const wallY = 2.35;
  const h = 3.8;
  const zFront = 6.8;
  const zBack = -26.05;
  const xLeft = -17.1;
  const xRight = 17.1;
  const zMid = (zFront + zBack) / 2;

  wallSegment(-9.15, zFront, 15.75, h, "x", wallY);
  wallSegment(9.15, zFront, 15.75, h, "x", wallY);
  wallSegment(xLeft, zMid, 32.85, h, "z", wallY);
  wallSegment(xRight, zMid, 32.85, h, "z", wallY);
  wallSegment(-9.4, zBack, 14.85, h, "x", wallY);
  wallSegment(9.4, zBack, 14.85, h, "x", wallY);

  addCollider(-9.15, zFront, 15.75, 0.5);
  addCollider(9.15, zFront, 15.75, 0.5);
  addCollider(xLeft, zMid, 0.5, 32.85);
  addCollider(xRight, zMid, 0.5, 32.85);
  addCollider(-9.4, zBack, 14.85, 0.5);
  addCollider(9.4, zBack, 14.85, 0.5);

  addWindow(-7.9, zFront + 0.03, 2.6, "x", 2.6);
  addWindow(7.9, zFront + 0.03, 2.6, "x", 2.6);
  addWindow(-17.13, -2.4, 2.8, "z", 2.6);
  addWindow(17.13, -2.4, 2.8, "z", 2.6);
  addWindow(-17.13, -14.8, 2.8, "z", 2.6);
  addWindow(17.13, -14.8, 2.8, "z", 2.6);
  addBackDoorFrame(0, zBack - 0.01);
}

function addBackDoorFrame(x, z) {
  block(0.24, 2.6, 0.18, materials.bridgeDark, x - 1.25, 1.87, z);
  block(0.24, 2.6, 0.18, materials.bridgeDark, x + 1.25, 1.87, z);
  block(2.75, 0.2, 0.2, materials.bridgeDark, x, 3.26, z);
  block(2.35, 1.05, 0.16, materials.paperDim, x, 3.86, z);
  block(2.25, 0.12, 0.56, materials.woodLight, x, 0.82, z + 0.1);
}

function addFrontDoor() {
  const z = 6.86;
  block(0.28, 2.3, 0.18, materials.bridgeDark, -1.62, 1.66, z + 0.08);
  block(0.28, 2.3, 0.18, materials.bridgeDark, 1.62, 1.66, z + 0.08);
  block(3.55, 0.2, 0.2, materials.bridgeDark, 0, 2.78, z + 0.08);
  block(3.2, 0.12, 0.18, materials.gold, 0, 2.58, z + 0.12);
  block(3.25, 1.65, 0.16, materials.paperDim, 0, 3.50, z + 0.1);
  block(3.45, 0.18, 0.22, materials.bridgeDark, 0, 4.35, z + 0.1);
  block(3.0, 0.12, 0.42, materials.woodLight, 0, 0.82, z - 0.04);
  frontDoor.center.set(0, z);

  [
    { side: -1, closedX: -0.58, openX: -1.78 },
    { side: 1, closedX: 0.58, openX: 1.78 },
  ].forEach(({ side, closedX, openX }) => {
    const group = new THREE.Group();
    const panelZ = 0.16;
    group.position.set(sx(openX), 0, sz(z));
    block(1.2, 2.36, 0.08, materials.paperWarm, 0, 2.05, panelZ, group);
    block(1.28, 0.1, 0.12, materials.bridgeDark, 0, 3.24, panelZ, group);
    block(1.28, 0.1, 0.12, materials.bridgeDark, 0, 0.86, panelZ, group);
    block(0.08, 2.4, 0.12, materials.bridgeDark, side * -0.6, 2.05, panelZ, group);
    block(0.08, 2.4, 0.12, materials.bridgeDark, side * 0.6, 2.05, panelZ, group);
    block(0.08, 2.25, 0.14, materials.bridgeDark, side * -0.62, 2.03, panelZ, group);
    block(0.18, 0.18, 0.12, materials.gold, side * -0.22, 1.9, panelZ + 0.04, group);
    scene.add(group);
    const collider = addCollider(closedX, z, 1.08, 0.32, false, -0.5, 2.9);
    frontDoor.panels.push({ group, closedX: sx(closedX), closedZ: sz(z), openX: sx(openX), openZ: sz(z) });
    frontDoor.colliders.push(collider);
  });
  frontDoor.solidCollider = addCollider(0, z, 2.8, 0.52, false, -0.5, 3.0);
}

function createDoorController(label, initiallyOpen = false) {
  const door = {
    label,
    panels: [],
    colliders: [],
    center: new THREE.Vector2(999, 999),
    open: initiallyOpen,
    progress: initiallyOpen ? 1 : 0,
    target: initiallyOpen ? 1 : 0,
    solidCollider: null,
  };
  doors.push(door);
  return door;
}

function addSlidingDoor(label, x, z, axis, width, initiallyOpen = false) {
  const door = createDoorController(label, initiallyOpen);
  door.center.set(x, z);
  const isHorizontal = axis === "x";
  const panelWidth = width * 0.52;
  const openOffset = width * 0.45;
  const closedOffset = width * 0.24;

  block(isHorizontal ? width + 0.42 : 0.42, 0.18, isHorizontal ? 0.16 : width + 0.42, materials.bridgeDark, x, 0.92, z);
  block(isHorizontal ? width + 0.5 : 0.5, 0.16, isHorizontal ? 0.18 : width + 0.5, materials.bridgeDark, x, 3.15, z);

  [-1, 1].forEach((side) => {
    const group = new THREE.Group();
    const closedX = isHorizontal ? x + side * closedOffset : x;
    const closedZ = isHorizontal ? z : z + side * closedOffset;
    const openX = isHorizontal ? x + side * openOffset : x;
    const openZ = isHorizontal ? z : z + side * openOffset;
    group.position.set(sx(initiallyOpen ? openX : closedX), 0, sz(initiallyOpen ? openZ : closedZ));

    block(isHorizontal ? panelWidth : 0.08, 2.35, isHorizontal ? 0.08 : panelWidth, materials.paperWarm, 0, 2.16, 0, group);
    block(isHorizontal ? panelWidth + 0.08 : 0.12, 0.08, isHorizontal ? 0.12 : panelWidth + 0.08, materials.bridgeDark, 0, 3.36, 0, group);
    block(isHorizontal ? panelWidth + 0.08 : 0.12, 0.08, isHorizontal ? 0.12 : panelWidth + 0.08, materials.bridgeDark, 0, 0.98, 0, group);

    for (let i = -1; i <= 1; i += 1) {
      const offset = i * panelWidth * 0.24;
      block(isHorizontal ? 0.045 : 0.08, 2.2, isHorizontal ? 0.08 : 0.045, materials.bridgeDark, isHorizontal ? offset : 0, 2.16, isHorizontal ? 0 : offset, group);
    }
    for (let i = -1; i <= 1; i += 1) {
      block(isHorizontal ? panelWidth : 0.08, 0.045, isHorizontal ? 0.08 : panelWidth, materials.bridgeDark, 0, 1.65 + i * 0.55, 0, group);
    }

    scene.add(group);
    const collider = addCollider(closedX, closedZ, isHorizontal ? panelWidth : 0.34, isHorizontal ? 0.34 : panelWidth, !initiallyOpen, -0.5, 2.8);
    door.panels.push({ group, closedX: sx(closedX), closedZ: sz(closedZ), openX: sx(openX), openZ: sz(openZ) });
    door.colliders.push(collider);
  });
  door.solidCollider = addCollider(x, z, isHorizontal ? width : 0.56, isHorizontal ? 0.56 : width, !initiallyOpen, -0.5, 3.2);
}

function addRoomPartitions() {
  partitionWithDoor(-5.4, -9.6, 31.65, "z", 8.0, 2.4, "West Room Door", false);
  partitionWithDoor(5.4, -9.6, 31.65, "z", 8.0, 2.4, "East Room Door", false);
  partitionWithDoor(0, -13.45, 32.4, "x", 0, 2.7, "Rear Room Door", false);
  addSlidingDoor("Garden Door", 0, -26.05, "x", 2.8, true);
}

function partitionWithDoor(x, z, length, axis, gapCenter, gapSize, doorLabel = "", initiallyOpen = true) {
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
    wallSegment(sx, sz, segmentLength, 2.8, axis, 2.05);
    addCollider(sx, sz, axis === "x" ? segmentLength : 0.42, axis === "z" ? segmentLength : 0.42);
  });

  const headerX = axis === "x" ? x + gapCenter : x;
  const headerZ = axis === "z" ? z + gapCenter : z;
  block(axis === "x" ? gapSize : 0.34, 0.85, axis === "z" ? gapSize : 0.34, materials.paperDim, headerX, 3.75, headerZ);
  block(axis === "x" ? gapSize : 0.42, 0.18, axis === "z" ? gapSize : 0.42, materials.bridgeDark, headerX, 3.25, headerZ);
  block(axis === "x" ? gapSize : 0.42, 0.14, axis === "z" ? gapSize : 0.42, materials.bridgeDark, headerX, 4.15, headerZ);
  if (doorLabel) {
    addSlidingDoor(doorLabel, headerX, headerZ, axis, gapSize, initiallyOpen);
  }
}

function addInteriorDetails() {
  addCeilingBeams();

  [
    [0, 4.85, 3.4, 0.42],
    [0, -4.3, 3.35, 0.38],
    [0, -17.65, 3.25, 0.34],
    [-11.6, -3.5, 3.22, 0.34],
    [11.6, -3.5, 3.22, 0.34],
  ].forEach(([x, z, y, size]) => addLantern(x, z, y, size));

  addInteriorLight(0, 2.2, 2.9, 1.55, 18);
  addInteriorLight(0, -4.3, 2.7, 1.35, 18);
  addInteriorLight(-11.55, -4.4, 2.65, 1.1, 15);
  addInteriorLight(11.55, -4.4, 2.65, 1.1, 15);
  addInteriorLight(0, -19.5, 2.8, 1.25, 18);
  addInteriorLight(0, -11.3, 2.75, 1.0, 16);

  // --- Main Hall ---
  addTatamiArea(0, -2.05, 5, 5);
  addLowTable(0, -2.05, 2.5, 1.3);
  addFloorCushion(-1.55, -2.05, 0);
  addFloorCushion(1.55, -2.05, 0);
  addFloorCushion(0, -0.85, Math.PI / 2);
  addFloorCushion(0, -3.25, Math.PI / 2);

  addPaperLantern(-2.4, 4.65, 1.0);
  addPaperLantern(2.4, 4.75, 1.0);

  addCabinetWall(-4.8, 2.75, 0.55, 3.9, "z");
  addCabinetWall(4.8, 2.75, 0.55, 3.9, "z");
  addBonsai(4.35, 1.68, 4.85);
  addBonsai(-4.35, 1.68, 4.85);

  addFloorLantern(-4.35, 5.45, 1.2);
  addFloorLantern(4.35, 5.45, 1.2);
  addBonsai(-3.3, 0.72, -10.45);
  addIkebana(3.3, 0.72, -10.45);

  // --- Room A (West) ---
  addTatamiArea(-11.25, -4.3, 5, 5);
  addPlanter(-15.75, -4.6, 1.0, 4.0, "z");
  addLowTable(-11.25, -4.3, 2.4, 1.3);
  addBonsai(-11.25, 1.07, -4.3);
  addFloorLantern(-15.4, -11.2, 1.15);

  // --- Room B (East) ---
  addTatamiArea(11.25, -4.3, 5, 5);
  addPlanter(15.75, -4.6, 1.0, 4.0, "z");
  addLowTable(11.25, -4.3, 2.4, 1.3);
  addIkebana(11.25, 1.07, -4.3);
  addFloorLantern(15.4, -11.2, 1.15);

  // --- Corridor between Main Hall and Rear Room ---
  addFloorLantern(-4.1, -12.2, 1.05);
  addFloorLantern(4.1, -12.2, 1.05);

  // --- Rear Room ---
  addTatamiArea(0, -19.2, 7, 4);
  addLowTable(0, -19.2, 2.65, 1.4);
  addTeaSet(0, 1.07, -19.2);
  addFloorCushion(-1.8, -19.2, Math.PI / 2);
  addFloorCushion(1.8, -19.2, Math.PI / 2);
  addFloorCushion(0, -20.25, 0);
  addFloorCushion(0, -18.15, 0);

  addBambooStalk(-13.8, -23.3, 1.95, 3);
  addBambooStalk(13.8, -23.3, 1.95, 3);
  addBonsai(-9.0, 0.72, -23.45);
  addBonsai(9.0, 0.72, -23.45);

  addFloorLantern(-13.5, -15.1, 1.1);
  addFloorLantern(13.5, -15.1, 1.1);
  addPaperLantern(0, 4.65, -19.2);

  addPortfolioInstallations();
}

function addPortfolioInstallations() {
  addTableMap();
  addPortfolioDisplay({
    id: "mission",
    x: -16.92,
    z: 1.65,
    facing: "+x",
    title: "Mission",
    subtitle: "Sashit Vijay",
    accent: "#c76576",
    width: 4.4,
    height: 1.8,
  });
  addPortfolioDisplay({
    id: "education",
    x: -16.92,
    z: -5.4,
    facing: "+x",
    title: "Education",
    subtitle: "ASU CS, 4.0",
    accent: "#7f93a7",
    width: 5.6,
    height: 2.15,
  });
  addPortfolioDisplay({
    id: "projects",
    x: 16.92,
    z: -4.3,
    facing: "-x",
    title: "Projects",
    subtitle: "Thred, SoccerSense",
    accent: "#6f9b82",
    width: 4.9,
    height: 1.9,
  });
  addPortfolioDisplay({
    id: "tech",
    x: 16.92,
    z: 2.35,
    facing: "-x",
    title: "Tech Stack",
    subtitle: "Languages + tools",
    accent: "#d0a45f",
    width: 4.7,
    height: 2.0,
  });
  addPortfolioDisplay({
    id: "experience",
    x: -16.92,
    z: -19.2,
    facing: "+x",
    title: "Experience",
    subtitle: "Engineering + teaching",
    accent: "#b46b51",
    width: 4.9,
    height: 1.9,
  });
  addPortfolioDisplay({
    id: "contact",
    x: 0,
    z: -35.7,
    facing: "+z",
    title: "Contact",
    subtitle: "Links + resume",
    accent: "#d6889a",
    garden: true,
    width: 4.8,
    height: 2.05,
  });
}

function addTableMap() {
  const x = 0;
  const z = -2.05;
  const group = new THREE.Group();
  group.position.set(sx(x), 0, sz(z));

  block(2.38, 0.045, 1.26, materials.paperWarm, 0, 1.095, 0, group);
  block(2.5, 0.055, 0.08, materials.bridgeDark, 0, 1.13, -0.67, group);
  block(2.5, 0.055, 0.08, materials.bridgeDark, 0, 1.13, 0.67, group);
  block(0.08, 0.055, 1.3, materials.bridgeDark, -1.27, 1.13, 0, group);
  block(0.08, 0.055, 1.3, materials.bridgeDark, 1.27, 1.13, 0, group);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(sx(2.2), 1.12),
    new THREE.MeshBasicMaterial({
      map: makeHouseMapTexture(),
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
  panel.rotation.x = -Math.PI / 2;
  panel.position.set(0, 1.162, 0);
  panel.userData.interactableId = "map";
  group.add(panel);

  scene.add(group);
  const item = {
    id: "map",
    label: "House Map",
    center: new THREE.Vector2(sx(x), sz(z)),
    group,
    panel,
    radius: sx(2.65),
    isTableMap: true,
  };
  interactables.push(item);
  animated.push({ type: "portfolioDisplay", item });
}

function addPortfolioDisplay({
  id,
  x,
  z,
  facing,
  title,
  subtitle,
  accent,
  width = 4.6,
  height = 1.9,
  garden = false,
  map = false,
}) {
  const group = new THREE.Group();
  group.position.set(sx(x), 0, sz(z));
  group.rotation.y = facingToRotation(facing);

  const centerY = garden ? 2.1 : 2.55;
  const baseY = centerY - height / 2 - 0.22;
  const baseMaterial = garden ? materials.stone : materials.paperDim;
  block(width + 0.58, height + 0.42, 0.13, baseMaterial, 0, centerY, -0.035, group);
  block(width + 0.82, 0.16, 0.2, materials.bridgeDark, 0, centerY + height / 2 + 0.16, 0.02, group);
  block(width + 0.72, 0.14, 0.2, materials.bridgeDark, 0, centerY - height / 2 - 0.16, 0.02, group);
  block(0.16, height + 0.36, 0.2, materials.bridgeDark, -width / 2 - 0.18, centerY, 0.02, group);
  block(0.16, height + 0.36, 0.2, materials.bridgeDark, width / 2 + 0.18, centerY, 0.02, group);
  block(width + 0.2, 0.08, 0.12, materials.gold, 0, centerY - height / 2 + 0.18, 0.08, group);

  if (!garden) {
    block(width + 1.0, 0.12, 0.28, materials.woodLight, 0, baseY, 0, group);
  } else {
    block(width + 0.7, 0.22, 0.42, materials.stone, 0, baseY, 0, group);
  }

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(sx(width), height),
    new THREE.MeshBasicMaterial({
      map: map ? makeHouseMapTexture() : makePortfolioTexture(title, subtitle, accent, width, height),
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
  panel.position.set(0, centerY, 0.09);
  panel.userData.interactableId = id;
  group.add(panel);

  const charmCount = map ? 5 : 3;
  for (let i = 0; i < charmCount; i += 1) {
    const offset = (i - (charmCount - 1) / 2) * (width / (charmCount + 0.6));
    block(0.09, 0.26, 0.06, materials.lanternGlow, offset, centerY - height / 2 - 0.02, 0.14, group);
  }

  scene.add(group);
  const item = {
    id,
    label: title,
    center: new THREE.Vector2(sx(x), sz(z)),
    group,
    panel,
    radius: sx(map ? 6.0 : Math.max(3.0, Math.min(4.7, width * 0.62))),
  };
  interactables.push(item);
  animated.push({ type: "portfolioDisplay", item });
}

function facingToRotation(facing) {
  return {
    "+z": 0,
    "-z": Math.PI,
    "+x": Math.PI / 2,
    "-x": -Math.PI / 2,
  }[facing] ?? 0;
}

function makePortfolioTexture(title, subtitle, accent, width = 4.6, height = 1.9) {
  const textureCanvas = document.createElement("canvas");
  const aspect = Math.max(1.2, width / height);
  textureCanvas.width = 864;
  textureCanvas.height = Math.round(textureCanvas.width / aspect);
  const ctx = textureCanvas.getContext("2d");
  const cw = textureCanvas.width;
  const ch = textureCanvas.height;

  const paper = ctx.createLinearGradient(0, 0, cw, ch);
  paper.addColorStop(0, "#f8e8c3");
  paper.addColorStop(0.42, "#fff4d8");
  paper.addColorStop(1, "#d6ad78");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);

  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "#7d573a";
  ctx.lineWidth = 1.3;
  for (let x = 18; x < cw; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 5, ch);
    ctx.stroke();
  }
  for (let i = 0; i < 360; i += 1) {
    ctx.fillStyle = i % 3 ? "#8b6547" : accent;
    ctx.fillRect(random(0, cw), random(0, ch), random(1, 3), random(1, 3));
  }
  ctx.globalAlpha = 1;

  const margin = Math.round(ch * 0.09);
  ctx.strokeStyle = "#4b2d20";
  ctx.lineWidth = Math.max(12, ch * 0.045);
  roundRect(ctx, margin, margin, cw - margin * 2, ch - margin * 2, 18);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(5, ch * 0.018);
  roundRect(ctx, margin * 1.65, margin * 1.65, cw - margin * 3.3, ch - margin * 3.3, 14);
  ctx.stroke();

  drawPortfolioCrest(ctx, title, accent, cw * 0.18, ch * 0.5, ch * 0.24);

  ctx.fillStyle = "#2f211a";
  ctx.font = `700 ${Math.round(ch * 0.18)}px Georgia`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, cw * 0.34, ch * 0.43);

  ctx.fillStyle = "#6d4937";
  ctx.font = `700 ${Math.round(ch * 0.072)}px Inter, Arial, sans-serif`;
  ctx.fillText(subtitle, cw * 0.345, ch * 0.58);

  ctx.fillStyle = accent;
  ctx.fillRect(cw * 0.345, ch * 0.69, cw * 0.28, Math.max(5, ch * 0.018));

  ctx.globalAlpha = 0.42;
  drawSakuraStamp(ctx, cw * 0.87, ch * 0.28, ch * 0.08, accent);
  drawSakuraStamp(ctx, cw * 0.82, ch * 0.7, ch * 0.055, "#d98a9b");
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeHouseMapTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 520;
  const ctx = textureCanvas.getContext("2d");
  const cw = 1920;
  const ch = 976;
  ctx.scale(textureCanvas.width / cw, textureCanvas.height / ch);

  const paper = ctx.createLinearGradient(0, 0, cw, ch);
  paper.addColorStop(0, "#f3daa3");
  paper.addColorStop(0.42, "#fff2d1");
  paper.addColorStop(1, "#dfb37f");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);

  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "#825f3f";
  ctx.lineWidth = 2;
  for (let x = 92; x < cw; x += 78) {
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(x, ch - 96);
    ctx.stroke();
  }
  for (let y = 100; y < ch; y += 78) {
    ctx.beginPath();
    ctx.moveTo(96, y);
    ctx.lineTo(cw - 96, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#3d2419";
  ctx.lineWidth = 28;
  roundRect(ctx, 54, 54, cw - 108, ch - 108, 30);
  ctx.stroke();
  ctx.strokeStyle = "rgba(195, 120, 88, 0.72)";
  ctx.lineWidth = 8;
  roundRect(ctx, 86, 86, cw - 172, ch - 172, 24);
  ctx.stroke();

  ctx.fillStyle = "#2f211a";
  ctx.font = "700 64px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("Sashit's Portfolio House", cw / 2, 128);
  ctx.fillStyle = "#7f4f3d";
  ctx.font = "700 25px Inter, Arial, sans-serif";
  ctx.fillText("walkthrough guide", cw / 2, 166);

  const rooms = [
    { x: 235, y: 520, w: 360, h: 170, label: "Education", sub: "West Room", color: "#7896a8", icon: "book" },
    { x: 740, y: 372, w: 440, h: 170, label: "Mission", sub: "Main Hall", color: "#c76576", icon: "crest" },
    { x: 1325, y: 520, w: 360, h: 170, label: "Projects", sub: "East Room", color: "#77a88e", icon: "grid" },
    { x: 760, y: 690, w: 400, h: 132, label: "Experience", sub: "Rear Room", color: "#ba7353", icon: "path" },
    { x: 1210, y: 332, w: 260, h: 116, label: "Stack", sub: "Tool Wall", color: "#d0a45f", icon: "chip" },
    { x: 820, y: 236, w: 280, h: 88, label: "Map", sub: "Table", color: "#9670a9", icon: "pin" },
  ];

  ctx.fillStyle = "rgba(158, 94, 51, 0.22)";
  roundRect(ctx, 455, 262, 1010, 54, 8);
  ctx.fill();
  roundRect(ctx, 919, 316, 82, 430, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(171, 102, 55, 0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(960, 316);
  ctx.lineTo(960, 746);
  ctx.moveTo(455, 289);
  ctx.lineTo(1465, 289);
  ctx.stroke();

  ctx.globalAlpha = 0.16;
  [
    [210, 250, 16],
    [350, 310, 13],
    [1510, 292, 15],
    [1660, 370, 12],
    [410, 792, 13],
    [1485, 785, 14],
  ].forEach(([x, y, size]) => drawSakuraStamp(ctx, x, y, size, "#d98798"));
  ctx.globalAlpha = 1;

  rooms.forEach((room) => {
    const x = room.x;
    const y = room.y;
    ctx.fillStyle = "rgba(255, 248, 225, 0.88)";
    roundRect(ctx, x, y, room.w, room.h, 24);
    ctx.fill();
    ctx.strokeStyle = room.color;
    ctx.lineWidth = 12;
    roundRect(ctx, x + 7, y + 7, room.w - 14, room.h - 14, 20);
    ctx.stroke();
    drawMapIcon(ctx, room.icon, room.color, x + room.w * 0.18, y + room.h * 0.52, Math.min(room.w, room.h) * 0.18);
    ctx.fillStyle = "#2f211a";
    ctx.font = `800 ${room.w < 230 ? 38 : 44}px Inter, Arial, sans-serif`;
    ctx.fillText(room.label, x + room.w * 0.58, y + room.h / 2 - 10);
    ctx.fillStyle = "#76513c";
    ctx.font = `700 ${room.w < 230 ? 22 : 28}px Inter, Arial, sans-serif`;
    ctx.fillText(room.sub, x + room.w * 0.58, y + room.h / 2 + 34);
  });

  ctx.fillStyle = "#a14d55";
  ctx.font = "800 26px Inter, Arial, sans-serif";
  ctx.fillText("Press F nearby to inspect each section.", cw / 2, ch - 96);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawPortfolioCrest(ctx, title, accent, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = accent;
  ctx.fillStyle = "rgba(255, 250, 230, 0.75)";
  ctx.lineWidth = Math.max(4, size * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#4b2d20";
  ctx.lineWidth = Math.max(3, size * 0.045);
  const key = title.toLowerCase();
  if (key.includes("project")) {
    [-0.38, 0.38].forEach((ox) => {
      [-0.32, 0.32].forEach((oy) => {
        ctx.strokeRect(ox * size - size * 0.18, oy * size - size * 0.18, size * 0.36, size * 0.36);
      });
    });
  } else if (key.includes("tech")) {
    ctx.strokeRect(-size * 0.36, -size * 0.28, size * 0.72, size * 0.56);
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * size * 0.16, -size * 0.43);
      ctx.lineTo(i * size * 0.16, -size * 0.3);
      ctx.moveTo(i * size * 0.16, size * 0.3);
      ctx.lineTo(i * size * 0.16, size * 0.43);
      ctx.stroke();
    }
  } else if (key.includes("education")) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, -size * 0.05);
    ctx.lineTo(0, -size * 0.35);
    ctx.lineTo(size * 0.55, -size * 0.05);
    ctx.lineTo(0, size * 0.25);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.32, size * 0.08);
    ctx.lineTo(size * 0.32, size * 0.46);
    ctx.stroke();
  } else if (key.includes("experience")) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, size * 0.25);
    ctx.bezierCurveTo(-size * 0.18, -size * 0.45, size * 0.15, size * 0.48, size * 0.5, -size * 0.22);
    ctx.stroke();
    [-0.48, 0, 0.48].forEach((px) => {
      ctx.beginPath();
      ctx.arc(px * size, px === 0 ? 0 : -px * size * 0.1, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    });
  } else if (key.includes("contact")) {
    ctx.strokeRect(-size * 0.48, -size * 0.28, size * 0.96, size * 0.56);
    ctx.beginPath();
    ctx.moveTo(-size * 0.48, -size * 0.28);
    ctx.lineTo(0, size * 0.08);
    ctx.lineTo(size * 0.48, -size * 0.28);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.14, -size * 0.12);
    ctx.lineTo(size * 0.58, -size * 0.12);
    ctx.lineTo(size * 0.22, size * 0.12);
    ctx.lineTo(size * 0.36, size * 0.55);
    ctx.lineTo(0, size * 0.28);
    ctx.lineTo(-size * 0.36, size * 0.55);
    ctx.lineTo(-size * 0.22, size * 0.12);
    ctx.lineTo(-size * 0.58, -size * 0.12);
    ctx.lineTo(-size * 0.14, -size * 0.12);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawMapIcon(ctx, icon, color, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = "rgba(255, 249, 228, 0.9)";
  ctx.lineWidth = Math.max(4, size * 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#4b2d20";
  ctx.lineWidth = Math.max(3, size * 0.08);
  if (icon === "book") {
    ctx.strokeRect(-size * 0.5, -size * 0.35, size, size * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.lineTo(0, size * 0.35);
    ctx.stroke();
  } else if (icon === "grid") {
    for (let ix = -1; ix <= 1; ix += 1) {
      for (let iy = -1; iy <= 1; iy += 1) {
        ctx.strokeRect(ix * size * 0.28 - size * 0.09, iy * size * 0.28 - size * 0.09, size * 0.18, size * 0.18);
      }
    }
  } else if (icon === "chip") {
    ctx.strokeRect(-size * 0.42, -size * 0.32, size * 0.84, size * 0.64);
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, 0);
    ctx.lineTo(size * 0.18, 0);
    ctx.moveTo(0, -size * 0.18);
    ctx.lineTo(0, size * 0.18);
    ctx.stroke();
  } else if (icon === "path") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.2);
    ctx.bezierCurveTo(-size * 0.1, -size * 0.42, size * 0.1, size * 0.42, size * 0.45, -size * 0.2);
    ctx.stroke();
  } else if (icon === "pin") {
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.22, 0, Math.PI * 2);
    ctx.moveTo(0, size * 0.48);
    ctx.lineTo(-size * 0.24, size * 0.08);
    ctx.lineTo(size * 0.24, size * 0.08);
    ctx.closePath();
    ctx.stroke();
  } else {
    drawSakuraStamp(ctx, 0, 0, size * 0.48, color);
  }
  ctx.restore();
}

function drawSakuraStamp(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5, size * 0.22, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f9df87";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function addInteriorLight(x, z, y, intensity, distance) {
  const light = new THREE.PointLight("#ffd2a0", intensity, distance, 2.2);
  light.position.set(sx(x), y, sz(z));
  scene.add(light);
}

function addCeilingBeams() {
  block(32.4, 0.12, 31.5, materials.ceiling, 0, 4.08, -9.6);
  [-13.5, -6.75, 6.75, 13.5].forEach((x) => {
    block(0.28, 0.32, 31.5, materials.bridgeDark, x, 3.92, -9.6);
  });
  [5.3, -2.4, -9.9, -17.4, -24.5].forEach((z) => {
    block(33.0, 0.28, 0.28, materials.bridgeDark, 0, 3.74, z);
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
  const scrollMat = materials[matKey] || materials.paperWarm;

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

  group.position.set(sx(x), y, sz(z));
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
  light.position.set(sx(x), baseY + height * 0.55, sz(z));
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
  light.position.set(sx(x + facingX * 0.3), 2.05, sz(z + facingZ * 0.3));
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
  light.position.set(sx(x), y + 0.22, sz(z));
  scene.add(light);
  shade.userData.baseIntensity = 1;
  animated.push({ type: "lantern", mesh: shade, light });
}

function addRoofs() {
  addLayeredRoof(0, 4.35, -9.6, 39.0, 37.5, 0.42, 3);
  addLayeredRoof(0, 5.9, -9.6, 25.5, 23.25, 0.46, 2);

  block(1.0, 0.62, 28.5, materials.roofDark, -12.75, 6.13, -9.6);
  block(1.0, 0.62, 28.5, materials.roofDark, 12.75, 6.13, -9.6);
  block(25.1, 0.56, 0.9, materials.roofDark, 0, 6.21, -21.1);
  block(25.1, 0.56, 0.9, materials.roofDark, 0, 6.21, 1.85);
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
  block(37.5, 0.24, 36.8, materials.shore, 0, -0.18, -9.6);
  block(36.0, 0.36, 35.3, materials.grass, 0, -0.02, -9.6);

  addLantern(-4.6, 7.1, 2.1, 0.52);
  addLantern(4.6, 7.1, 2.1, 0.52);
  addLantern(-6.9, 5.4, 2.0, 0.42);
  addLantern(6.9, 5.4, 2.0, 0.42);

  addGardenBed(-5.8, 7.4, 3.8, 0.62);
  addGardenBed(5.8, 7.4, 3.8, 0.62);
  addGardenBed(-8.4, 2.2, 0.62, 5.0);
  addGardenBed(8.4, 2.2, 0.62, 5.0);
  addBackGarden();
}

function addBackGarden() {
  block(43.5, 0.18, 25.5, materials.shore, 0, -0.2, -38.05);
  block(41.6, 0.3, 23.6, materials.grass, 0, -0.06, -38.05);
  block(40.5, 0.12, 0.28, materials.hedge, 0, 0.22, -49.75);
  block(0.28, 0.12, 21.75, materials.hedge, -20.7, 0.22, -38.05);
  block(0.28, 0.12, 21.75, materials.hedge, 20.7, 0.22, -38.05);
  addBoundaryFence(0, -49.75, 41.0, "x");
  addBoundaryFence(-20.7, -38.05, 21.75, "z");
  addBoundaryFence(20.7, -38.05, 21.75, "z");
  addCollider(0, -49.75, 41.0, 0.55);
  addCollider(-20.7, -38.05, 0.55, 21.75);
  addCollider(20.7, -38.05, 0.55, 21.75);
  addSakuraTree(0, -40.4, 2.55);

  const petals = [];
  for (let i = 0; i < 28; i += 1) {
    petals.push({
      w: random(0.08, 0.18),
      h: 0.012,
      d: random(0.05, 0.13),
      x: random(-16, 16),
      y: 0.11,
      z: random(-47, -30),
      ry: random(0, Math.PI),
    });
  }
  addInstancedBoxes(petals, materials.sakura);
}

function addGardenBed(x, z, w, d) {
  block(w, 0.34, d, materials.hedge, x, 0.9, z);
  const count = Math.max(3, Math.floor((w + d) * 0.75));
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
    [-38, -27, 1.0],
    [-43, -10, 1.12],
    [-44, 8, 0.98],
    [-42, 22, 1.08],
  ];
  positions.forEach(([x, z, scale]) => addSakuraTree(x, z, scale));
}

function addLakeTreeRing() {
  const ring = [];
  const count = 46;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const jitter = Math.sin(i * 2.17) * 1.55;
    const x = Math.cos(angle) * (43 + jitter);
    const z = Math.sin(angle) * (40 + Math.cos(i * 1.31) * 1.7);
    if (Math.abs(x) < 15 && z > 28) continue;
    if (z < -28 && Math.abs(x) < 38) continue;
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
    pad.position.set(sx(x), -0.18, sz(z));
    scene.add(pad);

    if (index % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.22, 8), materials.lotus);
      flower.rotation.x = -Math.PI / 2;
      flower.position.set(sx(x + scale * 0.22), -0.165, sz(z - scale * 0.12));
      scene.add(flower);
    }
  });
}

function addInteriorFloor(x, z, w, d) {
  const tileW = 2.25;
  const tileD = 2.1;
  const cols = Math.max(1, Math.floor(w / tileW));
  const rows = Math.max(1, Math.floor(d / tileD));
  for (let ix = 0; ix < cols; ix += 1) {
    for (let iz = 0; iz < rows; iz += 1) {
      const mat = (ix + iz) % 2 === 0 ? materials.floorAlt : materials.floor;
      block(tileW - 0.05, 0.035, tileD - 0.05, mat, x + (ix - (cols - 1) / 2) * tileW, 0.72, z + (iz - (rows - 1) / 2) * tileD);
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
  sign.position.set(sx(x), 1.65, sz(z));
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

  group.position.set(sx(x), 0.0, sz(z));
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
    light.position.set(sx(x), y + size * 0.24, sz(z));
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
  for (let i = 0; i < 38; i += 1) {
    const petal = new THREE.Mesh(geometry, petalMaterial);
    petal.position.set(sx(random(-28, 28)), random(1.2, 5.6), sz(random(-28, 31)));
    petal.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    petal.userData.speed = random(0.18, 0.5);
    group.add(petal);
  }
  scene.add(group);
  animated.push({ type: "petals", group });
}

function block(w, h, d, material, x, y, z, parent = scene) {
  const scaledW = sx(w);
  const scaledD = sz(d);
  const key = `${scaledW.toFixed(3)}:${h.toFixed(3)}:${scaledD.toFixed(3)}`;
  let geometry = boxGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(scaledW, h, scaledD);
    boxGeometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(sx(x), y, sz(z));
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addInstancedBoxes(instances, material, parent = scene) {
  if (!instances.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, instances.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  instances.forEach((item, index) => {
    position.set(sx(item.x), item.y, sz(item.z));
    euler.set(0, item.ry ?? 0, 0);
    quaternion.setFromEuler(euler);
    scale.set(sx(item.w), item.h, sz(item.d));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBoundaryFence(x, z, length, axis) {
  const isX = axis === "x";
  const posts = [];
  const postCount = Math.max(2, Math.floor(length / 2.8) + 1);
  for (let i = 0; i < postCount; i += 1) {
    const offset = -length / 2 + (i / (postCount - 1)) * length;
    posts.push({
      w: 0.18,
      h: 0.92,
      d: 0.18,
      x: x + (isX ? offset : 0),
      y: 0.58,
      z: z + (isX ? 0 : offset),
    });
  }
  addInstancedBoxes(posts, materials.bridgeDark);
  block(isX ? length : 0.16, 0.14, isX ? 0.16 : length, materials.bridgeDark, x, 1.03, z);
  block(isX ? length : 0.12, 0.1, isX ? 0.12 : length, materials.woodLight, x, 0.58, z);
}

function cylinderBetween(start, end, radius, material) {
  const scaledStart = scaledVector(start.x, start.y, start.z);
  const scaledEnd = scaledVector(end.x, end.y, end.z);
  const direction = new THREE.Vector3().subVectors(scaledEnd, scaledStart);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(sx(radius), sx(radius) * 1.08, length, 8), material);
  mesh.position.copy(scaledStart).add(scaledEnd).multiplyScalar(0.5);
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

function createGrassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color("#77945f") },
      tipColor: { value: new THREE.Color("#a7be7a") },
    },
    vertexShader: `
      uniform float time;
      varying float vTop;
      varying float vWave;

      void main() {
        vec3 pos = position;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        float top = smoothstep(-0.08, 0.22, pos.y);
        float wave = sin(world.x * 0.38 + world.z * 0.24 + time * 1.55);
        wave += sin(world.x * -0.18 + world.z * 0.42 + time * 1.1) * 0.45;
        pos.x += wave * 0.035 * top;
        pos.z += cos(world.x * 0.26 + world.z * 0.33 + time * 1.35) * 0.018 * top;
        vTop = top;
        vWave = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 tipColor;
      varying float vTop;
      varying float vWave;

      void main() {
        vec3 color = mix(baseColor, tipColor, vTop * 0.62 + vWave * 0.04);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
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
  const scaledX = sx(x);
  const scaledZ = sz(z);
  const scaledW = sx(w);
  const scaledD = sz(d);
  return {
    minX: scaledX - scaledW / 2,
    maxX: scaledX + scaledW / 2,
    minZ: scaledZ - scaledD / 2,
    maxZ: scaledZ + scaledD / 2,
  };
}

function isPlayable(x, z) {
  const r = sx(0.32);
  return playable.some((box) => x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ);
}

function getFloorHeight() {
  return 0;
}

function hitsCollider(x, z) {
  const r = sx(0.34);
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
  if (state.mapFocus) {
    state.velocity.set(0, 0, 0);
    state.moveBlend = damp(state.moveBlend, 0, 8, delta);
    return;
  }

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
  state.bobPhase += delta * planarSpeed * 5.4;
  const bobTarget = THREE.MathUtils.clamp(planarSpeed / 3.15, 0, 1) * state.moveBlend;
  state.bobAmount = damp(state.bobAmount, bobTarget, 8, delta);
  const stepBob = Math.sin(state.bobPhase) * 0.014 * state.bobAmount;
  const stepLift = Math.abs(Math.cos(state.bobPhase)) * 0.006 * state.bobAmount;
  camera.position.y = state.floorY + EYE_HEIGHT + state.jumpOffset + stepBob + stepLift;
}

function updateCamera(delta) {
  if (state.mapFocus) {
    updateMapFocusCamera(delta);
    return;
  }

  state.yaw = damp(state.yaw, state.targetYaw, lookEase, delta);
  state.pitch = damp(state.pitch, state.targetPitch, lookEase, delta);
  const roll = state.sway * -0.026 + state.lookSway;
  camera.quaternion.setFromEuler(new THREE.Euler(state.pitch, state.yaw, roll, "YXZ"));
  state.lookSway = damp(state.lookSway, 0, 9, delta);
}

function updateMapFocusCamera(delta) {
  const focus = state.mapFocus;
  const targetPosition = focus.closing ? focus.originPosition : focus.targetPosition;
  const targetFov = focus.closing ? focus.originFov : focus.targetFov;
  const positionEase = 1 - Math.exp(-6.5 * delta);

  camera.position.lerp(targetPosition, positionEase);
  camera.fov = damp(camera.fov, targetFov, 7, delta);
  camera.updateProjectionMatrix();

  if (focus.closing) {
    camera.quaternion.slerp(focus.originQuaternion, positionEase);
    if (camera.position.distanceTo(focus.originPosition) < 0.035 && camera.quaternion.angleTo(focus.originQuaternion) < 0.025) {
      camera.position.copy(focus.originPosition);
      camera.quaternion.copy(focus.originQuaternion);
      camera.fov = focus.originFov;
      camera.updateProjectionMatrix();
      state.yaw = focus.originYaw;
      state.pitch = focus.originPitch;
      state.targetYaw = focus.originYaw;
      state.targetPitch = focus.originPitch;
      state.mapFocus = null;
      clearInteractionHint();
    }
    return;
  }

  camera.lookAt(focus.lookAt);
}

function updateLighting(delta) {
  state.dayTime = (state.dayTime + delta * 0.00065) % 1;
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
    timeLabel.textContent = t < 0.25 ? "Morning Light" : "Bright Day";
  } else if (sunHeight > -3) {
    const blend = Math.max(sunHeight + 3, 0) / 9;
    top.copy(sunsetTop).lerp(dayTop, blend);
    horizon.copy(sunsetHorizon).lerp(dayHorizon, blend);
    bottom.copy(sunsetBottom).lerp(dayBottom, blend);
    timeLabel.textContent = t < 0.25 ? "Sakura Dawn" : "Sunset";
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

  waterUniforms.horizonColor.value
    .copy(new THREE.Color("#8ed5f4"))
    .lerp(horizon, 0.16)
    .lerp(top, 0.08);
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
  const shallow = new THREE.Color("#54bde9");
  const shallowNight = new THREE.Color("#236ba8");
  const deep = new THREE.Color("#1b6eaf");
  const deepNight = new THREE.Color("#103d72");
  waterUniforms.shallowColor.value
    .copy(shallow)
    .lerp(shallowNight, 1 - sunIntensityFactor * 0.75);
  waterUniforms.deepColor.value
    .copy(deep)
    .lerp(deepNight, 1 - sunIntensityFactor * 0.65);

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
  doors.forEach((door) => {
    door.progress = damp(door.progress, door.target, 9, delta);
    door.panels.forEach((panel) => {
      panel.group.position.x = THREE.MathUtils.lerp(panel.closedX, panel.openX, door.progress);
      panel.group.position.z = THREE.MathUtils.lerp(panel.closedZ, panel.openZ, door.progress);
    });
    door.colliders.forEach((collider) => {
      collider.active = door.target < 0.5 && door.progress < 0.18;
    });
    if (door.solidCollider) {
      door.solidCollider.active = door.target < 0.5 || door.progress < 0.78;
    }
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
      if (item.mesh.position.x > sx(30)) item.mesh.position.x = sx(-30);
    }
    if (item.type === "lantern") {
      const flicker = 0.88 + Math.sin(now * 0.006 + item.mesh.position.x) * 0.12;
      if (item.light) item.light.intensity = (item.light.userData.targetIntensity ?? 1.1) * flicker;
    }
    if (item.type === "portfolioDisplay") {
      const active = state.activeInteractable?.id === item.item.id;
      const targetScale = active ? 1.025 : 1;
      const glow = active ? 0.08 + Math.sin(now * 0.006) * 0.025 : 0;
      item.item.group.scale.x = damp(item.item.group.scale.x, targetScale, 9, delta);
      item.item.group.scale.y = damp(item.item.group.scale.y, targetScale, 9, delta);
      item.item.panel.material.color.setScalar(1 + glow);
    }
    if (item.type === "petals") {
      item.group.children.forEach((petal) => {
        petal.position.x += delta * petal.userData.speed * 0.35;
        petal.position.y -= delta * petal.userData.speed * 0.28;
        petal.position.z += Math.sin(now * 0.0008 + petal.position.x) * delta * 0.18;
        petal.rotation.x += delta * 0.6;
        petal.rotation.z += delta * 0.42;
        if (petal.position.y < 0.25) {
          petal.position.set(sx(random(-28, 28)), random(3.0, 6.0), sz(random(-28, 31)));
        }
      });
    }
  });
  materials.grass.uniforms.time.value = now * 0.001;
}

function updateSpotLabel() {
  if (state.mapFocus) {
    spotLabel.textContent = "House Map";
    showInteractionHint("F or Esc to return");
    return;
  }

  const nearbyDoor = getNearbyDoor();
  if (nearbyDoor) {
    state.activeInteractable = null;
    spotLabel.textContent = nearbyDoor.label;
    showInteractionHint(`F to ${nearbyDoor.open ? "close" : "open"}`);
    return;
  }

  const nearbyPortfolio = getNearbyInteractable() || getAimedInteractable();
  if (nearbyPortfolio) {
    state.activeInteractable = nearbyPortfolio;
    spotLabel.textContent = nearbyPortfolio.label;
    showInteractionHint(nearbyPortfolio.id === "map" ? "F to inspect map" : "Click or F to view");
    return;
  }

  state.activeInteractable = null;
  clearInteractionHint();
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

function showInteractionHint(text) {
  if (!interactionHint) return;
  interactionHint.textContent = text;
  interactionHint.classList.add("is-visible");
}

function clearInteractionHint() {
  if (!interactionHint) return;
  interactionHint.textContent = "";
  interactionHint.classList.remove("is-visible", "is-map-focus");
}

function getNearbyInteractable() {
  let closest = null;
  let closestDistance = Infinity;
  interactables.forEach((item) => {
    const distance = Math.hypot(camera.position.x - item.center.x, camera.position.z - item.center.y);
    if (distance < item.radius && distance < closestDistance && state.floorY < 0.8) {
      closest = item;
      closestDistance = distance;
    }
  });
  return closest;
}

function getAimedInteractable(event = null) {
  if (!interactables.length) return null;
  if (event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  } else {
    pointer.set(0, 0);
  }
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactables.map((item) => item.panel), false);
  const hit = hits.find((entry) => entry.distance < 9.5);
  if (!hit) return null;
  return interactables.find((item) => item.id === hit.object.userData.interactableId) || null;
}

function getNearbyDoor() {
  let closest = null;
  let closestDistance = Infinity;
  doors.forEach((door) => {
    const distance = Math.hypot(camera.position.x - door.center.x, camera.position.z - door.center.y);
    if (distance < 2.8 && distance < closestDistance && state.floorY < 0.8) {
      closest = door;
      closestDistance = distance;
    }
  });
  return closest;
}

function toggleFrontDoor() {
  const door = getNearbyDoor();
  if (!door) return false;
  door.open = !door.open;
  door.target = door.open ? 1 : 0;
  return true;
}

function openNearbyPortfolio() {
  const item = getNearbyInteractable() || getAimedInteractable();
  if (!item) return false;
  openInteractable(item);
  return true;
}

function openClickedPortfolio(event) {
  const item = getAimedInteractable(event) || getNearbyInteractable();
  if (!item) return false;
  openInteractable(item);
  return true;
}

function openInteractable(item) {
  if (item.id === "map") {
    enterMapFocus();
    return;
  }
  openPortfolioPanel(item.id);
}

function enterMapFocus() {
  if (state.mapFocus) return;
  intro.classList.add("is-hidden");
  closePortfolioPanel();
  state.keys.clear();
  state.dragLook = false;
  document.exitPointerLock?.();
  state.mapFocus = {
    closing: false,
    originPosition: camera.position.clone(),
    originQuaternion: camera.quaternion.clone(),
    originFov: camera.fov,
    originYaw: state.yaw,
    originPitch: state.pitch,
    targetPosition: scaledVector(0, 3.85, -1.62),
    lookAt: scaledVector(0, 1.13, -2.05),
    targetFov: 42,
  };
  interactionHint?.classList.add("is-map-focus");
  showInteractionHint("F or Esc to return");
}

function exitMapFocus() {
  if (!state.mapFocus) return;
  state.mapFocus.closing = true;
  state.keys.clear();
}

function openPortfolioPanel(id) {
  const section = portfolioSections[id];
  if (!section || !portfolioPanel) return;
  intro.classList.add("is-hidden");
  state.keys.clear();
  document.exitPointerLock?.();
  portfolioTitle.textContent = section.title;
  portfolioEyebrow.textContent = section.eyebrow;
  renderPortfolioSection(section);
  portfolioPanel.classList.add("is-open");
  portfolioPanel.setAttribute("aria-hidden", "false");
}

function closePortfolioPanel() {
  if (!portfolioPanel) return;
  portfolioPanel.classList.remove("is-open");
  portfolioPanel.setAttribute("aria-hidden", "true");
}

function isPortfolioOpen() {
  return portfolioPanel?.classList.contains("is-open");
}

function renderPortfolioSection(section) {
  portfolioBody.replaceChildren();

  if (section.lead) {
    const lead = document.createElement("p");
    lead.className = "panel-lead";
    lead.textContent = section.lead;
    portfolioBody.append(lead);
  }

  if (section.tags) {
    const tags = document.createElement("div");
    tags.className = "panel-tags";
    section.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "panel-tag";
      chip.textContent = tag;
      tags.append(chip);
    });
    portfolioBody.append(tags);
  }

  section.groups?.forEach((group) => {
    const wrap = document.createElement("section");
    wrap.className = "panel-group";
    const heading = document.createElement("h3");
    heading.textContent = group.heading;
    wrap.append(heading);

    if (group.items) {
      const list = document.createElement("ul");
      group.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
      });
      wrap.append(list);
    }

    if (group.cards) {
      const grid = document.createElement("div");
      grid.className = "panel-card-grid";
      group.cards.forEach((card) => grid.append(createPortfolioCard(card)));
      wrap.append(grid);
    }

    portfolioBody.append(wrap);
  });

  if (section.actions) {
    const actions = document.createElement("div");
    actions.className = "panel-actions";
    section.actions.forEach((action) => {
      const link = document.createElement("a");
      link.href = action.href;
      link.textContent = action.label;
      link.target = action.href.startsWith("mailto:") ? "_self" : "_blank";
      link.rel = "noreferrer";
      actions.append(link);
    });
    portfolioBody.append(actions);
  }
}

function createPortfolioCard(card) {
  const node = document.createElement("article");
  node.className = "panel-card";
  const title = document.createElement(card.href ? "a" : "strong");
  title.textContent = card.title;
  if (card.href) {
    title.href = card.href;
    title.target = "_blank";
    title.rel = "noreferrer";
  }
  const meta = document.createElement("span");
  meta.textContent = card.meta;
  const body = document.createElement("p");
  body.textContent = card.body;
  node.append(title, meta, body);
  return node;
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
  state.mapFocus = null;
  clearInteractionHint();
  camera.fov = 68;
  camera.updateProjectionMatrix();
  intro.classList.add("is-hidden");
  state.velocity.set(0, 0, 0);
  camera.position.copy(spot.position);
  state.floorY = 0;
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

canvas.addEventListener("click", (event) => {
  if (state.mapFocus) return;
  if (isPortfolioOpen()) return;
  intro.classList.add("is-hidden");
  if (openClickedPortfolio(event)) return;
  requestLookControl();
});

canvas.addEventListener("mousedown", () => {
  if (state.mapFocus) return;
  if (isPortfolioOpen()) return;
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
  if (state.mapFocus) {
    if ((event.code === "Escape" || event.code === "KeyF") && !event.repeat) {
      exitMapFocus();
    }
    return;
  }

  if (isPortfolioOpen()) {
    if (event.code === "Escape" || (event.code === "KeyF" && !event.repeat)) {
      closePortfolioPanel();
    }
    return;
  }
  state.keys.add(event.code);
  if (event.code === "KeyF" && !event.repeat) {
    if (!toggleFrontDoor()) {
      openNearbyPortfolio();
    }
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

portfolioClose?.addEventListener("click", () => {
  closePortfolioPanel();
});

portfolioPanel?.addEventListener("click", (event) => {
  event.stopPropagation();
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
});
