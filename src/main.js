import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#scene");
const enterButton = document.querySelector("#enterButton");
const intro = document.querySelector("#intro");
const roomLabel = document.querySelector("#roomLabel");
const interactionHint = document.querySelector("#interactionHint");
const interactionTitle = document.querySelector("#interactionTitle");
const reticle = document.querySelector("#reticle");
const detailModal = document.querySelector("#detailModal");
const closeModal = document.querySelector("#closeModal");
const modalKicker = document.querySelector("#modalKicker");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const modalList = document.querySelector("#modalList");
const modalPrimary = document.querySelector("#modalPrimary");
const modalSecondary = document.querySelector("#modalSecondary");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#f3dfdc");
scene.fog = new THREE.Fog("#f3dfdc", 18, 54);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.08,
  90,
);

const EYE_HEIGHT = 1.68;
const mouseSensitivity = 0.00135;
const lookEase = 18;
const moveEase = 9.5;
const stopEase = 12;
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const colliders = [];
const interactables = [];
const animated = [];
let hoveredPanel = null;

const palette = {
  ink: "#171817",
  cedar: "#4a2f27",
  cedarDark: "#271c19",
  paper: "#fff4eb",
  paperWarm: "#f4dfcf",
  blush: "#f3b8c6",
  blushSoft: "#ffd8df",
  moss: "#7f9470",
  mossDark: "#526349",
  gold: "#c79c5a",
  stone: "#9b958b",
  water: "#8fb9bd",
  vermilion: "#b95a4f",
};

const materials = {
  tatami: new THREE.MeshStandardMaterial({
    color: "#d9cda7",
    map: makeTatamiTexture("#d7cca4", "#b6a975"),
    roughness: 0.92,
    metalness: 0.01,
  }),
  tatamiAlt: new THREE.MeshStandardMaterial({
    color: "#cfc29a",
    map: makeTatamiTexture("#d1c294", "#aa9a65"),
    roughness: 0.94,
    metalness: 0.01,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: palette.cedar,
    map: makeWoodTexture("#4a2f27", "#6a4032"),
    roughness: 0.65,
    metalness: 0.03,
  }),
  darkWood: new THREE.MeshStandardMaterial({
    color: palette.cedarDark,
    map: makeWoodTexture("#2b1d19", "#513229"),
    roughness: 0.72,
    metalness: 0.02,
  }),
  paper: new THREE.MeshStandardMaterial({
    color: palette.paper,
    map: makeWashiTexture("#fff4eb", "#ecd5c5"),
    roughness: 0.88,
    metalness: 0,
  }),
  paperAlt: new THREE.MeshStandardMaterial({
    color: palette.paperWarm,
    map: makeWashiTexture("#f4dfcf", "#ead0bf"),
    roughness: 0.9,
    metalness: 0,
  }),
  panel: new THREE.MeshStandardMaterial({
    color: "#201a18",
    roughness: 0.62,
    metalness: 0.05,
  }),
  blush: new THREE.MeshStandardMaterial({
    color: palette.blush,
    roughness: 0.78,
    metalness: 0.02,
  }),
  blushSoft: new THREE.MeshStandardMaterial({
    color: palette.blushSoft,
    roughness: 0.86,
    metalness: 0,
  }),
  moss: new THREE.MeshStandardMaterial({
    color: palette.moss,
    roughness: 0.88,
    metalness: 0,
  }),
  mossDark: new THREE.MeshStandardMaterial({
    color: palette.mossDark,
    roughness: 0.9,
    metalness: 0,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: palette.stone,
    map: makeStoneTexture(),
    roughness: 0.86,
    metalness: 0.01,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: palette.gold,
    roughness: 0.38,
    metalness: 0.42,
  }),
  water: new THREE.MeshPhysicalMaterial({
    color: palette.water,
    roughness: 0.12,
    metalness: 0,
    transmission: 0.18,
    thickness: 0.35,
    transparent: true,
    opacity: 0.72,
  }),
  vermilion: new THREE.MeshStandardMaterial({
    color: palette.vermilion,
    roughness: 0.58,
    metalness: 0.02,
  }),
  lanternGlow: new THREE.MeshBasicMaterial({ color: "#ffe5be" }),
  petal: new THREE.MeshBasicMaterial({
    color: palette.blushSoft,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
  }),
};

const rooms = {
  Lobby: {
    center: new THREE.Vector3(0, EYE_HEIGHT, 4.8),
    viewYaw: 0,
    label: "Lobby Garden",
  },
  Projects: {
    center: new THREE.Vector3(16, EYE_HEIGHT, 3.9),
    viewYaw: 0,
    label: "Project Gallery",
  },
  Experience: {
    center: new THREE.Vector3(0, EYE_HEIGHT, -12.2),
    viewYaw: 0,
    label: "Experience Walk",
  },
  Skills: {
    center: new THREE.Vector3(-16, EYE_HEIGHT, 3.9),
    viewYaw: 0,
    label: "Skills Tea Room",
  },
  Contact: {
    center: new THREE.Vector3(0, EYE_HEIGHT, 12.4),
    viewYaw: Math.PI,
    label: "Contact Veranda",
  },
};

const cards = [
  {
    room: "Lobby",
    title: "About Sashi",
    kicker: "Template - intro",
    summary: "Replace this with a concise 2-3 sentence personal introduction.",
    body:
      "Use this panel for your professional identity: what you build, what you are studying, what kind of role you want, and what makes your work distinctive.",
    bullets: [
      "Add your current school, role, or focus area.",
      "Add the strongest technical themes you want people to remember.",
      "Add one human detail that gives the site warmth.",
    ],
    primary: "Resume",
    secondary: "About page",
    position: [0, 2.18, -4.92],
    rotation: 0,
  },
  {
    room: "Projects",
    title: "Project One",
    kicker: "Template - featured case study",
    summary: "Project name, role, stack, and outcome.",
    body:
      "Use this as your strongest case study. The modal should explain the problem, your technical contribution, the architecture, and the measurable result or demo.",
    bullets: [
      "Problem: what was difficult or useful about the project.",
      "Build: models, APIs, frontend, backend, data, or 3D pieces.",
      "Impact: demo link, users, performance, or what you learned.",
    ],
    primary: "Live demo",
    secondary: "GitHub",
    position: [13.2, 1.9, -4.95],
    rotation: 0,
    accent: "#f0a6b7",
  },
  {
    room: "Projects",
    title: "Project Two",
    kicker: "Template - product build",
    summary: "Short product-style description goes here.",
    body:
      "Use this panel for a product, app, or AI tool. Keep the copy plain and specific so the polished 3D space does not overpower the actual work.",
    bullets: [
      "Add the user problem and your solution.",
      "Add stack details and the most interesting implementation choice.",
      "Add screenshots or a video later if you want richer project displays.",
    ],
    primary: "Case study",
    secondary: "Repository",
    position: [16, 1.9, -4.95],
    rotation: 0,
    accent: "#d5a45f",
  },
  {
    room: "Projects",
    title: "Project Three",
    kicker: "Template - experiment",
    summary: "Use this for a creative or technical experiment.",
    body:
      "This is a good place for your 3D portfolio itself, a machine-learning experiment, or a smaller prototype that shows taste and curiosity.",
    bullets: [
      "Add the core idea in one sentence.",
      "Add the hardest implementation detail.",
      "Add what you would improve next.",
    ],
    primary: "Explore",
    secondary: "Notes",
    position: [18.8, 1.9, -4.95],
    rotation: 0,
    accent: "#9dbb8a",
  },
  {
    room: "Experience",
    title: "Experience Timeline",
    kicker: "Template - roles",
    summary: "Internships, research, leadership, hackathons, and selected wins.",
    body:
      "Use this room as a calm timeline instead of a resume dump. Each item should show where you worked, what you owned, and one outcome.",
    bullets: [
      "Role or organization - one-line responsibility.",
      "Technical contribution - tools, models, systems, or product surface.",
      "Outcome - launch, metric, paper, award, or responsibility level.",
    ],
    primary: "Resume",
    secondary: "LinkedIn",
    position: [0, 1.95, -21.35],
    rotation: 0,
  },
  {
    room: "Skills",
    title: "Technical Stack",
    kicker: "Template - skills",
    summary: "AI, full-stack, data, 3D web, and tooling.",
    body:
      "This section should be scannable. Keep it grouped by capability rather than listing every tool you have ever touched.",
    bullets: [
      "AI/ML: frameworks, computer vision, NLP, evaluation, deployment.",
      "Full-stack: frontend, backend, databases, auth, cloud.",
      "Creative web: Three.js, animation, performance, interaction design.",
    ],
    primary: "Stack notes",
    secondary: "GitHub",
    position: [-16, 2.0, -4.95],
    rotation: 0,
  },
  {
    room: "Contact",
    title: "Contact",
    kicker: "Template - next step",
    summary: "Invite recruiters, collaborators, and friends to reach out.",
    body:
      "Keep this panel direct. Add your email, LinkedIn, GitHub, and resume. You can also include the kind of work you are currently looking for.",
    bullets: [
      "Email: your.email@example.com",
      "LinkedIn: replace with your profile URL.",
      "Resume: replace with your hosted resume PDF.",
    ],
    primary: "Email",
    secondary: "LinkedIn",
    position: [0, 2.08, 21.25],
    rotation: Math.PI,
  },
];

const state = {
  keys: new Set(),
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  velocity: new THREE.Vector3(),
  last: performance.now(),
  pointerLocked: false,
  bobPhase: 0,
  bobAmount: 0,
  moveBlend: 0,
  sway: 0,
  lookSway: 0,
  dragLook: false,
};

camera.position.copy(rooms.Lobby.center);

buildWorld();
buildLighting();
requestAnimationFrame(animate);

function buildWorld() {
  addWalkway(8, 0, 7.4, 4.2);
  addWalkway(-8, 0, 7.4, 4.2);
  addWalkway(0, -8, 4.2, 7.4);
  addWalkway(0, 8, 4.2, 7.4);

  addRoom({ x: 0, z: 0, w: 13, d: 11, portals: ["east", "west", "north", "south"] });
  addRoom({ x: 16, z: 0, w: 13, d: 11, portals: ["west"] });
  addRoom({ x: -16, z: 0, w: 13, d: 11, portals: ["east"] });
  addRoom({ x: 0, z: -16, w: 13, d: 12, portals: ["south"] });
  addRoom({ x: 0, z: 16, w: 13, d: 11, portals: ["north"] });

  addTorii(6.55, 0, Math.PI / 2);
  addTorii(-6.55, 0, -Math.PI / 2);
  addTorii(0, -5.55, 0);
  addTorii(0, 5.55, Math.PI);

  addLobbyGarden();
  addProjectRoom();
  addExperienceRoom();
  addSkillsRoom();
  addContactRoom();
  addSakuraPetals();

  cards.forEach(addTemplatePanel);
}

function buildLighting() {
  scene.add(new THREE.HemisphereLight("#fff7ed", "#6d7668", 1.8));

  const sun = new THREE.DirectionalLight("#fff0d4", 1.6);
  sun.position.set(-8, 14, 10);
  scene.add(sun);

  [
    [0, 3.2, 1.4],
    [16, 3.1, 0],
    [-16, 3.1, 0],
    [0, 3.1, -16],
    [0, 3.1, 16],
  ].forEach(([x, y, z]) => {
    const light = new THREE.PointLight("#ffd6c9", 1.35, 11, 2);
    light.position.set(x, y, z);
    scene.add(light);
  });
}

function addRoom({ x, z, w, d, portals }) {
  addTatamiFloor(x, z, w, d);
  addWall(x, z - d / 2, w, "x", portals.includes("north"));
  addWall(x, z + d / 2, w, "x", portals.includes("south"));
  addWall(x - w / 2, z, d, "z", portals.includes("west"));
  addWall(x + w / 2, z, d, "z", portals.includes("east"));
  addCeilingBeams(x, z, w, d);
  addFloorBorder(x, z, w, d);
}

function addTatamiFloor(x, z, w, d) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), materials.darkWood);
  base.position.set(x, -0.09, z);
  scene.add(base);

  const matW = 1.82;
  const matD = 0.92;
  const cols = Math.floor((w - 0.8) / matW);
  const rows = Math.floor((d - 0.8) / matD);
  const startX = x - ((cols - 1) * matW) / 2;
  const startZ = z - ((rows - 1) * matD) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const mat = (row + col) % 2 === 0 ? materials.tatami : materials.tatamiAlt;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(matW - 0.04, 0.035, matD - 0.04), mat);
      tile.position.set(startX + col * matW, 0.02, startZ + row * matD);
      scene.add(tile);
    }
  }
}

function addWalkway(x, z, w, d) {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), materials.darkWood);
  deck.position.set(x, -0.08, z);
  scene.add(deck);

  const planks = Math.floor((w > d ? w : d) / 0.72);
  for (let i = 0; i < planks; i += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w > d ? 0.035 : w, 0.025, w > d ? d : 0.035),
      materials.wood,
    );
    const offset = (i - planks / 2) * 0.72;
    line.position.set(w > d ? x + offset : x, 0.005, w > d ? z : z + offset);
    scene.add(line);
  }
}

function addWall(cx, cz, length, axis, hasDoor) {
  const door = hasDoor ? 4.1 : 0;
  const parts = hasDoor ? [(length - door) / 2, (length - door) / 2] : [length];
  const offsets = hasDoor ? [-(length + door) / 4, (length + door) / 4] : [0];

  parts.forEach((partLength, index) => {
    if (partLength <= 0.2) return;
    const ox = axis === "x" ? offsets[index] : 0;
    const oz = axis === "z" ? offsets[index] : 0;
    const x = cx + ox;
    const z = cz + oz;

    const panel = new THREE.Mesh(
      axis === "x"
        ? new THREE.BoxGeometry(partLength, 2.75, 0.12)
        : new THREE.BoxGeometry(0.12, 2.75, partLength),
      materials.paper,
    );
    panel.position.set(x, 1.48, z);
    scene.add(panel);

    addShojiGrid(x, z, partLength, axis);
    colliders.push(box2D(x, z, axis === "x" ? partLength : 0.16, axis === "z" ? partLength : 0.16));
  });
}

function addShojiGrid(x, z, length, axis) {
  const horizontalYs = [0.22, 1.05, 1.9, 2.72];
  horizontalYs.forEach((y) => {
    const rail = new THREE.Mesh(
      axis === "x"
        ? new THREE.BoxGeometry(length + 0.08, 0.07, 0.18)
        : new THREE.BoxGeometry(0.18, 0.07, length + 0.08),
      materials.wood,
    );
    rail.position.set(x, y, z);
    scene.add(rail);
  });

  const count = Math.max(2, Math.floor(length / 1.08));
  for (let i = 0; i <= count; i += 1) {
    const offset = -length / 2 + (i * length) / count;
    const post = new THREE.Mesh(
      axis === "x"
        ? new THREE.BoxGeometry(0.07, 2.58, 0.18)
        : new THREE.BoxGeometry(0.18, 2.58, 0.07),
      materials.wood,
    );
    post.position.set(axis === "x" ? x + offset : x, 1.46, axis === "z" ? z + offset : z);
    scene.add(post);
  }
}

function addCeilingBeams(x, z, w, d) {
  for (let i = -1; i <= 1; i += 1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.16, 0.18), materials.darkWood);
    beam.position.set(x, 3.04, z + i * (d / 3));
    scene.add(beam);
  }

  for (let i = -1; i <= 1; i += 1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, d + 0.25), materials.darkWood);
    beam.position.set(x + i * (w / 3), 3.08, z);
    scene.add(beam);
  }
}

function addFloorBorder(x, z, w, d) {
  const bars = [
    [x, z - d / 2 + 0.2, w, 0.08],
    [x, z + d / 2 - 0.2, w, 0.08],
    [x - w / 2 + 0.2, z, 0.08, d],
    [x + w / 2 - 0.2, z, 0.08, d],
  ];
  bars.forEach(([bx, bz, bw, bd]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05, bd), materials.gold);
    bar.position.set(bx, 0.06, bz);
    scene.add(bar);
  });
}

function addTorii(x, z, rotationY) {
  const group = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.22, 2.55, 0.22);
  const lintelGeo = new THREE.BoxGeometry(3.25, 0.24, 0.24);
  const capGeo = new THREE.BoxGeometry(3.75, 0.16, 0.34);

  [-1.25, 1.25].forEach((offset) => {
    const post = new THREE.Mesh(postGeo, materials.vermilion);
    post.position.set(offset, 1.25, 0);
    group.add(post);
  });

  const lintel = new THREE.Mesh(lintelGeo, materials.vermilion);
  lintel.position.set(0, 2.42, 0);
  group.add(lintel);

  const cap = new THREE.Mesh(capGeo, materials.darkWood);
  cap.position.set(0, 2.62, 0);
  group.add(cap);

  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  scene.add(group);
}

function addLobbyGarden() {
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1.62, 48), materials.water);
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(1.45, 0.72, 1);
  pond.position.set(-2.8, 0.045, 0.85);
  scene.add(pond);
  animated.push({ type: "water", mesh: pond });

  [
    [-3.8, 1.9],
    [-2.85, 1.55],
    [-1.85, 1.18],
    [-0.85, 0.78],
  ].forEach(([x, z], index) => {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.1, 18), materials.stone);
    stone.position.set(x, 0.08, z);
    stone.rotation.y = index * 0.4;
    scene.add(stone);
  });

  addSakuraTree(3.35, 0.12, 1.28, 1.15);
  addStoneLantern(-4.65, 0.0, -2.7);
  addStoneLantern(4.8, 0.0, -2.85);
}

function addProjectRoom() {
  [
    [13.2, 0.42, "#f3b8c6"],
    [16, 0.42, "#d2aa6b"],
    [18.8, 0.42, "#98ad84"],
  ].forEach(([x, z, color]) => addDisplayPedestal(x, z, color));

  addLowTable(16, 0.1, 2.8, 3.4);
  addStoneLantern(11.6, 0, 3.15);
  addStoneLantern(20.4, 0, 3.15);
}

function addExperienceRoom() {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.08, 0.08), materials.gold);
  rail.position.set(0, 1.28, -19.85);
  scene.add(rail);

  [-3.8, -1.3, 1.3, 3.8].forEach((x, index) => {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 24), materials.blush);
    marker.position.set(x, 1.28, -19.85);
    marker.rotation.x = Math.PI / 2;
    scene.add(marker);

    const plaque = makeTextPlane(`Milestone ${index + 1}`, "Replace with role, year, and result.", 520, 260);
    plaque.position.set(x, 1.86, -19.75);
    plaque.scale.setScalar(0.42);
    scene.add(plaque);
  });

  addStoneLantern(-5, 0, -13.2);
  addStoneLantern(5, 0, -13.2);
}

function addSkillsRoom() {
  const skillData = [
    ["AI", -19.9, "#f3b8c6"],
    ["Frontend", -17.3, "#d2aa6b"],
    ["Backend", -14.7, "#9dbb8a"],
    ["3D Web", -12.1, "#98b8bf"],
  ];

  skillData.forEach(([label, x, color]) => {
    const scroll = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.62, 32, 1, true), materials.paperAlt);
    paper.rotation.z = Math.PI / 2;
    paper.position.y = 1.24;
    scroll.add(paper);

    const capMat = new THREE.MeshStandardMaterial({ color, roughness: 0.56, metalness: 0.08 });
    [-0.88, 0.88].forEach((offset) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 18), capMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(offset, 1.24, 0);
      scroll.add(cap);
    });

    const labelPlane = makeTextPlane(label, "Template skill group", 420, 220);
    labelPlane.position.set(0, 1.25, -0.46);
    labelPlane.scale.setScalar(0.4);
    scroll.add(labelPlane);

    scroll.position.set(x, 0, 0.85);
    scroll.rotation.y = 0.06 * (x + 16);
    scroll.scale.setScalar(0.72);
    scene.add(scroll);
  });

  addLowTable(-16, 0.05, 2.85, 3.8);
}

function addContactRoom() {
  addLowTable(0, 0.25, 15.5, 4.4);
  addStoneLantern(-4.8, 0, 18.2);
  addStoneLantern(4.8, 0, 18.2);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 1.15), materials.wood);
  bridge.position.set(0, 0.08, 13.55);
  scene.add(bridge);
}

function addDisplayPedestal(x, z, color) {
  const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.08 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 0.35, 32), materials.darkWood);
  base.position.set(x, 0.2, z);
  scene.add(base);

  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), baseMat);
  orb.position.set(x, 0.86, z);
  scene.add(orb);
  animated.push({ type: "orb", mesh: orb, speed: 0.35 + Math.random() * 0.18 });
}

function addLowTable(x, y, z, width) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 1.18), materials.darkWood);
  top.position.set(x, y + 0.48, z);
  scene.add(top);

  [-width / 2 + 0.34, width / 2 - 0.34].forEach((offsetX) => {
    [-0.38, 0.38].forEach((offsetZ) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), materials.wood);
      leg.position.set(x + offsetX, y + 0.12, z + offsetZ);
      scene.add(leg);
    });
  });
}

function addStoneLantern(x, y, z) {
  const group = new THREE.Group();
  const stack = [
    new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.18, 16), materials.stone),
    new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.78, 16), materials.stone),
    new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.7), materials.stone),
    new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 4), materials.stone),
  ];

  stack[0].position.y = 0.09;
  stack[1].position.y = 0.55;
  stack[2].position.y = 1.05;
  stack[3].position.y = 1.43;
  stack[3].rotation.y = Math.PI / 4;
  stack.forEach((mesh) => group.add(mesh));

  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.38), materials.lanternGlow);
  glow.position.y = 1.06;
  group.add(glow);

  group.position.set(x, y, z);
  scene.add(group);
}

function addSakuraTree(x, y, z, scale) {
  const group = new THREE.Group();
  const trunkMat = materials.wood;
  const trunk = cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 2.55, -0.06), 0.18, trunkMat);
  group.add(trunk);

  [
    [new THREE.Vector3(0.05, 1.35, 0), new THREE.Vector3(-0.9, 2.18, 0.2), 0.08],
    [new THREE.Vector3(0.05, 1.55, 0), new THREE.Vector3(0.82, 2.36, 0.28), 0.075],
    [new THREE.Vector3(0.08, 1.8, 0), new THREE.Vector3(0.22, 2.68, -0.82), 0.07],
    [new THREE.Vector3(0.08, 1.92, 0), new THREE.Vector3(-0.35, 2.86, -0.48), 0.055],
  ].forEach(([start, end, radius]) => group.add(cylinderBetween(start, end, radius, trunkMat)));

  [
    [-0.95, 2.34, 0.25, 0.76],
    [0.82, 2.5, 0.34, 0.84],
    [0.22, 2.88, -0.86, 0.72],
    [-0.38, 3.02, -0.48, 0.62],
    [0.08, 2.55, 0.05, 0.8],
  ].forEach(([cx, cy, cz, r], index) => {
    const blossom = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 2),
      index % 2 === 0 ? materials.blushSoft : materials.blush,
    );
    blossom.position.set(cx, cy, cz);
    group.add(blossom);
  });

  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  scene.add(group);
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, length, 12), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function addSakuraPetals() {
  const group = new THREE.Group();
  const geometry = new THREE.CircleGeometry(0.035, 8);
  for (let i = 0; i < 120; i += 1) {
    const petal = new THREE.Mesh(geometry, materials.petal);
    petal.position.set(random(-21, 21), random(1.2, 3.4), random(-21, 21));
    petal.scale.set(random(0.7, 1.35), random(0.38, 0.82), 1);
    petal.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));
    petal.userData.drift = random(0.16, 0.44);
    group.add(petal);
  }
  scene.add(group);
  animated.push({ type: "petals", group });
}

function addTemplatePanel(card) {
  const group = new THREE.Group();
  const [x, y, z] = card.position;
  const width = card.room === "Projects" ? 2.35 : 4.35;
  const height = card.room === "Projects" ? 1.55 : 2.05;

  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, height + 0.18, 0.08), materials.darkWood);
  back.position.z = -0.09;
  group.add(back);

  const plane = makeTextPlane(card.title, `${card.kicker}\n${card.summary}`, 900, 520);
  plane.scale.set(width / 4.6, height / 2.25, 1);
  plane.userData.card = card;
  group.add(plane);
  interactables.push(plane);

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: card.accent ?? palette.blush,
    roughness: 0.5,
    metalness: 0.08,
  });
  const accent = new THREE.Mesh(new THREE.BoxGeometry(width + 0.42, 0.06, 0.12), accentMaterial);
  accent.position.set(0, -height / 2 - 0.15, 0.02);
  group.add(accent);

  group.position.set(x, y, z);
  group.rotation.y = card.rotation;
  scene.add(group);
}

function makeTextPlane(title, subtitle, width = 760, height = 420) {
  const texture = makePanelTexture(title, subtitle, width, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.25), material);
}

function makePanelTexture(title, subtitle, width, height) {
  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = width;
  panelCanvas.height = height;
  const ctx = panelCanvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff4eb");
  gradient.addColorStop(0.54, "#f4dfd4");
  gradient.addColorStop(1, "#e8cbd0");
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#c58c98";
  for (let i = 0; i < 28; i += 1) {
    ctx.beginPath();
    ctx.ellipse(random(0, width), random(0, height), random(3, 12), random(2, 7), random(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(74, 47, 39, 0.48)";
  ctx.lineWidth = 5;
  roundRect(ctx, 12, 12, width - 24, height - 24, 20);
  ctx.stroke();

  ctx.fillStyle = "#4a2f27";
  ctx.font = "700 56px Georgia";
  wrapText(ctx, title, 54, 104, width - 108, 62, 2);

  ctx.fillStyle = "#6f5149";
  ctx.font = "600 29px Segoe UI";
  wrapText(ctx, subtitle, 56, 198, width - 112, 42, 5);

  const texture = new THREE.CanvasTexture(panelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function updateHover() {
  raycaster.setFromCamera(screenCenter, camera);
  const hits = raycaster.intersectObjects(interactables, false);
  const hit = hits.find((item) => item.distance < 12 && item.object.userData.card);

  hoveredPanel = hit?.object ?? null;
  if (hoveredPanel) {
    const card = hoveredPanel.userData.card;
    interactionTitle.textContent = card.title;
    interactionHint.hidden = false;
    reticle.classList.add("is-active");
  } else {
    interactionHint.hidden = true;
    reticle.classList.remove("is-active");
  }
}

function openCard(card) {
  document.exitPointerLock?.();
  modalKicker.textContent = card.kicker;
  modalTitle.textContent = card.title;
  modalBody.textContent = card.body;
  modalList.replaceChildren(
    ...card.bullets.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }),
  );
  modalPrimary.textContent = card.primary;
  modalSecondary.textContent = card.secondary;
  modalPrimary.href = "#";
  modalSecondary.href = "#";
  detailModal.hidden = false;
}

function closeCard() {
  detailModal.hidden = true;
}

function teleportTo(roomName) {
  const room = rooms[roomName];
  if (!room) return;
  intro.classList.add("is-hidden");
  state.velocity.set(0, 0, 0);
  camera.position.copy(room.center);
  state.yaw = room.viewYaw;
  state.targetYaw = room.viewYaw;
  state.pitch = 0;
  state.targetPitch = 0;
  state.bobAmount = 0;
  updateCamera(0.016);
  updateRoomLabel();
}

function movePlayer(delta) {
  const input = new THREE.Vector3();
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) input.z -= 1;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) input.z += 1;
  if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) input.x -= 1;
  if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) input.x += 1;

  const speed = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 5.55 : 3.1;
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
  if (!hitsWall(next.x, camera.position.z)) camera.position.x = next.x;
  if (!hitsWall(camera.position.x, next.z)) camera.position.z = next.z;

  const planarSpeed = Math.hypot(state.velocity.x, state.velocity.z);
  state.bobPhase += delta * planarSpeed * 6.7;
  const bobTarget = THREE.MathUtils.clamp(planarSpeed / 3.1, 0, 1) * state.moveBlend;
  state.bobAmount = damp(state.bobAmount, bobTarget, 8, delta);
  const stepBob = Math.sin(state.bobPhase) * 0.033 * state.bobAmount;
  const stepLift = Math.abs(Math.cos(state.bobPhase)) * 0.016 * state.bobAmount;
  camera.position.y = EYE_HEIGHT + stepBob + stepLift;
}

function updateCamera(delta = 0.016) {
  state.yaw = damp(state.yaw, state.targetYaw, lookEase, delta);
  state.pitch = damp(state.pitch, state.targetPitch, lookEase, delta);
  const roll = state.sway * -0.028 + state.lookSway;
  camera.quaternion.setFromEuler(new THREE.Euler(state.pitch, state.yaw, roll, "YXZ"));
  state.lookSway = damp(state.lookSway, 0, 9, delta);
}

function updateRoomLabel() {
  let closest = "Lobby";
  let distance = Infinity;
  Object.entries(rooms).forEach(([name, room]) => {
    const d = room.center.distanceTo(camera.position);
    if (d < distance) {
      closest = name;
      distance = d;
    }
  });
  roomLabel.textContent = rooms[closest].label;
}

function animate(now) {
  const delta = Math.min((now - state.last) / 1000, 0.05);
  state.last = now;

  movePlayer(delta);
  updateCamera(delta);
  updateRoomLabel();
  updateHover();
  updateAnimated(delta, now);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateAnimated(delta, now) {
  animated.forEach((item) => {
    if (item.type === "orb") {
      item.mesh.rotation.y += delta * item.speed;
      item.mesh.position.y += Math.sin(now * 0.0012 + item.speed * 7) * 0.0009;
    }

    if (item.type === "water") {
      item.mesh.rotation.z = Math.sin(now * 0.0007) * 0.018;
    }

    if (item.type === "petals") {
      item.group.children.forEach((petal) => {
        petal.position.x += delta * petal.userData.drift * 0.22;
        petal.position.y -= delta * petal.userData.drift * 0.24;
        petal.position.z += Math.sin(now * 0.0007 + petal.position.x) * delta * 0.1;
        petal.rotation.x += delta * 0.55;
        petal.rotation.z += delta * 0.38;
        if (petal.position.y < 0.35) {
          petal.position.y = random(2.3, 3.6);
          petal.position.x = random(-21, 21);
          petal.position.z = random(-21, 21);
        }
        if (petal.position.x > 23) petal.position.x = -23;
      });
    }
  });
}

function hitsWall(x, z) {
  const r = 0.34;
  return colliders.some((box) => x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ);
}

function box2D(x, z, w, d) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function makeTatamiTexture(base, line) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = line;
  ctx.globalAlpha = 0.34;
  for (let y = 8; y < 256; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + Math.sin(y) * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.28;
  for (let x = 8; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 0.5, 256);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1);
  return texture;
}

function makeWoodTexture(base, grain) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 5) {
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.22 + Math.random() * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.16) * 4);
    ctx.bezierCurveTo(70, y + 8, 140, y - 8, 256, y + Math.cos(y * 0.12) * 4);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1.3);
  return texture;
}

function makeWashiTexture(base, fiber) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = fiber;
  for (let i = 0; i < 320; i += 1) {
    ctx.globalAlpha = random(0.08, 0.22);
    ctx.beginPath();
    const x = random(0, 256);
    const y = random(0, 256);
    ctx.moveTo(x, y);
    ctx.lineTo(x + random(-16, 16), y + random(-3, 3));
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStoneTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#9b958b";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 460; i += 1) {
    const v = Math.floor(random(120, 188));
    ctx.fillStyle = `rgba(${v}, ${v - 4}, ${v - 12}, ${random(0.1, 0.28)})`;
    ctx.fillRect(random(0, 256), random(0, 256), random(1, 4), random(1, 4));
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
  const lines = text.split("\n");
  let drawn = 0;
  for (const line of lines) {
    const words = line.split(" ");
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        ctx.fillText(current, x, y);
        y += lineHeight;
        drawn += 1;
        current = word;
        if (drawn >= maxLines) return;
      } else {
        current = test;
      }
    }
    ctx.fillText(current, x, y);
    y += lineHeight;
    drawn += 1;
    if (drawn >= maxLines) return;
  }
}

enterButton.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  requestLookControl();
});

canvas.addEventListener("mousedown", () => {
  state.dragLook = true;
});

canvas.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  if (hoveredPanel) {
    openCard(hoveredPanel.userData.card);
    return;
  }
  requestLookControl();
});

closeModal.addEventListener("click", closeCard);
detailModal.addEventListener("click", (event) => {
  if (event.target === detailModal) closeCard();
});

document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
  if (state.pointerLocked) intro.classList.add("is-hidden");
});

document.addEventListener("mouseup", () => {
  state.dragLook = false;
});

document.addEventListener("mousemove", (event) => {
  if ((!state.pointerLocked && !state.dragLook) || !detailModal.hidden) return;
  state.targetYaw -= event.movementX * mouseSensitivity;
  state.targetPitch -= event.movementY * mouseSensitivity;
  state.targetPitch = Math.max(-1.18, Math.min(1.02, state.targetPitch));
  state.lookSway = THREE.MathUtils.clamp(event.movementX * -0.00016, -0.016, 0.016);
});

document.addEventListener("keydown", (event) => {
  if (!detailModal.hidden && event.code === "Escape") {
    closeCard();
    return;
  }

  if (event.code === "KeyE" && hoveredPanel) {
    openCard(hoveredPanel.userData.card);
    return;
  }

  state.keys.add(event.code);
  if (event.code === "Space") {
    intro.classList.add("is-hidden");
    requestLookControl();
  }
});

document.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

document.querySelectorAll("[data-room]").forEach((button) => {
  button.addEventListener("click", () => teleportTo(button.dataset.room));
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
});

function requestLookControl() {
  try {
    const lockRequest = canvas.requestPointerLock?.();
    if (lockRequest && typeof lockRequest.catch === "function") {
      lockRequest.catch(() => {
        state.pointerLocked = false;
      });
    }
  } catch {
    state.pointerLocked = false;
  }
}
