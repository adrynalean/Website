import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

// Build diagnostics — lets us spot a startup crash from any console
window.addEventListener("error", (e) => { window.__worldErr = `${e.message} @ ${e.filename}:${e.lineno}`; });

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
const mobHud         = document.querySelector("#mobHud");
const mobSpot        = document.querySelector("#mobSpot");
const mobTimeLabel   = document.querySelector("#mobTimeLabel");
const mobTimeBtn     = document.querySelector("#mobTimeBtn");
const mobNavBtn      = document.querySelector("#mobNavBtn");
const mobNavOverlay  = document.querySelector("#mobNavOverlay");
const mobNavClose    = document.querySelector("#mobNavClose");
const joyZone        = document.querySelector("#joyZone");
const joyDot         = document.querySelector("#joyDot");
const touchInteract  = document.querySelector("#touchInteract");
// Aim dojo overlays
const dojoMenu       = document.querySelector("#dojoMenu");
const dojoHud        = document.querySelector("#dojoHud");
const dojoResults    = document.querySelector("#dojoResults");
const dojoCountdown  = document.querySelector("#dojoCountdown");
const dojoCursor     = document.querySelector("#dojoCursor");

// Detect touch/coarse-pointer devices once at startup
const isMobile = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.35));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = !isMobile;
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
  ceiling: new THREE.MeshBasicMaterial({ color: "#dec19b" }),
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
  gravel: blockMaterial("#d7d0c2", "#ece6d9"),
  rock: blockMaterial("#8f8c84", "#a9a69d"),
  rockDark: blockMaterial("#6f6c66", "#878379"),
  moss: blockMaterial("#5f7a4e", "#82a06a"),
};

[materials.paperDim, materials.paperWarm, materials.tatamiWeave].forEach((material) => {
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
});

const colliders = [];
const playable = [];
const animated = [];
const treeShared = {};
let lanternGlowTexture = null;
// Room kanji must be initialized before buildWorld() runs (TDZ otherwise)
const roomKanji = {
  mission: "志",
  education: "学",
  projects: "作",
  "tech stack": "道",
  experience: "歴",
  contact: "縁",
};
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

const starField = (() => {
  const starCount = 240;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    // Upper hemisphere, just inside the sky dome
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92 + 0.08); // bias away from horizon
    const r = 86;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#fff6e8",
    size: 0.65,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
})();

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
    lead: "Software engineering, AI research, and LLM evaluation across industry and academia.",
    groups: [
      {
        heading: "Recent Roles",
        cards: [
          {
            title: "LLM Test-Authoring Evaluator",
            meta: "Deel Inc. — 2026 to Present",
            body: "Builds reproducible LLM evaluation benchmarks for test-authoring agents using rubric-calibrated scoring, Dockerized Harbor sandboxes, RewardKit rubrics, oracle diffs, and regression-guarded scenarios. Targets 80%+ for frontier models, 25–50% for baselines.",
          },
          {
            title: "Fullstack Developer Co-op",
            meta: "Bytewerx LLC — Aug. 2024 to May 2025",
            body: "Built a secure API management platform with Angular, ASP.NET Core, TypeScript, and Redis — scoped key generation, RBAC, rate limiting, and a real-time analytics dashboard for the Tnect Validation API.",
          },
          {
            title: "Research Assistant",
            meta: "LLEAS Lab, ASU — Oct. 2024 to Jul. 2025",
            body: "Developed a Unitree Go2 robotic dog assistant with diffusion-based navigation and LLM-powered command processing; integrated obstacle avoidance achieving sub-200ms latency for visually impaired users.",
          },
          {
            title: "Software Engineer Intern",
            meta: "PI Academy — May 2024 to Jul. 2024",
            body: "Built image-analysis tooling to classify 400+ food waste categories; improved model accuracy by 9% via ensemble learning.",
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
  // Touch / joystick input (-1…1 per axis)
  joyX: 0,
  joyZ: 0,
};

// ── Aim dojo state ───────────────────────────────────────────────────────────
// phase: "off" (walking) | "menu" | "countdown" | "live" | "results"
const AIM_ROUND_SECONDS = 30;
// Firing line faces -z; targets spawn on the GALLERY plane. Declared early so
// addAimDojo() (run during buildWorld) doesn't hit a temporal dead zone.
// Enclosed dojo room, set far behind the garden so nothing else is in view.
// Fully walled, so the house/boards literally cannot be seen from inside.
const DOJO = {
  cx: 0,             // room centre X
  cz: -68.0,         // room centre Z
  halfX: 11.0,       // interior half-width
  halfZ: 12.0,       // interior half-depth
  ceilingY: 7.0,
  fireZ: -59.0,      // firing line (player stands), faces -z
  galleryZ: -76.5,   // target backdrop
  spanX: 8.2,        // half-width of the target field
  yLow: 1.5,
  yHigh: 4.4,
};
// Where the player returns to when leaving the dojo
const DOJO_EXIT = { x: 0, z: -46.0, yaw: 0 };
const range = {
  phase: "off",
  gate: null,            // { center: Vec2 } proximity trigger, set in addDojoGate
  mode: "gridshot",      // gridshot | flick | tracking
  difficulty: "medium",  // easy | medium | hard
  targets: [],           // active target meshes
  group: null,           // THREE.Group holding targets
  room: null,            // THREE.Group, the enclosed room
  // Round metrics
  shots: 0,
  hits: 0,
  score: 0,
  reactionTimes: [],     // ms, for flick/gridshot
  onTargetMs: 0,         // tracking accumulator
  roundMs: 0,
  countdownMs: 0,
  tracking: false,       // mouse held during tracking mode
  // Fixed-frame virtual cursor (screen pixels). Camera never rotates in a
  // round — the player moves this crosshair to aim, like a desktop aim trainer.
  cursor: { x: 0, y: 0 },
  sens: 1.0,             // cursor speed multiplier (1.0 ≈ native pointer)
};

// Load saved sensitivity (migrates silently from the old cm/360 schema)
try {
  const saved = JSON.parse(localStorage.getItem("sakura-aim-sens") || "null");
  if (saved && saved.sens > 0) range.sens = saved.sens;
} catch { /* ignore */ }

// Virtual cursor → normalized device coords for raycasting
function cursorNDC() {
  pointer.x = (range.cursor.x / window.innerWidth) * 2 - 1;
  pointer.y = -(range.cursor.y / window.innerHeight) * 2 + 1;
  return pointer;
}

function centerCursor() {
  range.cursor.x = window.innerWidth / 2;
  range.cursor.y = window.innerHeight / 2;
  paintCursor();
}

function paintCursor() {
  if (!dojoCursor) return;
  dojoCursor.style.transform = `translate(${range.cursor.x}px, ${range.cursor.y}px) translate(-50%, -50%)`;
}

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
sun.castShadow = !isMobile;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
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
  addLakeDetails();
  addKoi();
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
      addLantern(x, z, 1.5, 0.36, true);
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
  frontDoor.center.set(sx(0), sz(z));

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
  door.center.set(sx(x), sz(z));
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

  // Bay dividers: short wall stubs off the outer walls so each display
  // board gets its own alcove instead of sharing one long corridor wall
  addBayDivider(-14.85, -1.7, 4.5);
  addBayDivider(14.85, -0.95, 4.5);
}

function addBayDivider(x, z, length) {
  wallSegment(x, z, length, 2.8, "x", 2.05);
  addCollider(x, z, length, 0.42);
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
  // Bonsai sit centred on the cabinet tops, clear of the entrance lanterns
  addBonsai(4.8, 1.68, 1.6);
  addBonsai(-4.8, 1.68, 1.6);

  addFloorLantern(-4.35, 5.45, 1.2, 0.72, true);
  addFloorLantern(4.35, 5.45, 1.2, 0.72, true);
  addBonsai(-3.3, 0.72, -10.45);
  addIkebana(3.3, 0.72, -10.45);

  // --- Room A (West) ---
  addTatamiArea(-11.25, -4.3, 5, 5);
  // Planter fills the bare wall stretch between the board and rear partition
  addPlanter(-15.75, -10.7, 1.0, 3.6, "z");
  addLowTable(-11.25, -4.3, 2.4, 1.3);
  addBonsai(-11.25, 1.07, -4.3);
  addFloorLantern(-15.4, -12.4, 1.15);

  // --- Room B (East) ---
  addTatamiArea(11.25, -4.3, 5, 5);
  addPlanter(15.75, -10.7, 1.0, 3.6, "z");
  addLowTable(11.25, -4.3, 2.4, 1.3);
  addIkebana(11.25, 1.07, -4.3);
  addFloorLantern(15.4, -12.4, 1.15);

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
    new THREE.PlaneGeometry(sx(2.1), sz(1.1)),
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

  // Shrine notice-board roof — layered cap so boards read as built things,
  // not posters stuck to the wall
  const roofBase = centerY + height / 2 + 0.16;
  block(width + 1.3, 0.13, 0.62, materials.roofDark, 0, roofBase + 0.2, 0.05, group);
  block(width + 0.86, 0.12, 0.5, materials.roof, 0, roofBase + 0.32, 0.05, group);
  block(width + 0.42, 0.1, 0.38, materials.roofDark, 0, roofBase + 0.43, 0.05, group);
  // Support brackets under the eaves
  block(0.14, 0.22, 0.3, materials.bridgeDark, -width / 2 - 0.3, roofBase + 0.04, 0.06, group);
  block(0.14, 0.22, 0.3, materials.bridgeDark, width / 2 + 0.3, roofBase + 0.04, 0.06, group);

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

function paintWashi(ctx, cw, ch) {
  // Warm washi paper with fibers and speckle
  const paper = ctx.createLinearGradient(0, 0, cw * 0.4, ch);
  paper.addColorStop(0, "#f8eed9");
  paper.addColorStop(0.55, "#f3e4c6");
  paper.addColorStop(1, "#e9d3a9");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cw, ch);

  // Horizontal paper fibers
  for (let i = 0; i < 60; i += 1) {
    ctx.globalAlpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.45 ? "#c9ab7c" : "#fffaf0";
    const y = Math.random() * ch;
    ctx.fillRect(Math.random() * cw * 0.5, y, random(cw * 0.1, cw * 0.55), 1 + Math.random());
  }

  // Speckle
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#8a6a45";
  for (let i = 0; i < 260; i += 1) {
    ctx.fillRect(Math.random() * cw, Math.random() * ch, 1.3, 1.3);
  }
  ctx.globalAlpha = 1;
}

function drawHanko(ctx, x, y, size, kanji) {
  // Vermillion seal — same mark the homepage carries
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.05);
  const grad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  grad.addColorStop(0, "#c43a2e");
  grad.addColorStop(1, "#a12a22");
  ctx.fillStyle = grad;
  roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.12);
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 18, 10, 0.55)";
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  roundRect(ctx, -size * 0.41, -size * 0.41, size * 0.82, size * 0.82, size * 0.08);
  ctx.stroke();
  ctx.fillStyle = "#fff3ea";
  ctx.font = `600 ${Math.round(size * 0.6)}px "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kanji, 0, size * 0.03);
  ctx.restore();
}

function makePortfolioTexture(title, subtitle, accent, width = 4.6, height = 1.9) {
  const textureCanvas = document.createElement("canvas");
  const aspect = Math.max(1.0, (width * WORLD_SCALE) / height);
  textureCanvas.width = 960;
  textureCanvas.height = Math.round(textureCanvas.width / aspect);
  const ctx = textureCanvas.getContext("2d");
  const cw = textureCanvas.width;
  const ch = textureCanvas.height;

  paintWashi(ctx, cw, ch);

  // Mounted-scroll border: wood outer line + accent hairline inset
  const m = Math.round(ch * 0.055);
  ctx.strokeStyle = "#6e4a2f";
  ctx.lineWidth = Math.max(4, ch * 0.018);
  roundRect(ctx, m, m, cw - m * 2, ch - m * 2, 10);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, ch * 0.007);
  roundRect(ctx, m * 1.8, m * 1.8, cw - m * 3.6, ch - m * 3.6, 7);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Large kanji watermark on the right — ink wash
  const kanji = roomKanji[title.toLowerCase()] ?? "桜";
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.16;
  ctx.font = `600 ${Math.round(ch * 0.62)}px "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kanji, cw * 0.82, ch * 0.5);
  ctx.globalAlpha = 1;

  // ── Content (left-aligned column) ─────────────────────────────────────────
  const pad = Math.round(cw * 0.07);
  const eyebrowSize = Math.round(ch * 0.062);
  const titleSize = Math.round(ch * 0.2);

  // Mono eyebrow — the developer thread, in ink
  ctx.fillStyle = "rgba(106, 78, 52, 0.75)";
  ctx.font = `500 ${eyebrowSize}px "Courier New", monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`// ${subtitle}`, pad, ch * 0.18);

  // Title — deep ink serif
  ctx.fillStyle = "#3a2b20";
  ctx.font = `600 ${titleSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText(title, pad, ch * 0.18 + eyebrowSize * 1.7);

  // Accent rule under title
  const ruleY = ch * 0.18 + eyebrowSize * 1.7 + titleSize * 1.22;
  ctx.fillStyle = accent;
  ctx.fillRect(pad, ruleY, Math.round(cw * 0.18), Math.max(3, Math.round(ch * 0.014)));

  // Crest icon in ink, sitting under the rule
  const iconSize = Math.round(ch * 0.085);
  const iconCY = ruleY + Math.round(ch * 0.1) + iconSize;
  if (iconCY + iconSize < ch - m * 2) {
    drawPortfolioCrest(ctx, title, accent, pad + iconSize, iconCY, iconSize);
  }

  // Hanko seal — bottom right, inside the border
  drawHanko(ctx, cw - pad * 1.1, ch - m * 2 - ch * 0.085, ch * 0.15, kanji);

  // Scattered petals, very faint
  ctx.globalAlpha = 0.12;
  drawSakuraStamp(ctx, cw * 0.62, ch * 0.24, ch * 0.045, "#d98a9b");
  drawSakuraStamp(ctx, cw * 0.56, ch * 0.78, ch * 0.035, "#c5748c");
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

  paintWashi(ctx, cw, ch);

  // Mounted border: wood + inner sakura hairline
  ctx.strokeStyle = "#6e4a2f";
  ctx.lineWidth = 18;
  roundRect(ctx, 30, 30, cw - 60, ch - 60, 24);
  ctx.stroke();
  ctx.strokeStyle = "#c5748c";
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 5;
  roundRect(ctx, 58, 58, cw - 116, ch - 116, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Header — ink serif + mono eyebrow ─────────────────────────────────────
  ctx.fillStyle = "#3a2b20";
  ctx.font = "600 62px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Sashit's Portfolio House", cw / 2, 76);

  ctx.fillStyle = "rgba(106, 78, 52, 0.72)";
  ctx.font = `500 24px "Courier New", monospace`;
  ctx.fillText("// walkthrough guide", cw / 2, 150);

  // ── Corridor paths — soft ink wash ────────────────────────────────────────
  ctx.fillStyle = "rgba(110, 74, 47, 0.10)";
  roundRect(ctx, 455, 260, 1010, 52, 8);
  ctx.fill();
  roundRect(ctx, 920, 312, 78, 434, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(110, 74, 47, 0.30)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(960, 312);
  ctx.lineTo(960, 746);
  ctx.moveTo(455, 286);
  ctx.lineTo(1465, 286);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Room cards — paper plaques with ink labels ────────────────────────────
  const rooms = [
    { x: 235, y: 520, w: 360, h: 170, label: "Education", sub: "West Room",  color: "#7f93a7", icon: "book",  kanji: "学" },
    { x: 740, y: 372, w: 440, h: 170, label: "Mission",   sub: "Main Hall",  color: "#c76576", icon: "crest", kanji: "志" },
    { x: 1325, y: 520, w: 360, h: 170, label: "Projects",  sub: "East Room",  color: "#6f9b82", icon: "grid",  kanji: "作" },
    { x: 760, y: 690, w: 400, h: 132, label: "Experience", sub: "Rear Room",  color: "#b46b51", icon: "path",  kanji: "歴" },
    { x: 1210, y: 332, w: 260, h: 116, label: "Stack",     sub: "Tool Wall",  color: "#d0a45f", icon: "chip",  kanji: "道" },
    { x: 820, y: 236, w: 280, h:  88, label: "Map",        sub: "Table",      color: "#9670a9", icon: "pin",   kanji: "図" },
  ];

  rooms.forEach(({ x, y, w, h, label, sub, color, icon, kanji }) => {
    const small = w < 300;

    // Plaque: lighter paper with soft shadow edge
    ctx.fillStyle = "rgba(255, 250, 236, 0.92)";
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = "#6e4a2f";
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 3.5;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Accent tab on the left edge
    ctx.fillStyle = color;
    roundRect(ctx, x, y + h * 0.16, 7, h * 0.68, 3);
    ctx.fill();

    // Faint room kanji on the right of the plaque
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.20;
    ctx.font = `600 ${Math.round(h * 0.72)}px "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kanji, x + w - h * 0.42, y + h * 0.52);
    ctx.globalAlpha = 1;

    // Icon — sized to leave room for the text column
    const iconR = Math.min(w, h) * (small ? 0.2 : 0.16);
    drawMapIcon(ctx, icon, color, x + h * 0.38, y + h * 0.5, iconR);

    // Label — ink serif, constrained to the card (maxWidth guards overflow)
    const labelX = x + h * 0.38 + iconR + (small ? 14 : 18);
    const labelMax = x + w - labelX - h * 0.42;
    ctx.fillStyle = "#3a2b20";
    ctx.font = `700 ${small ? 30 : 36}px Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, y + h / 2 - (small ? 8 : 12), labelMax);

    // Sub-label — mono, muted ink
    ctx.fillStyle = "rgba(106, 78, 52, 0.85)";
    ctx.font = `500 ${small ? 18 : 21}px "Courier New", monospace`;
    ctx.fillText(sub, labelX, y + h / 2 + (small ? 18 : 25), labelMax);
  });

  // Scattered petals
  ctx.globalAlpha = 0.16;
  [[210, 250, 16], [1510, 292, 15], [410, 792, 13], [1485, 785, 14], [1700, 620, 12]]
    .forEach(([x, y, s]) => drawSakuraStamp(ctx, x, y, s, "#d98a9b"));
  ctx.globalAlpha = 1;

  // Hanko — bottom right corner
  drawHanko(ctx, cw - 150, ch - 140, 86, "桜");

  // Footer hint — ink mono
  ctx.fillStyle = "rgba(140, 74, 60, 0.85)";
  ctx.font = `700 26px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("// Press F nearby to inspect each section.", cw / 2, ch - 84);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawPortfolioCrest(ctx, title, accent, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = accent;
  ctx.fillStyle = "rgba(255, 250, 235, 0.85)";
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#4a352a";
  ctx.lineWidth = Math.max(2.5, size * 0.045);
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
  ctx.fillStyle = "rgba(255, 250, 235, 0.9)";
  ctx.lineWidth = Math.max(4, size * 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#4a352a";
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
  // Handles on both faces — cabinets are viewed from either side
  for (const side of [-1, 1]) {
    for (let i = 0; i < drawerCount; i += 1) {
      const offset = (i - (drawerCount - 1) / 2) * (d / drawerCount);
      const px = axis === "z" ? x + side * 0.29 : x + offset;
      const pz = axis === "z" ? z + offset : z + side * 0.29;
      block(axis === "z" ? 0.08 : 0.46, 0.08, axis === "z" ? 0.46 : 0.08, materials.gold, px, 1.32, pz);
    }
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

function addFloorLantern(x, z, height = 1.25, baseY = 0.72, exterior = false) {
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
  const glow = addLanternGlowSprite(x, baseY + height * 0.55, z, height * 1.4);
  animated.push({ type: "lantern", mesh: shade, light, exterior, glow });
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

  addLantern(-4.6, 7.1, 2.1, 0.52, true);
  addLantern(4.6, 7.1, 2.1, 0.52, true);
  addLantern(-6.9, 5.4, 2.0, 0.42, true);
  addLantern(6.9, 5.4, 2.0, 0.42, true);

  addGardenBed(-5.8, 7.4, 3.8, 0.62);
  addGardenBed(5.8, 7.4, 3.8, 0.62);
  // Outer beds continue the row along the front wall — outside the house
  addGardenBed(-11.4, 7.4, 4.4, 0.62);
  addGardenBed(11.4, 7.4, 4.4, 0.62);
  addBackGarden();
}

// A deliberate karesansui (dry stroll garden): a raked-gravel "sea" with a
// rock triad as the centrepiece, stone lanterns and a water basin framing the
// Contact board, stepping-stone paths threading house → board → dojo gate.
function addBackGarden() {
  // Ground: earth border + moss-green lawn
  block(43.5, 0.18, 25.5, materials.shore, 0, -0.2, -38.05);
  block(41.6, 0.3, 23.6, materials.grass, 0, -0.06, -38.05);

  // Perimeter hedge + fence
  block(40.5, 0.55, 0.7, materials.hedge, 0, 0.42, -49.6);
  block(0.7, 0.55, 21.75, materials.hedge, -20.5, 0.42, -38.05);
  block(0.7, 0.55, 21.75, materials.hedge, 20.5, 0.42, -38.05);
  addBoundaryFence(0, -49.95, 41.0, "x");
  addBoundaryFence(-20.85, -38.05, 21.75, "z");
  addBoundaryFence(20.85, -38.05, 21.75, "z");
  addCollider(0, -49.75, 41.0, 0.55);
  addCollider(-20.7, -38.05, 0.55, 21.75);
  addCollider(20.7, -38.05, 0.55, 21.75);

  // ── Raked-gravel sea, centred behind the Contact board ───────────────────
  addRakedGravel(0, -42.5, 22, 11);

  // Rock triad (sanzon): a tall guardian, a flanking stone, a reclining stone
  addRock(-1.4, -43.0, 1.5, materials.rock, 0.4);
  addRock(0.9, -42.0, 1.0, materials.rockDark, 1.1);
  addRock(2.4, -43.4, 0.7, materials.rock, 2.2);
  addMossRing(-1.4, -43.0, 2.2);

  // A second, smaller stone grouping off to the side for asymmetry
  addRock(-9.5, -45.5, 0.95, materials.rockDark, 0.7);
  addRock(-8.2, -46.0, 0.6, materials.rock, 1.8);
  addMossRing(-9.0, -45.6, 1.7);

  // ── Stone lanterns framing the Contact board (board sits at z -35.7) ──────
  addStoneLantern(-5.2, -35.0, 1.0);
  addStoneLantern(5.2, -35.0, 1.0);

  // Tall yukimi lantern as a back-corner focal point
  addStoneLantern(15.5, -46.0, 1.35);

  // ── Tsukubai (water basin) tucked in the near-left corner ────────────────
  addTsukubai(-15.0, -30.5);

  // ── Framing trees + foliage, placed not scattered ────────────────────────
  addSakuraTree(-17.0, -47.0, 2.0, 0.11, true);
  addSakuraTree(17.5, -33.0, 1.7, 0.11, true);
  addMapleClump(16.0, -29.5);
  addBambooStalk(-18.5, -44.0, 2.4, 4);
  addBambooStalk(-17.6, -42.6, 2.0, 3);

  // Low clipped shrubs along the back, anchoring the gravel sea
  [-14, -6, 6, 13].forEach((x) => addMossMound(x, -48.6, 0.8 + Math.abs(x) * 0.02));

  // ── Stepping-stone paths (tobi-ishi) ─────────────────────────────────────
  // House door → Contact board approach
  addSteppingStones([
    [0, -27.6], [0.4, -29.0], [-0.3, -30.4], [0.3, -31.8], [0, -33.2],
  ]);
  // Board → around the gravel (left) → dojo gate
  addSteppingStones([
    [-2.4, -34.6], [-4.6, -36.0], [-6.2, -38.0], [-6.0, -40.5],
    [-4.8, -43.0], [-3.0, -45.4], [-1.4, -47.4], [0, -48.6],
  ]);
  // Short spur to the tsukubai
  addSteppingStones([[-8.0, -33.5], [-11.0, -32.0], [-13.4, -30.9]]);

  // Entrance gate at the rear hedge — walk here, press F to enter the dojo
  addDojoGate();

  addAimDojo();
}

// ── Garden feature kit ───────────────────────────────────────────────────────

// Ishidoro stone lantern (lit by the time-of-day lantern system at night)
function addStoneLantern(x, z, s = 1) {
  const baseY = 0.0;
  block(0.7 * s, 0.22 * s, 0.7 * s, materials.rock, x, baseY + 0.11 * s, z);        // foot
  block(0.26 * s, 1.0 * s, 0.26 * s, materials.rock, x, baseY + 0.6 * s, z);         // post
  block(0.66 * s, 0.16 * s, 0.66 * s, materials.rock, x, baseY + 1.18 * s, z);       // platform
  const fireY = baseY + 1.5 * s;
  block(0.5 * s, 0.5 * s, 0.5 * s, materials.rockDark, x, fireY, z);                 // fire box
  // Glowing window
  const glow = block(0.34 * s, 0.34 * s, 0.34 * s, materials.lanternGlow, x, fireY, z);
  glow.userData.baseIntensity = 1;
  let light = null;
  if (!isMobile) {
    light = new THREE.PointLight("#ffca7a", 1.0, 6 * s, 2);
    light.position.set(sx(x), fireY, sz(z));
    scene.add(light);
  }
  animated.push({ type: "lantern", mesh: glow, light, exterior: true, glow: addLanternGlowSprite(x, fireY, z, 2.0 * s) });
  // Roof + finial
  block(0.78 * s, 0.18 * s, 0.78 * s, materials.rockDark, x, fireY + 0.34 * s, z);
  block(0.5 * s, 0.16 * s, 0.5 * s, materials.rockDark, x, fireY + 0.5 * s, z);
  block(0.16 * s, 0.22 * s, 0.16 * s, materials.rock, x, fireY + 0.66 * s, z);
  addCollider(x, z, 0.8 * s, 0.8 * s);
}

// A placed boulder — deformed icosahedron, deterministic per position
function addRock(x, z, s, mat, rot = 0) {
  const geo = new THREE.IcosahedronGeometry(sx(s), 1);
  const pos = geo.attributes.position;
  const seed = Math.abs(Math.sin(x * 12.9 + z * 78.2) * 43758.5);
  for (let i = 0; i < pos.count; i += 1) {
    const w = Math.sin(i * 9.1 + seed) * 0.5 + 0.5;
    const f = 0.78 + w * 0.32;
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * 0.82, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const rock = new THREE.Mesh(geo, mat);
  rock.position.set(sx(x), s * 0.46, sz(z));
  rock.rotation.y = rot;
  rock.castShadow = !isMobile;
  rock.receiveShadow = true;
  scene.add(rock);
  addCollider(x, z, s * 1.3, s * 1.3);
}

// Pale gravel slab with thin raked furrow lines. Sits proud of the grass
// (top 0.12 vs grass top 0.09) so the two surfaces never z-fight.
function addRakedGravel(x, z, w, d) {
  block(w, 0.18, d, materials.gravel, x, 0.03, z); // spans -0.06 … 0.12
  // Raked lines running along Z, resting just on top of the gravel
  for (let lx = -w / 2 + 0.8; lx < w / 2; lx += 1.1) {
    block(0.06, 0.03, d - 0.6, materials.rockDark, x + lx, 0.145, z);
  }
}

// Flat stepping stones at the given [x,z] points
function addSteppingStones(points) {
  const stones = points.map(([px, pz], i) => ({
    w: 0.7 + (i % 2) * 0.12,
    h: 0.12,
    d: 0.6 + ((i + 1) % 2) * 0.12,
    x: px,
    y: 0.12,
    z: pz,
    ry: (i * 1.3) % Math.PI,
  }));
  addInstancedBoxes(stones, materials.stone);
}

// Tsukubai: low stone basin with a bamboo spout and surrounding stones
function addTsukubai(x, z) {
  addRock(x - 0.9, z, 0.7, materials.rockDark, 0.5);
  addRock(x + 0.9, z + 0.4, 0.6, materials.rock, 1.4);
  // Basin with a calm flat water tint (no shader cost)
  block(0.7, 0.4, 0.7, materials.rock, x, 0.32, z);
  if (!addTsukubai.waterMat) {
    addTsukubai.waterMat = new THREE.MeshBasicMaterial({ color: "#3f7390" });
  }
  block(0.46, 0.04, 0.46, addTsukubai.waterMat, x, 0.5, z);
  // Bamboo spout
  block(0.1, 0.7, 0.1, materials.leafBright, x - 0.45, 0.7, z - 0.35);
  block(0.1, 0.1, 0.5, materials.leafBright, x - 0.45, 1.0, z - 0.15);
  addMossMound(x + 1.3, z - 0.6, 0.7);
}

// Low moss dome
function addMossMound(x, z, s = 0.8) {
  const geo = new THREE.SphereGeometry(sx(s), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(geo, materials.moss);
  dome.position.set(sx(x), 0.08, sz(z));
  dome.scale.y = 0.6;
  dome.receiveShadow = true;
  scene.add(dome);
}

// Ring of small mossy stones around a feature
function addMossRing(x, z, r) {
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    addMossMound(x + Math.cos(a) * r, z + Math.sin(a) * r, 0.4 + (i % 2) * 0.12);
  }
}

// A clump of red maple foliage on a short trunk (autumn accent)
function addMapleClump(x, z) {
  block(0.34, 2.2, 0.34, materials.trunk, x, 1.1, z);
  [[0, 2.5, 0, 1.4], [-0.7, 2.3, 0.3, 1.0], [0.7, 2.4, -0.2, 1.05], [0.1, 2.8, 0.5, 0.85]]
    .forEach(([ox, oy, oz, sz2], i) => block(sz2, sz2 * 0.8, sz2, i % 2 ? materials.vermillion : materials.roof, x + ox, oy, z + oz));
}

// A small vermillion torii set into the rear hedge marks the dojo entrance.
function addDojoGate() {
  const gx = 0;
  const gz = -49.0;
  [-1.6, 1.6].forEach((x) => block(0.32, 3.0, 0.32, materials.vermillion, gx + x, 1.5, gz));
  block(4.2, 0.34, 0.4, materials.vermillion, gx, 3.05, gz);
  block(4.7, 0.26, 0.5, materials.vermillion, gx, 3.32, gz);
  block(0.9, 0.5, 0.18, materials.paperWarm, gx, 2.5, gz - 0.02); // little signboard
  // Glowing marker stone you press F at
  const mGlow = block(0.4, 0.1, 0.4, materials.lanternGlow, gx, 0.55, gz + 0.9);
  mGlow.userData.baseIntensity = 1;
  const mLight = new THREE.PointLight("#ffd9a4", 0.9, 4.0, 2);
  mLight.position.set(sx(gx), 0.8, sz(gz + 0.9));
  scene.add(mLight);
  animated.push({ type: "lantern", mesh: mGlow, light: mLight, exterior: false, glow: addLanternGlowSprite(gx, 0.6, gz + 0.9, 1.3) });
  range.gate = { center: new THREE.Vector2(sx(gx), sz(gz + 0.9)) };
}

// The enclosed aim-trainer room. Fully walled + ceilinged so that, once
// inside, nothing of the house or garden is visible — the world "disappears".
function addAimDojo() {
  range.room = new THREE.Group();
  scene.add(range.room);
  const add = (w, h, d, mat, x, y, z) => {
    const mesh = block(w, h, d, mat, x, y, z, range.room);
    return mesh;
  };

  const { cx, cz, halfX, halfZ, ceilingY, galleryZ } = DOJO;

  // Floor (warm wood) + ceiling (dark, so glow targets pop)
  add(halfX * 2 + 1, 0.2, halfZ * 2 + 1, materials.floorAlt, cx, 0.0, cz);
  add(halfX * 2 + 1, 0.2, halfZ * 2 + 1, materials.charcoal, cx, ceilingY, cz);

  // Four enclosing walls (charcoal interior reads like a night dojo)
  add(halfX * 2 + 1, ceilingY, 0.4, materials.charcoal, cx, ceilingY / 2, cz + halfZ); // behind player
  add(halfX * 2 + 1, ceilingY, 0.4, materials.charcoal, cx, ceilingY / 2, cz - halfZ); // gallery side
  add(0.4, ceilingY, halfZ * 2 + 1, materials.charcoal, cx - halfX, ceilingY / 2, cz);
  add(0.4, ceilingY, halfZ * 2 + 1, materials.charcoal, cx + halfX, ceilingY / 2, cz);

  // Wainscot trim so the walls aren't flat
  [cz + halfZ, cz - halfZ].forEach((z) => add(halfX * 2 + 1, 0.5, 0.5, materials.bridgeDark, cx, 1.2, z));
  [cx - halfX, cx + halfX].forEach((x) => add(0.5, 0.5, halfZ * 2 + 1, materials.bridgeDark, x, 1.2, cz));

  // Gallery face — lighter panel framing the target field
  add(halfX * 2 - 1, ceilingY - 1.2, 0.16, materials.blackLacquer, cx, ceilingY / 2, galleryZ - 0.3);
  for (let x = -9; x <= 9; x += 4.5) {
    add(0.3, ceilingY - 1.4, 0.3, materials.vermillion, cx + x, ceilingY / 2, galleryZ - 0.18);
  }

  // Tatami firing strip the player stands on
  add(6.0, 0.06, 2.2, materials.tatamiWeave, cx, 0.13, DOJO.fireZ + 0.4);

  // Soft, even room lighting (kept simple — two point lights)
  [[-6, DOJO.fireZ - 2], [6, DOJO.fireZ - 2]].forEach(([x, z]) => {
    const l = new THREE.PointLight("#ffe6c4", 1.1, 26, 2);
    l.position.set(sx(cx + x), 5.4, sz(z));
    range.room.add(l);
  });
  const fill = new THREE.PointLight("#cfe0ff", 0.5, 30, 2);
  fill.position.set(sx(cx), 6.0, sz(galleryZ + 4));
  range.room.add(fill);

  range.group = new THREE.Group();
  range.room.add(range.group);

  // Hidden until the player enters — keeps it out of sight and out of the
  // render cost while walking the house.
  range.room.visible = false;
}

// ── Dojo lifecycle ───────────────────────────────────────────────────────────
function enterDojo() {
  if (range.phase !== "off") return;
  state.mapFocus = null;
  closePortfolioPanel();
  state.keys.clear();
  state.velocity.set(0, 0, 0);

  // Reveal the enclosed room; hide the rest of the world + all HUD chrome so
  // the trainer feels like its own focused space.
  range.room.visible = true;
  setWorldHidden(true);
  document.body.classList.add("dojo-mode");

  // Stand the player on the firing line, facing the gallery (-z)
  camera.position.set(sx(DOJO.cx), EYE_HEIGHT, sz(DOJO.fireZ));
  state.floorY = 0;
  state.jumpOffset = 0;
  state.yaw = state.targetYaw = 0;
  state.pitch = state.targetPitch = 0;
  updateCamera(0.016);

  document.exitPointerLock?.();
  range.phase = "menu";
  syncDojoMenu();
  dojoMenu?.classList.add("is-open");
  dojoMenu?.setAttribute("aria-hidden", "false");
  clearInteractionHint();
}

// Leave the dojo from ANY phase and restore the world.
function exitDojo() {
  clearTargets();
  range.phase = "off";
  range.tracking = false;
  range.room.visible = false;
  setWorldHidden(false);
  document.body.classList.remove("dojo-mode");
  dojoMenu?.classList.remove("is-open");
  dojoMenu?.setAttribute("aria-hidden", "true");
  dojoHud?.classList.remove("is-active");
  dojoResults?.classList.remove("is-open");
  dojoResults?.setAttribute("aria-hidden", "true");
  document.exitPointerLock?.();

  // Drop the player back at the dojo gate in the garden
  camera.position.set(sx(DOJO_EXIT.x), EYE_HEIGHT, sz(DOJO_EXIT.z));
  state.floorY = 0;
  state.jumpOffset = 0;
  state.yaw = state.targetYaw = DOJO_EXIT.yaw;
  state.pitch = state.targetPitch = 0;
  updateCamera(0.016);
}

// Hide/show the whole world except the dojo room. Lazily collects the
// top-level scene children once, excluding the room, sky, sun/moon, stars.
function setWorldHidden(hidden) {
  if (!setWorldHidden.list) {
    const keep = new Set([range.room, skyDome, sunSprite, moonSprite, starField]);
    setWorldHidden.list = scene.children.filter((child) => !keep.has(child));
  }
  setWorldHidden.list.forEach((child) => { child.visible = !hidden; });
}

function startRound() {
  range.shots = 0;
  range.hits = 0;
  range.score = 0;
  range.reactionTimes.length = 0;
  range.onTargetMs = 0;
  range.roundMs = AIM_ROUND_SECONDS * 1000;
  range.countdownMs = 3000;
  range.phase = "countdown";
  dojoMenu?.classList.remove("is-open");
  dojoMenu?.setAttribute("aria-hidden", "true");
  dojoResults?.classList.remove("is-open");
  dojoResults?.setAttribute("aria-hidden", "true");
  dojoHud?.classList.add("is-active");
  centerCursor();
  spawnTargets();
  // Pointer lock captures raw movement + hides the OS cursor; our own
  // crosshair represents the aim point. Camera stays put.
  canvas.requestPointerLock?.();
}

function endRound() {
  range.phase = "results";
  range.tracking = false;
  clearTargets();
  dojoHud?.classList.remove("is-active");
  document.exitPointerLock?.();
  renderDojoResults();
  dojoResults?.classList.add("is-open");
  dojoResults?.setAttribute("aria-hidden", "false");
}

// Fired on click while live; raycasts the reticle (screen centre) at targets
function shootDojo() {
  if (range.phase !== "live") return;
  if (range.mode === "tracking") return; // tracking scores by dwell, not clicks
  range.shots += 1;
  raycaster.setFromCamera(cursorNDC(), camera);
  const live = range.targets.filter((t) => !t.userData.isBurst);
  const hits = raycaster.intersectObjects(live, false);
  if (hits.length) {
    const mesh = hits[0].object;
    const reaction = performance.now() - mesh.userData.spawnAt;
    range.reactionTimes.push(reaction);
    range.hits += 1;
    // Score rewards speed: faster pop = more points, floor of 10
    range.score += Math.max(10, Math.round(120 - reaction / 12));
    popBurst(mesh);
    // Remove the popped target and respawn to keep the field full
    mesh.geometry.dispose();
    mesh.material.dispose();
    range.group.remove(mesh);
    range.targets.splice(range.targets.indexOf(mesh), 1);
    const fresh = makeAimTarget(dojoCfg().radius);
    placeTarget(fresh, randomTargetPos());
    range.targets.push(fresh);
  }
  updateDojoHud();
}

function updateRange(delta, now) {
  if (range.phase === "off") return;

  if (range.phase === "countdown") {
    range.countdownMs -= delta * 1000;
    const n = Math.ceil(range.countdownMs / 1000);
    if (dojoCountdown) dojoCountdown.textContent = n > 0 ? String(n) : "始";
    if (range.countdownMs <= 0) {
      range.phase = "live";
      if (dojoCountdown) dojoCountdown.textContent = "";
      range.targets.forEach((t) => (t.userData.spawnAt = now));
    }
  }

  if (range.phase === "live") {
    range.roundMs -= delta * 1000;
    if (range.roundMs <= 0) { endRound(); return; }

    const reticleHit = range.mode === "tracking" ? reticleOnTarget() : false;
    if (range.mode === "tracking" && range.tracking && reticleHit) {
      range.onTargetMs += delta * 1000;
      range.score += Math.round(delta * 100);
    }
    updateDojoHud(reticleHit);
  }

  // Animate targets (both live and burst petals)
  for (let i = range.targets.length - 1; i >= 0; i -= 1) {
    const mesh = range.targets[i];
    if (mesh.userData.isBurst) {
      mesh.userData.life -= delta * 1.6;
      if (mesh.userData.life <= 0) {
        mesh.geometry.dispose();
        mesh.material.dispose();
        range.group.remove(mesh);
        range.targets.splice(i, 1);
        continue;
      }
      mesh.userData.vel.y -= delta * 3.2;
      mesh.position.addScaledVector(mesh.userData.vel, delta * sx(1));
      mesh.material.opacity = mesh.userData.life;
      mesh.rotation.z += delta * 4;
      continue;
    }
    // Pop-in scale
    mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1, 1 - Math.exp(-18 * delta)));
    // Gentle bob + glow pulse
    const glow = 1 + Math.sin(now * 0.006 + mesh.position.x) * 0.12;
    mesh.material.color.setScalar(glow);
    // Tracking drift
    const tr = mesh.userData.track;
    if (tr && range.phase === "live") {
      tr.phase += delta * tr.speed;
      const lx = tr.cx + Math.sin(tr.phase * tr.fx) * tr.ax;
      const ly = tr.cy + Math.sin(tr.phase * tr.fy + 1.3) * tr.ay;
      mesh.position.set(sx(lx), ly, sz(mesh.userData.logical.z));
    }
  }
}

// True when the cursor crosshair is over a target (for tracking mode)
function reticleOnTarget() {
  raycaster.setFromCamera(cursorNDC(), camera);
  const live = range.targets.filter((t) => !t.userData.isBurst);
  return raycaster.intersectObjects(live, false).length > 0;
}

// ── Dojo DOM ─────────────────────────────────────────────────────────────────
function syncDojoMenu() {
  if (!dojoMenu) return;
  dojoMenu.querySelectorAll("[data-mode]").forEach((b) =>
    b.classList.toggle("is-selected", b.dataset.mode === range.mode));
  dojoMenu.querySelectorAll("[data-diff]").forEach((b) =>
    b.classList.toggle("is-selected", b.dataset.diff === range.difficulty));
  const desc = dojoMenu.querySelector("#dojoModeDesc");
  if (desc) desc.textContent = DOJO_CONFIG[range.mode].label;
  const sens = dojoMenu.querySelector("#dojoSens");
  if (sens) sens.value = String(range.sens);
  const sensVal = dojoMenu.querySelector("#dojoSensVal");
  if (sensVal) sensVal.textContent = `${range.sens.toFixed(2)}×`;
}

function updateDojoHud(reticleHit = false) {
  if (!dojoHud) return;
  const set = (id, val) => { const el = dojoHud.querySelector(id); if (el) el.textContent = val; };
  set("#dojoTime", (Math.max(0, range.roundMs) / 1000).toFixed(1));
  set("#dojoScore", String(range.score));
  if (range.mode === "tracking") {
    const pct = range.roundMs < AIM_ROUND_SECONDS * 1000
      ? Math.round((range.onTargetMs / (AIM_ROUND_SECONDS * 1000 - range.roundMs)) * 100) || 0
      : 0;
    set("#dojoStat", `${pct}% on target`);
    dojoHud.classList.toggle("is-on-target", reticleHit);
  } else {
    const acc = range.shots ? Math.round((range.hits / range.shots) * 100) : 100;
    set("#dojoStat", `${acc}% · ${range.hits} hits`);
  }
}

function renderDojoResults() {
  if (!dojoResults) return;
  const acc = range.shots ? Math.round((range.hits / range.shots) * 100) : (range.mode === "tracking" ? null : 0);
  const avgReaction = range.reactionTimes.length
    ? Math.round(range.reactionTimes.reduce((a, b) => a + b, 0) / range.reactionTimes.length)
    : null;
  const kps = (range.hits / AIM_ROUND_SECONDS).toFixed(2);
  const trackPct = Math.round((range.onTargetMs / (AIM_ROUND_SECONDS * 1000)) * 100);

  const rows = [];
  rows.push(["Score", String(range.score)]);
  if (range.mode === "tracking") {
    rows.push(["Time on target", `${trackPct}%`]);
  } else {
    rows.push(["Accuracy", `${acc}%`]);
    rows.push(["Hits", `${range.hits} / ${range.shots}`]);
    rows.push(["Avg reaction", avgReaction !== null ? `${avgReaction} ms` : "—"]);
    rows.push(["Targets / sec", kps]);
  }

  const body = dojoResults.querySelector("#dojoResultsBody");
  if (body) {
    body.replaceChildren();
    rows.forEach(([k, v]) => {
      const row = document.createElement("div");
      row.className = "dojo-result-row";
      const key = document.createElement("span");
      key.textContent = k;
      const val = document.createElement("strong");
      val.textContent = v;
      row.append(key, val);
      body.append(row);
    });
  }
  const title = dojoResults.querySelector("#dojoResultsTitle");
  if (title) {
    const m = range.mode[0].toUpperCase() + range.mode.slice(1);
    const d = range.difficulty[0].toUpperCase() + range.difficulty.slice(1);
    title.textContent = `${m} · ${d}`;
  }
}

// Menu interactions (event delegation)
dojoMenu?.addEventListener("click", (event) => {
  const el = event.target.closest("[data-mode], [data-diff], [data-act]");
  if (!el) return;
  if (el.dataset.mode) { range.mode = el.dataset.mode; syncDojoMenu(); }
  else if (el.dataset.diff) { range.difficulty = el.dataset.diff; syncDojoMenu(); }
  else if (el.dataset.act === "start") startRound();
  else if (el.dataset.act === "exit") exitDojo();
});

function commitSensitivity() {
  const s = parseFloat(dojoMenu?.querySelector("#dojoSens")?.value);
  if (s > 0) range.sens = s;
  const sensVal = dojoMenu?.querySelector("#dojoSensVal");
  if (sensVal) sensVal.textContent = `${range.sens.toFixed(2)}×`;
  try {
    localStorage.setItem("sakura-aim-sens", JSON.stringify({ sens: range.sens }));
  } catch { /* ignore */ }
}

dojoMenu?.querySelector("#dojoSens")?.addEventListener("input", commitSensitivity);

// Always-available leave (tappable on mobile; on desktop Esc also works)
document.querySelector("#dojoLeave")?.addEventListener("click", (event) => {
  event.stopPropagation();
  exitDojo();
});

dojoResults?.addEventListener("click", (event) => {
  const el = event.target.closest("[data-act]");
  if (!el) return;
  if (el.dataset.act === "retry") startRound();
  else if (el.dataset.act === "menu") {
    range.phase = "menu";
    dojoResults.classList.remove("is-open");
    dojoResults.setAttribute("aria-hidden", "true");
    syncDojoMenu();
    dojoMenu?.classList.add("is-open");
    dojoMenu?.setAttribute("aria-hidden", "false");
  } else if (el.dataset.act === "exit") exitDojo();
});

// Per-mode × per-difficulty tuning. radius is logical world units.
const DOJO_CONFIG = {
  gridshot: {
    label: "Gridshot — pop static targets fast",
    easy:   { radius: 0.62, count: 4 },
    medium: { radius: 0.46, count: 5 },
    hard:   { radius: 0.32, count: 6 },
  },
  flick: {
    label: "Flick — one target, snap to it",
    easy:   { radius: 0.55, count: 1 },
    medium: { radius: 0.40, count: 1 },
    hard:   { radius: 0.28, count: 1 },
  },
  tracking: {
    label: "Tracking — hold on the moving target",
    easy:   { radius: 0.6, count: 1, speed: 1.6 },
    medium: { radius: 0.46, count: 1, speed: 2.6 },
    hard:   { radius: 0.36, count: 1, speed: 3.8 },
  },
};

function dojoCfg() {
  return DOJO_CONFIG[range.mode][range.difficulty];
}

// A target: glowing temple-bell orb that fits the sakura palette
function makeAimTarget(radius) {
  const geo = new THREE.SphereGeometry(sx(radius), 16, 12);
  const mat = new THREE.MeshBasicMaterial({ color: "#ffd9a4" });
  const mesh = new THREE.Mesh(geo, mat);
  // Faint inner ring so the centre is readable
  const ring = new THREE.Mesh(
    new THREE.SphereGeometry(sx(radius) * 0.5, 12, 8),
    new THREE.MeshBasicMaterial({ color: "#f3a7bc" }),
  );
  mesh.add(ring);
  mesh.userData.radius = radius;
  range.group.add(mesh);
  return mesh;
}

function randomTargetPos() {
  return {
    x: random(-DOJO.spanX, DOJO.spanX),
    y: random(DOJO.yLow, DOJO.yHigh),
    z: DOJO.galleryZ + random(-0.4, 0.8),
  };
}

function placeTarget(mesh, pos) {
  mesh.position.set(sx(pos.x), pos.y, sz(pos.z));
  mesh.userData.logical = pos;
  mesh.userData.spawnAt = performance.now();
  mesh.scale.setScalar(0.01); // pop-in animation handled in updateRange
}

function spawnTargets() {
  clearTargets();
  const cfg = dojoCfg();
  for (let i = 0; i < cfg.count; i += 1) {
    const mesh = makeAimTarget(cfg.radius);
    placeTarget(mesh, randomTargetPos());
    if (range.mode === "tracking") {
      // Give the tracker a smooth lissajous drift
      mesh.userData.track = {
        cx: 0, cy: (DOJO.yLow + DOJO.yHigh) / 2,
        ax: DOJO.spanX * 0.85, ay: (DOJO.yHigh - DOJO.yLow) * 0.42,
        fx: random(0.3, 0.5), fy: random(0.5, 0.8),
        phase: random(0, Math.PI * 2), speed: cfg.speed,
      };
    }
    range.targets.push(mesh);
  }
}

function clearTargets() {
  range.targets.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
    range.group.remove(mesh);
  });
  range.targets.length = 0;
}

// Burst of petals when a target is popped
function popBurst(mesh) {
  const at = mesh.position.clone();
  for (let i = 0; i < 7; i += 1) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.07),
      new THREE.MeshBasicMaterial({ color: "#ffd2d8", transparent: true, side: THREE.DoubleSide }),
    );
    p.position.copy(at);
    p.userData.vel = new THREE.Vector3(random(-1.4, 1.4), random(0.5, 2.4), random(-1.4, 1.4));
    p.userData.life = 1;
    range.group.add(p);
    range.targets.push(p); // reuse update loop; flagged as petal
    p.userData.isBurst = true;
  }
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
    pad.position.set(sx(x), -0.13, sz(z));
    scene.add(pad);

    if (index % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.22, 8), materials.lotus);
      flower.rotation.x = -Math.PI / 2;
      flower.position.set(sx(x + scale * 0.22), -0.10, sz(z - scale * 0.12));
      scene.add(flower);
    }
  });
}

function addKoi() {
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#e86f33", roughness: 0.6, metalness: 0 });
  const patchMat = new THREE.MeshStandardMaterial({ color: "#f6ecdd", roughness: 0.65, metalness: 0 });
  const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
  const tailGeo = new THREE.ConeGeometry(1, 1, 6);

  const routes = [
    { cx: -9, cz: 16, radius: 5.0, speed: 0.55, phase: 0.0 },
    { cx: 10, cz: 13, radius: 4.2, speed: -0.42, phase: 1.7 },
    { cx: -4, cz: 27, radius: 3.4, speed: 0.62, phase: 3.1 },
    { cx: 14, cz: 22, radius: 4.6, speed: -0.5, phase: 4.4 },
    { cx: -16, cz: 8, radius: 3.8, speed: 0.46, phase: 5.5 },
  ];

  routes.forEach((route, index) => {
    const fish = new THREE.Group();

    const body = new THREE.Mesh(bodyGeo, index % 2 === 0 ? bodyMat : patchMat);
    body.scale.set(0.34, 0.12, 0.13);
    fish.add(body);

    const patch = new THREE.Mesh(bodyGeo, index % 2 === 0 ? patchMat : bodyMat);
    patch.scale.set(0.13, 0.1, 0.11);
    patch.position.set(0.14, 0.035, 0);
    fish.add(patch);

    const tail = new THREE.Mesh(tailGeo, index % 2 === 0 ? bodyMat : patchMat);
    tail.scale.set(0.1, 0.18, 0.04);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-0.38, 0, 0);
    fish.add(tail);

    scene.add(fish);
    animated.push({ type: "koi", group: fish, route, angle: route.phase });
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
  if (!isMobile) {
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
  }
  scene.add(group);
  addCollider(x - 1.95, z, 0.7, 0.7);
  addCollider(x + 1.95, z, 0.7, 0.7);
}

function addLanternGlowSprite(x, y, z, scale) {
  if (!lanternGlowTexture) {
    lanternGlowTexture = makeRadialTexture("#ffd9a4", "rgba(255, 158, 92, 0.4)");
  }
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: lanternGlowTexture,
      color: "#ffbe7d",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.set(scale, scale, 1);
  glow.position.set(sx(x), y, sz(z));
  scene.add(glow);
  return glow;
}

function addLantern(x, z, y, size, exterior = false) {
  block(size * 0.18, size * 1.1, size * 0.18, materials.bridgeDark, x, y - size * 0.3, z);
  const shade = block(size * 0.6, size * 0.6, size * 0.6, materials.lanternGlow, x, y + size * 0.22, z);
  shade.userData.baseIntensity = 1;
  // Real PointLights are the most expensive thing in a forward renderer.
  // Small bridge lanterns skip them on mobile — the glow sprite + emissive
  // shade carry the look for a fraction of the cost.
  let light = null;
  if (!isMobile || size >= 0.42) {
    const lightDist = size >= 0.42 ? 8 : 5;
    light = new THREE.PointLight("#ffb36b", 1.4, lightDist, 2);
    light.position.set(sx(x), y + size * 0.24, sz(z));
    scene.add(light);
  }
  const glow = addLanternGlowSprite(x, y + size * 0.22, z, size * 4.6);
  animated.push({ type: "lantern", mesh: shade, light, exterior, glow });
}

function getTreeShared() {
  if (treeShared.ready) return treeShared;

  // Four pre-deformed canopy blob variants — lumpy, slightly squashed spheres
  treeShared.canopyGeos = [];
  for (let v = 0; v < 4; v += 1) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const wobble = Math.sin(i * 12.9898 + v * 78.233) * 43758.5453;
      const bump = 1 + (wobble - Math.floor(wobble)) * 0.26 - 0.10;
      pos.setXYZ(i, (nx / len) * bump, (ny / len) * bump * 0.82, (nz / len) * bump);
    }
    geo.computeVertexNormals();
    treeShared.canopyGeos.push(geo);
  }

  // Light catches the top of the crown; shade gathers underneath
  treeShared.canopyMats = [
    new THREE.MeshStandardMaterial({ color: "#f8cdd8", roughness: 0.92, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: "#efadc1", roughness: 0.92, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: "#d887a3", roughness: 0.93, metalness: 0 }),
  ];
  treeShared.trunkMat = new THREE.MeshStandardMaterial({ color: "#5d3a2a", roughness: 0.96, metalness: 0 });
  treeShared.trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 7);
  treeShared.branchGeo = new THREE.CylinderGeometry(0.4, 1, 1, 6);
  treeShared.ready = true;
  return treeShared;
}

function addSakuraTree(x, z, scale = 1, groundY = 0.21, detailed = false) {
  const s = getTreeShared();
  const group = new THREE.Group();
  group.position.set(sx(x), 0, sz(z));

  // Deterministic per-tree variation so the forest doesn't repeat
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const lean = (seed - 0.5) * 0.22;
  const leanDir = seed * Math.PI * 2;
  group.rotation.y = seed * Math.PI * 2;

  const trunkH = 2.7 * scale;
  const trunkR = 0.21 * scale * WORLD_SCALE;

  const trunk = new THREE.Mesh(s.trunkGeo, s.trunkMat);
  trunk.scale.set(trunkR, trunkH, trunkR);
  trunk.position.y = trunkH / 2;
  trunk.rotation.set(Math.sin(leanDir) * lean, 0, Math.cos(leanDir) * lean);
  trunk.castShadow = !isMobile;
  group.add(trunk);

  // Branches reaching from the trunk top into the canopy
  const branchCount = detailed && !isMobile ? 3 : 2;
  for (let b = 0; b < branchCount; b += 1) {
    const angle = leanDir + (b / branchCount) * Math.PI * 2 + 0.7;
    const branch = new THREE.Mesh(s.branchGeo, s.trunkMat);
    const bLen = (1.0 + (b % 2) * 0.4) * scale;
    branch.scale.set(trunkR * 0.5, bLen, trunkR * 0.5);
    branch.position.set(
      Math.cos(angle) * 0.36 * scale * WORLD_SCALE,
      trunkH * 0.92,
      Math.sin(angle) * 0.36 * scale * WORLD_SCALE,
    );
    branch.rotation.set(Math.sin(angle) * 0.85, 0, -Math.cos(angle) * 0.85);
    branch.castShadow = !isMobile;
    group.add(branch);
  }

  // Crown — clustered lumpy blobs, lighter on top, deeper pink beneath
  const blobs = [
    [0, 1.0, 0, 1.5, 0],
    [-1.05, 0.62, 0.3, 1.05, 1],
    [1.12, 0.7, 0.22, 1.1, 1],
    [0.25, 0.78, -1.05, 1.0, 1],
    [0.62, 0.85, 0.88, 0.95, 1],
    [-0.55, 0.55, -0.72, 0.88, 2],
    [-0.85, 1.28, -0.2, 0.8, 0],
    [0.8, 1.35, -0.45, 0.78, 0],
    [0.0, 1.62, 0.32, 0.86, 0],
    [-0.28, 0.34, 0.95, 0.7, 2],
  ];
  // Distant shoreline trees read fine with fewer blobs — only the walkable
  // hero tree gets the full crown (draw calls are the budget here)
  const blobLimit = isMobile ? 6 : detailed ? blobs.length : 7;

  for (let i = 0; i < blobLimit; i += 1) {
    const [ox, oy, oz, r, tone] = blobs[i];
    const blob = new THREE.Mesh(
      s.canopyGeos[(i + Math.floor(seed * 4)) % 4],
      s.canopyMats[tone],
    );
    const rr = r * scale;
    blob.scale.set(rr * WORLD_SCALE, rr * 0.85, rr * WORLD_SCALE);
    blob.position.set(
      ox * scale * WORLD_SCALE,
      trunkH + oy * scale,
      oz * scale * WORLD_SCALE,
    );
    blob.rotation.y = i * 1.7 + seed * 6;
    blob.castShadow = !isMobile && i < 5;
    group.add(blob);
  }

  scene.add(group);

  // Fallen petal carpet pooling around the roots
  const carpet = [];
  const carpetCount = isMobile ? 8 : 16;
  for (let i = 0; i < carpetCount; i += 1) {
    const angle = random(0, Math.PI * 2);
    const dist = random(0.5, 2.4) * scale;
    carpet.push({
      w: random(0.08, 0.2),
      h: 0.012,
      d: random(0.05, 0.14),
      x: x + Math.cos(angle) * dist,
      y: groundY,
      z: z + Math.sin(angle) * dist,
      ry: random(0, Math.PI),
    });
  }
  addInstancedBoxes(carpet, materials.sakura);
}

function makePetalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 26, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(255, 226, 232, 1)");
  grad.addColorStop(0.65, "rgba(248, 182, 199, 0.96)");
  grad.addColorStop(1, "rgba(232, 148, 175, 0)");
  ctx.fillStyle = grad;
  // Teardrop petal with a notched tip — classic sakura silhouette
  ctx.beginPath();
  ctx.moveTo(32, 58);
  ctx.bezierCurveTo(8, 44, 6, 18, 24, 8);
  ctx.quadraticCurveTo(32, 14, 32, 6);
  ctx.quadraticCurveTo(32, 14, 40, 8);
  ctx.bezierCurveTo(58, 18, 56, 44, 32, 58);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addPetals() {
  const texture = makePetalTexture();
  const tints = ["#ffffff", "#ffdbe2", "#f2b9cb"].map(
    (color) =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
  );
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(0.13, 0.13);
  const count = isMobile ? 36 : 64;
  for (let i = 0; i < count; i += 1) {
    const petal = new THREE.Mesh(geometry, tints[i % 3]);
    petal.position.set(sx(random(-28, 28)), random(0.8, 6.2), sz(random(-30, 31)));
    petal.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    petal.userData.speed = random(0.16, 0.46);
    petal.userData.phase = random(0, Math.PI * 2);
    petal.userData.tumble = random(0.5, 1.6);
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

  // Soft vertical grain strokes — reads as brushed wood / washi, not voxel grid
  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * 128;
    ctx.globalAlpha = 0.05 + Math.random() * 0.09;
    ctx.fillStyle = Math.random() > 0.4 ? highlight : "rgba(60, 36, 22, 0.5)";
    ctx.fillRect(x, 0, 0.8 + Math.random() * 2.2, 128);
  }

  // Fine speckle for tooth
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = highlight;
  for (let i = 0; i < 110; i += 1) {
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  ctx.globalAlpha = 1;

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
  // Textured standard material so lawns receive tree/house shadows
  const texture = document.createElement("canvas");
  texture.width = 256;
  texture.height = 256;
  const ctx = texture.getContext("2d");
  ctx.fillStyle = "#77945f";
  ctx.fillRect(0, 0, 256, 256);

  // Small mottled patches — kept tight so a high repeat reads as turf,
  // not big stretched streaks
  for (let i = 0; i < 70; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 6 + Math.random() * 14;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    const tone = Math.random();
    const color = tone > 0.62 ? "rgba(167, 190, 122, 0.16)" : tone > 0.3 ? "rgba(104, 134, 80, 0.16)" : "rgba(88, 112, 66, 0.16)";
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blade flecks
  for (let i = 0; i < 700; i += 1) {
    ctx.globalAlpha = 0.08 + Math.random() * 0.14;
    ctx.fillStyle = Math.random() > 0.5 ? "#a7be7a" : "#5d7a48";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 3);
  }
  ctx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(12, 9); // finer tiling kills the stretched-streak look
  return new THREE.MeshStandardMaterial({ color: "#86a06a", map, roughness: 0.94, metalness: 0 });
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
  // Aim dojo is stationary — freeze the player but keep mouse-look alive
  if (state.mapFocus || range.phase !== "off") {
    state.velocity.set(0, 0, 0);
    state.moveBlend = damp(state.moveBlend, 0, 8, delta);
    return;
  }

  const input = new THREE.Vector3();
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) input.z -= 1;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) input.z += 1;
  if (state.keys.has("KeyQ")) input.x -= 1;
  if (state.keys.has("KeyE")) input.x += 1;
  // Virtual joystick axes (clamped -1…1, additive with keyboard)
  // On mobile: joyX turns the camera (like A/D), joyZ moves forward/back (like W/S)
  // On desktop: joyX strafes (fallback, unlikely to be used)
  if (isMobile) {
    state.targetYaw -= state.joyX * keyboardTurnSpeed * 1.4 * delta;
  } else {
    input.x = THREE.MathUtils.clamp(input.x + state.joyX, -1, 1);
  }
  input.z = THREE.MathUtils.clamp(input.z + state.joyZ, -1, 1);

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
  starField.material.opacity = THREE.MathUtils.clamp((1 - daylight) * 0.95 - evening * 0.3, 0, 0.85);

  sun.intensity = THREE.MathUtils.clamp(0.75 + daylight * 2.25 + evening * 0.55, 0.55, 3.0);
  moonLight.position.set(-sun.position.x, Math.max(8, -sunHeight + 12), 30);
  moonLight.intensity = THREE.MathUtils.clamp((1 - daylight) * 1.25 + evening * 0.35, 0.18, 1.35);
  hemiLight.intensity = THREE.MathUtils.clamp(1.0 + daylight * 1.25 + evening * 0.48, 0.95, 2.35);
  renderer.toneMappingExposure = THREE.MathUtils.clamp(1.12 + daylight * 0.22 + evening * 0.12, 1.06, 1.38);
  scene.fog.near = 36;
  scene.fog.far = 108;

  animated.forEach((item) => {
    if (item.type !== "lantern") return;
    let nightBoost;
    if (item.exterior) {
      // Exterior lamps (bridge, entrance): fully off in daylight, on at dusk/night
      nightBoost = THREE.MathUtils.clamp(1.5 - daylight * 1.5 + evening * 1.3, 0.0, 2.0);
    } else {
      // Interior lanterns: stay dimly lit all day, brighter at night
      nightBoost = THREE.MathUtils.clamp(1.35 - daylight * 0.6 + evening * 0.9, 0.45, 1.85);
    }
    item.mesh.visible = true; // shade is always physically present
    item.mesh.material.opacity = 1;
    item.glowBoost = nightBoost;
    if (item.light) {
      item.light.visible = nightBoost > 0.04;
      item.light.userData.targetIntensity = 1.35 * nightBoost;
    }
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
    if (item.type === "koi") {
      const { route } = item;
      item.angle += route.speed * delta * 0.4;
      const wobble = Math.sin(now * 0.0016 + route.phase) * 0.5;
      const r = route.radius + wobble;
      const px = route.cx + Math.cos(item.angle) * r;
      const pz = route.cz + Math.sin(item.angle) * r;
      const py = -0.26 + Math.sin(now * 0.0021 + route.phase * 2) * 0.055;
      // Heading from the parametric derivative of the circular path
      const dx = -Math.sin(item.angle) * route.speed;
      const dz = Math.cos(item.angle) * route.speed;
      item.group.position.set(sx(px), py, sz(pz));
      item.group.rotation.y = Math.atan2(-sz(dz), sx(dx));
      item.group.rotation.z = Math.sin(now * 0.004 + route.phase) * 0.08;
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
      if (item.glow) {
        const strength = (item.glowBoost ?? 0) * 1.35 * flicker;
        item.glow.material.opacity = THREE.MathUtils.clamp(strength * 0.17, 0, 0.5);
      }
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
        const { speed, phase, tumble } = petal.userData;
        // Pendulum sway as it falls — petals slide sideways, hesitate, drop
        petal.position.x += (delta * speed * 0.3) + Math.sin(now * 0.0014 + phase) * delta * 0.32;
        petal.position.y -= delta * speed * (0.24 + Math.abs(Math.cos(now * 0.0011 + phase)) * 0.14);
        petal.position.z += Math.cos(now * 0.0009 + phase) * delta * 0.26;
        petal.rotation.x += delta * tumble * 0.8;
        petal.rotation.z += delta * tumble * 0.55;
        if (petal.position.y < 0.2) {
          petal.position.set(sx(random(-28, 28)), random(3.4, 6.4), sz(random(-30, 31)));
        }
      });
    }
  });
}

function updateSpotLabel() {
  if (range.phase !== "off") {
    spotLabel.textContent = "Aim Dojo";
    return;
  }

  if (state.mapFocus) {
    spotLabel.textContent = "House Map";
    showInteractionHint(isMobile ? "Tap F or nav to return" : "F or Esc to return");
    return;
  }

  if (isNearPodium()) {
    state.activeInteractable = null;
    spotLabel.textContent = "Aim Dojo";
    showInteractionHint(isMobile ? "Tap F to train" : "F to enter Aim Dojo");
    return;
  }

  const nearbyDoor = getNearbyDoor();
  if (nearbyDoor) {
    state.activeInteractable = null;
    spotLabel.textContent = nearbyDoor.label;
    showInteractionHint(isMobile
      ? `Tap F to ${nearbyDoor.open ? "close" : "open"}`
      : `F to ${nearbyDoor.open ? "close" : "open"}`);
    return;
  }

  const nearbyPortfolio = getNearbyInteractable() || getAimedInteractable();
  if (nearbyPortfolio) {
    state.activeInteractable = nearbyPortfolio;
    spotLabel.textContent = nearbyPortfolio.label;
    showInteractionHint(isMobile
      ? (nearbyPortfolio.id === "map" ? "Tap F to inspect map" : "Tap F to view")
      : (nearbyPortfolio.id === "map" ? "F to inspect map" : "Click or F to view"));
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

function isNearPodium() {
  if (!range.gate || state.floorY >= 0.8) return false;
  const d = Math.hypot(camera.position.x - range.gate.center.x, camera.position.z - range.gate.center.y);
  return d < 3.2;
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
  updateRange(delta, now);
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
  if (isMobile) return; // touch look is driven by touch events, no pointer lock needed
  try {
    const request = canvas.requestPointerLock?.();
    if (request && typeof request.catch === "function") {
      request.catch(() => { state.pointerLocked = false; });
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

enterButton?.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  requestLookControl();
});

// Auto-dismiss the intro — no button needed, world speaks for itself
window.setTimeout(() => intro?.classList.add("is-hidden"), 1400);

canvas.addEventListener("click", (event) => {
  if (state.mapFocus) return;
  if (isPortfolioOpen()) return;
  // In the dojo: clicks shoot, and re-acquire pointer lock if it was lost
  if (range.phase === "live") { shootDojo(); return; }
  if (range.phase === "countdown") { requestLookControl(); return; }
  if (range.phase === "menu" || range.phase === "results") return;
  intro.classList.add("is-hidden");
  if (openClickedPortfolio(event)) return;
  requestLookControl();
});

canvas.addEventListener("mousedown", () => {
  if (state.mapFocus) return;
  if (isPortfolioOpen()) return;
  if (range.phase === "live" && range.mode === "tracking") { range.tracking = true; return; }
  if (range.phase !== "off") return;
  state.dragLook = true;
});

document.addEventListener("mouseup", () => {
  state.dragLook = false;
  range.tracking = false;
});

document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (event) => {
  // In the dojo the camera is FIXED — the mouse drives an on-screen crosshair.
  const inDojoAim = range.phase === "live" || range.phase === "countdown";
  if (inDojoAim) {
    if (!state.pointerLocked) return;
    range.cursor.x = THREE.MathUtils.clamp(range.cursor.x + event.movementX * range.sens, 0, window.innerWidth);
    range.cursor.y = THREE.MathUtils.clamp(range.cursor.y + event.movementY * range.sens, 0, window.innerHeight);
    paintCursor();
    return;
  }
  if (range.phase !== "off") return;
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

  // Aim dojo: Esc is the universal back-out
  if (range.phase !== "off") {
    if (event.code === "Escape" && !event.repeat) {
      if (range.phase === "live" || range.phase === "countdown") endRound();
      else exitDojo();
    }
    return;
  }

  state.keys.add(event.code);
  if (event.code === "KeyF" && !event.repeat) {
    if (isNearPodium()) { enterDojo(); return; }
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.35));
});

// ── Mobile / touch controls ────────────────────────────────────────────────
if (isMobile && mobHud) {
  mobHud.classList.add("is-active");
  mobHud.removeAttribute("aria-hidden");

  const JOY_RADIUS = 44;          // max dot travel from base center (px)
  const TOUCH_SENSITIVITY = 0.0028; // look sensitivity for finger drag

  // Track which touch IDs own the joystick vs the look zone
  let joyTouchId  = null;
  let lookTouchId = null;
  let lookLastX   = 0;
  let lookLastY   = 0;

  // Joystick base rect — re-queried on each touchstart in case of resize
  function getJoyRect() { return joyZone?.getBoundingClientRect(); }

  function setJoy(dx, dz) {
    state.joyX = dx;
    state.joyZ = dz;
    if (!joyDot) return;
    const ox = dx * JOY_RADIUS;
    const oy = dz * JOY_RADIUS;
    joyDot.style.transform = `translate(calc(-50% + ${ox.toFixed(1)}px), calc(-50% + ${oy.toFixed(1)}px))`;
  }

  function clearJoy() {
    joyTouchId = null;
    setJoy(0, 0);
  }

  function clearLook() {
    lookTouchId = null;
    state.dragLook = false;
  }

  // UI elements that should NOT start a look gesture.
  // NOTE: .joy-zone is intentionally excluded — it is checked separately first.
  const UI_SELECTOR = ".hud, .portfolio-panel, .mob-bar, .mob-nav-overlay, .touch-btn";

  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); }, { passive: false });

  document.addEventListener("touchstart", (e) => {
    for (const touch of e.changedTouches) {
      // ── Joy zone check FIRST (before UI filter) so the stick always registers ──
      const joyRect = getJoyRect();
      const inJoyZone = joyRect &&
        touch.clientX >= joyRect.left && touch.clientX <= joyRect.right &&
        touch.clientY >= joyRect.top  && touch.clientY <= joyRect.bottom;

      if (inJoyZone && joyTouchId === null) {
        joyTouchId = touch.identifier;
        setJoy(0, 0);
        continue; // claimed — don't fall through to look or UI check
      }

      // If the touch landed on a UI element, let it handle itself
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el?.closest(UI_SELECTOR)) continue;

      if (lookTouchId === null) {
        lookTouchId = touch.identifier;
        lookLastX   = touch.clientX;
        lookLastY   = touch.clientY;
        state.dragLook = true;
        // Dismiss the intro on first canvas touch
        intro?.classList.add("is-hidden");
      }
    }
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        const joyRect = getJoyRect();
        if (!joyRect) continue;
        const cx = joyRect.left + joyRect.width  * 0.5;
        const cy = joyRect.top  + joyRect.height * 0.5;
        const rawDx = touch.clientX - cx;
        const rawDy = touch.clientY - cy;
        const dist  = Math.hypot(rawDx, rawDy);
        const scale = dist > 1 ? Math.min(1, JOY_RADIUS / dist) : 0;
        // dx → strafe (X axis), dy → forward/back (Z axis)
        setJoy(rawDx * scale / JOY_RADIUS, rawDy * scale / JOY_RADIUS);
      }

      if (touch.identifier === lookTouchId) {
        if (state.mapFocus || isPortfolioOpen()) continue;
        const dx = touch.clientX - lookLastX;
        const dy = touch.clientY - lookLastY;
        lookLastX = touch.clientX;
        lookLastY = touch.clientY;
        state.targetYaw   -= dx * TOUCH_SENSITIVITY;
        state.targetPitch -= dy * TOUCH_SENSITIVITY;
        state.targetPitch  = Math.max(-0.9, Math.min(0.72, state.targetPitch));
        state.lookSway     = THREE.MathUtils.clamp(dx * -0.00014, -0.014, 0.014);
      }
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId)  clearJoy();
      if (touch.identifier === lookTouchId) clearLook();
    }
  }, { passive: true });

  document.addEventListener("touchcancel", (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId)  clearJoy();
      if (touch.identifier === lookTouchId) clearLook();
    }
  }, { passive: true });

  // ── Mob-bar: time toggle ──────────────────────────────────────────────────
  mobTimeBtn?.addEventListener("click", () => { timeToggle?.click(); });

  // ── Mob-bar: nav overlay open / close ────────────────────────────────────
  mobNavBtn?.addEventListener("click", () => {
    mobNavOverlay?.classList.add("is-open");
    mobNavOverlay?.removeAttribute("aria-hidden");
  });
  mobNavClose?.addEventListener("click", () => {
    mobNavOverlay?.classList.remove("is-open");
    mobNavOverlay?.setAttribute("aria-hidden", "true");
  });

  // Spot buttons inside the nav overlay → close overlay after teleport.
  // Teleport itself is handled by the global [data-spot] click listener above.
  mobNavOverlay?.querySelectorAll("[data-spot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      mobNavOverlay.classList.remove("is-open");
      mobNavOverlay.setAttribute("aria-hidden", "true");
    });
  });

  // ── Sync spotLabel → mobSpot (mirrors the desktop label automatically) ───
  if (mobSpot && spotLabel) {
    mobSpot.textContent = spotLabel.textContent;
    new MutationObserver(() => { mobSpot.textContent = spotLabel.textContent; })
      .observe(spotLabel, { childList: true, characterData: true, subtree: true });
  }

  // ── Sync timeLabel → mobTimeLabel ────────────────────────────────────────
  if (mobTimeLabel && timeLabel) {
    mobTimeLabel.textContent = timeLabel.textContent;
    new MutationObserver(() => { mobTimeLabel.textContent = timeLabel.textContent; })
      .observe(timeLabel, { childList: true, characterData: true, subtree: true });
  }

  // ── Interact button (F equivalent) ───────────────────────────────────────
  touchInteract?.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (range.phase === "live") { range.mode === "tracking" ? (range.tracking = true) : shootDojo(); return; }
    if (range.phase !== "off") return; // menu/results use HTML buttons
    if (state.mapFocus) { exitMapFocus(); return; }
    if (isPortfolioOpen()) { closePortfolioPanel(); return; }
    if (isNearPodium()) { enterDojo(); return; }
    if (!toggleFrontDoor()) openNearbyPortfolio();
  }, { passive: false });
  touchInteract?.addEventListener("touchend", (e) => {
    e.stopPropagation();
    range.tracking = false;
  }, { passive: true });
}

// Module evaluated to the end without throwing
window.__worldReady = true;

// Localhost-only debug hooks for driving the dojo from the console/tests
if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
  window.__dojo = {
    enter: enterDojo,
    exit: exitDojo,
    start: startRound,
    step: (delta) => updateRange(delta, performance.now()),
    shoot: shootDojo,
    get range() { return range; },
    get camera() { return camera; },
  };
}
