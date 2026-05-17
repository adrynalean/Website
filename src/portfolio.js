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
  "machine learning",
  "computer vision",
  "systems thinking",
  "clear teaching"
];
let roleIndex = 0;

const typeRole = async (word) => {
  if (!roleWord) {
    return;
  }

  while (roleWord.textContent.length) {
    roleWord.textContent = roleWord.textContent.slice(0, -1);
    await new Promise((resolve) => window.setTimeout(resolve, 35));
  }

  for (const letter of word) {
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
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
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

  const resize = () => {
    const bounds = heroCanvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width));
    height = Math.max(1, Math.floor(bounds.height));
    heroCanvas.width = Math.floor(width * pixelRatio);
    heroCanvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const render = (time) => {
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

      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
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
        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = dark ? "rgba(243, 167, 188, 0.32)" : "rgba(200, 95, 127, 0.3)";
      context.lineWidth = 1;
      context.stroke();
    }
    context.globalAlpha = 1;

    context.globalAlpha = dark ? 0.72 : 0.48;
    for (let petal = 0; petal < 42; petal += 1) {
      const speed = 0.000045 * (petal % 7 + 5);
      const drift = time * speed;
      const sway = Math.sin(time * 0.001 + petal * 1.7) * 18;
      const x = (width * ((petal * 0.097 + drift * 0.42) % 1.18)) - width * 0.1 + sway;
      const y = (height * ((petal * 0.161 + drift * 1.9) % 1.12)) - height * 0.08;
      const size = 3.5 + (petal % 6);
      context.save();
      context.translate(x, y);
      context.rotate(time * 0.0007 + petal);
      context.beginPath();
      context.ellipse(0, 0, size * 0.55, size, 0, 0, Math.PI * 2);
      context.fillStyle = dark ? "rgba(255, 197, 213, 0.48)" : "rgba(200, 95, 127, 0.42)";
      context.fill();
      context.beginPath();
      context.ellipse(size * 0.2, -size * 0.35, size * 0.22, size * 0.48, 0, 0, Math.PI * 2);
      context.fillStyle = dark ? "rgba(255, 226, 205, 0.28)" : "rgba(255, 232, 213, 0.34)";
      context.fill();
      context.restore();
    }
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
      resize();
      animationFrame = window.requestAnimationFrame(render);
    }
  });
};

drawHeroBlob();
