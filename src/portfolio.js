const storageKey = "sashit-portfolio-theme";
const root = document.documentElement;
const themeToggle = document.querySelector("#themeToggle");
const roleWord = document.querySelector("#roleWord");
const heroCanvas = document.querySelector("#heroCanvas");
const navLinks = Array.from(document.querySelectorAll(".edge-nav a[href^='#']"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const savedTheme = localStorage.getItem(storageKey);
root.dataset.theme = savedTheme || "dark";

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem(storageKey, nextTheme);
});

const roles = [
  "full-stack craft",
  "ML systems",
  "computer vision",
  "systems thinking",
  "clear teaching"
];
let roleIndex = 0;

// Shared abort token — replaced each cycle so any in-flight call stops itself
let typeAbortToken = { cancelled: false };

const typeRole = async (word) => {
  if (!roleWord) return;

  // Cancel the previous call and claim a fresh token for this one
  typeAbortToken.cancelled = true;
  const token = { cancelled: false };
  typeAbortToken = token;

  while (roleWord.textContent.length) {
    if (token.cancelled) return;
    roleWord.textContent = roleWord.textContent.slice(0, -1);
    await new Promise((resolve) => window.setTimeout(resolve, 35));
  }

  for (const letter of word) {
    if (token.cancelled) return;
    roleWord.textContent += letter;
    await new Promise((resolve) => window.setTimeout(resolve, 52));
  }
};

if (roleWord && !reduceMotion) {
  window.setInterval(() => {
    roleIndex = (roleIndex + 1) % roles.length;
    typeRole(roles[roleIndex]);
  }, 2800);
}

const navObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-35% 0px -45% 0px", threshold: [0.1, 0.24, 0.45] }
);

sections.forEach((section) => navObserver.observe(section));

const revealObserver = new IntersectionObserver(
  (entries) => {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting);

    visibleEntries.forEach((entry, index) => {
      const explicitDelay = entry.target.dataset.revealDelay;
      const delay = explicitDelay !== undefined ? Number(explicitDelay) : index * 90;
      entry.target.style.setProperty("--reveal-delay", `${delay}ms`);
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const fadeBlobOnScroll = () => {
  const progress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.72));
  root.style.setProperty("--blob-opacity", String(1 - progress));
};

window.addEventListener("scroll", fadeBlobOnScroll, { passive: true });
fadeBlobOnScroll();

const drawHeroBlob = () => {
  if (!heroCanvas || reduceMotion) {
    return;
  }

  const context = heroCanvas.getContext("2d");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let lastTime = 0;

  // Pre-initialise each petal with independent properties so none share phase
  const PETAL_COUNT = 38;
  const petals = Array.from({ length: PETAL_COUNT }, (_, i) => ({
    x: (i * 0.23 + 0.04) % 1,                        // 0-1 fraction of width
    y: (i * 0.17 + 0.03) % 1,                        // spread across full height on load
    vy: 0.000055 + (i * 7919 % 97) / 97 * 0.000065,  // px/ms per unit height, varied
    swFreq: 0.00042 + (i * 6271 % 89) / 89 * 0.00055,
    swAmp: 10 + (i * 9001 % 83) / 83 * 22,
    swPhase: (i * 1.618) % (Math.PI * 2),
    size: 3.2 + (i * 7151 % 79) / 79 * 5.2,
    rot: (i * 2.399) % (Math.PI * 2),
    rotSpeed: ((i * 3571 % 73) / 73 - 0.5) * 0.0018,
    alpha: 0.32 + (i * 4447 % 61) / 61 * 0.38,
  }));

  const resize = () => {
    const bounds = heroCanvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width));
    height = Math.max(1, Math.floor(bounds.height));
    heroCanvas.width = Math.floor(width * pixelRatio);
    heroCanvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const render = (time) => {
    const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
    lastTime = time;

    context.clearRect(0, 0, width, height);
    const dark = root.dataset.theme !== "light";
    const centerX = width * 0.63;
    const centerY = height * 0.5;
    const radius = Math.min(width, height) * 0.42;
    const gradient = context.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.25);

    if (dark) {
      gradient.addColorStop(0, "rgba(243, 167, 188, 0.54)");
      gradient.addColorStop(0.5, "rgba(142, 87, 104, 0.34)");
      gradient.addColorStop(1, "rgba(10, 12, 15, 0)");
    } else {
      gradient.addColorStop(0, "rgba(200, 95, 127, 0.38)");
      gradient.addColorStop(0.55, "rgba(183, 121, 47, 0.18)");
      gradient.addColorStop(1, "rgba(243, 241, 235, 0)");
    }

    context.beginPath();
    const points = 124;
    for (let i = 0; i <= points; i += 1) {
      const angle = (Math.PI * 2 * i) / points;
      const jag =
        Math.sin(angle * 5 + time * 0.0008) * 44 +
        Math.cos(angle * 9 - time * 0.0007) * 26 +
        Math.sin(angle * 17 + time * 0.00045) * 14;
      const x = centerX + Math.cos(angle) * (radius + jag);
      const y = centerY + Math.sin(angle) * (radius * 0.82 + jag * 0.72);
      if (i === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
    }
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    context.globalAlpha = dark ? 0.3 : 0.22;
    for (let ring = 0; ring < 8; ring += 1) {
      context.beginPath();
      const ringRadius = radius * (0.35 + ring * 0.08);
      for (let i = 0; i <= points; i += 1) {
        const angle = (Math.PI * 2 * i) / points;
        const wave = Math.sin(angle * 4 + time * 0.001 + ring) * 18;
        const x = centerX + Math.cos(angle) * (ringRadius + wave);
        const y = centerY + Math.sin(angle) * (ringRadius * 0.72 + wave);
        if (i === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
      }
      context.strokeStyle = dark ? "rgba(243, 167, 188, 0.32)" : "rgba(200, 95, 127, 0.3)";
      context.lineWidth = 1;
      context.stroke();
    }
    context.globalAlpha = 1;

    // Update and draw petals — delta-time physics, no modulo burst
    petals.forEach((p) => {
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;

      // Recycle smoothly at top with a fresh random x when petal exits bottom
      if (p.y > 1.08) {
        p.y = -0.06 - Math.random() * 0.08;
        p.x = 0.02 + Math.random() * 0.96;
      }

      const sway = Math.sin(time * p.swFreq + p.swPhase) * p.swAmp;
      const px = p.x * width + sway;
      const py = p.y * height;
      const sz = p.size;

      context.globalAlpha = dark ? p.alpha : p.alpha * 0.72;
      context.save();
      context.translate(px, py);
      context.rotate(p.rot);

      // Petal body
      context.beginPath();
      context.ellipse(0, 0, sz * 0.52, sz, 0, 0, Math.PI * 2);
      context.fillStyle = dark ? "rgba(255, 197, 213, 0.9)" : "rgba(200, 95, 127, 0.85)";
      context.fill();

      // Petal highlight
      context.beginPath();
      context.ellipse(sz * 0.18, -sz * 0.32, sz * 0.2, sz * 0.44, 0, 0, Math.PI * 2);
      context.fillStyle = dark ? "rgba(255, 226, 205, 0.55)" : "rgba(255, 232, 213, 0.6)";
      context.fill();

      context.restore();
    });
    context.globalAlpha = 1;

    animationFrame = window.requestAnimationFrame(render);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  animationFrame = window.requestAnimationFrame(render);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      lastTime = 0; // reset dt so no position jump on resume
      resize();
      animationFrame = window.requestAnimationFrame(render);
    }
  });
};

drawHeroBlob();

const portalGate = document.querySelector("#portalGate");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingBar = document.querySelector("#loadingBar");

if (portalGate && loadingOverlay && loadingBar) {
  portalGate.addEventListener("click", (e) => {
    e.preventDefault();
    const dest = portalGate.getAttribute("href");

    loadingOverlay.classList.add("is-active");
    loadingOverlay.removeAttribute("aria-hidden");

    // Trigger bar fill on next frame so transition fires
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        loadingBar.style.width = "100%";
      });
    });

    // Navigate once the bar finishes (2.4s fill + 0.2s buffer)
    window.setTimeout(() => {
      window.location.href = dest;
    }, 2650);
  });
}

if (!reduceMotion) {
  document.querySelectorAll(".project-copy").forEach((card) => {
    let tx = 0, ty = 0, cx = 0, cy = 0, lift = 0, targetLift = 0;
    let raf = null;
    let hovered = false;

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      cx = lerp(cx, tx, 0.09);
      cy = lerp(cy, ty, 0.09);
      lift = lerp(lift, targetLift, 0.07);

      card.style.transform = `perspective(1000px) rotateX(${(-cy * 4.5).toFixed(3)}deg) rotateY(${(cx * 5.5).toFixed(3)}deg) translateY(${(-lift * 7).toFixed(3)}px)`;

      const moving =
        Math.abs(cx - tx) > 0.002 ||
        Math.abs(cy - ty) > 0.002 ||
        Math.abs(lift - targetLift) > 0.002;

      if (hovered || moving) {
        raf = window.requestAnimationFrame(tick);
      } else {
        card.style.transform = "";
        raf = null;
      }
    };

    const start = () => { if (!raf) raf = window.requestAnimationFrame(tick); };

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      tx = (e.clientX - (rect.left + rect.width * 0.5)) / (rect.width * 0.5);
      ty = (e.clientY - (rect.top + rect.height * 0.5)) / (rect.height * 0.5);
      card.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
      card.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
      start();
    });

    card.addEventListener("mouseenter", () => {
      hovered = true;
      targetLift = 1;
      card.style.setProperty("--spot-op", "1");
      start();
    });

    card.addEventListener("mouseleave", () => {
      hovered = false;
      tx = 0;
      ty = 0;
      targetLift = 0;
      card.style.setProperty("--spot-op", "0");
      start();
    });
  });
}
