import { buildBouquet } from "./scene/bouquet.js";
import { AsciiRenderer } from "./scene/renderer.js";
import { flowerForDay } from "./flowers/index.js";
import { PERIODS, periodForHour } from "./messages.js";
import { seeded, pick } from "./random.js";

// The bouquet changes at 5 AM, when the morning starts, not at midnight.
const NEW_BOUQUET_HOUR = 5;

// Light follows the sun and moon drawn in the sky behind the card.
const LIGHTS = {
  morning: { dir: [-0.75, 0.4, 0.55], color: [1.0, 0.9, 0.78], ambient: 0.3, ambientColor: [0.95, 0.85, 0.85] },
  afternoon: { dir: [0.35, 0.85, 0.55], color: [1.0, 0.98, 0.94], ambient: 0.32, ambientColor: [0.85, 0.9, 1.0] },
  evening: { dir: [0.8, 0.25, 0.5], color: [1.0, 0.72, 0.5], ambient: 0.25, ambientColor: [0.75, 0.65, 0.9] },
  night: { dir: [0.55, 0.65, 0.5], color: [0.72, 0.8, 1.0], ambient: 0.22, ambientColor: [0.55, 0.6, 0.85] },
};

const FPS = 15;
const SWAY = 0.3; // radians the bouquet turns either way

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = $("art");
const ctx = canvas.getContext("2d");

// Preview any day or time with ?date=2026-11-02&hour=19
function currentTime() {
  const d = new Date();
  const date = params.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, day] = date.split("-").map(Number);
    d.setFullYear(y, m - 1, day);
  }
  const hour = params.get("hour");
  if (hour !== null && hour !== "" && !Number.isNaN(Number(hour))) {
    d.setHours(Math.max(0, Math.min(23, Number(hour))), 0, 0, 0);
  }
  return d;
}

function bouquetDay(now) {
  const d = new Date(now);
  if (d.getHours() < NEW_BOUQUET_HOUR) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return {
    key: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    number: Math.floor(Date.UTC(y, m - 1, day) / 86400000),
  };
}

// ---- drawing ----

const stage = { renderer: null, box: null, light: LIGHTS.morning, font: 10, cellW: 6, cellH: 12, dpr: 1, view: null };
const colorCache = new Map();

// Keep the page exactly the height of what's visible (mobile address bars
// grow and shrink the viewport without the CSS units always following).
function fitViewport() {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
}

function layout() {
  if (!stage.renderer) return;
  const box = $("stage");
  const width = box.clientWidth;
  const height = box.clientHeight;
  if (!width || !height) return;
  const font = Math.min(width, height) < 420 ? 6 : 8;
  const cellW = font * 0.6;
  const cellH = font * 1.2;
  const cols = Math.max(20, Math.floor(width / cellW));
  const rows = Math.max(10, Math.floor(height / cellH));
  const wpx = cols * cellW;
  const hpx = rows * cellH;
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  canvas.style.width = `${wpx}px`;
  canvas.style.height = `${hpx}px`;
  canvas.width = Math.round(wpx * dpr);
  canvas.height = Math.round(hpx * dpr);
  Object.assign(stage, { font, cellW, cellH, dpr });
  stage.view = {
    cellW,
    cellH,
    // fit the bouquet: the side-to-side reach is generous because it sways
    scale: Math.min(wpx / ((stage.box.maxX - stage.box.minX) * 0.82), hpx / ((stage.box.maxY - stage.box.minY) * 1.06)),
    cx: wpx / 2,
    cy: hpx / 2,
    yMid: (stage.box.maxY + stage.box.minY) / 2,
    camDist: 9,
    pitch: 0.15,
    yaw: 0,
  };
  stage.renderer.resize(cols, rows);
}

function paint() {
  const r = stage.renderer;
  ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${stage.font}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
  ctx.textBaseline = "top";
  const yOffset = (stage.cellH - stage.font) / 2;
  for (let row = 0; row < r.rows; row++) {
    for (let col = 0; col < r.cols; col++) {
      const idx = row * r.cols + col;
      const ch = r.chars[idx];
      if (ch === " ") continue;
      const o = idx * 3;
      const key = ((r.rgb[o] >> 2) << 12) | ((r.rgb[o + 1] >> 2) << 6) | (r.rgb[o + 2] >> 2);
      let style = colorCache.get(key);
      if (!style) {
        style = `rgb(${r.rgb[o]},${r.rgb[o + 1]},${r.rgb[o + 2]})`;
        colorCache.set(key, style);
      }
      ctx.fillStyle = style;
      ctx.fillText(ch, col * stage.cellW, row * stage.cellH + yOffset);
    }
  }
}

function frame(time) {
  if (!stage.renderer || !stage.view) return;
  stage.view.yaw = reducedMotion ? 0 : SWAY * Math.sin(time / 1000 * 0.35);
  stage.renderer.render(stage.view, stage.light);
  paint();
}

let last = 0;
function loop(time) {
  if (!document.hidden && time - last >= 1000 / FPS) {
    last = time;
    frame(time);
  }
  if (!reducedMotion) requestAnimationFrame(loop);
}

// ---- page content ----

let shown = { day: null, period: null };

function render() {
  const now = currentTime();
  const day = bouquetDay(now);
  const period = periodForHour(now.getHours());
  if (shown.day === day.key && shown.period === period) return;

  const { greeting, notes } = PERIODS[period];
  const note = pick(seeded(`${day.key}|${period}`), notes);

  document.body.dataset.period = period;
  document.title = `${greeting} · Daily Flowers`;
  $("date").textContent = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("greeting").textContent = greeting;
  $("note").textContent = note;
  stage.light = LIGHTS[period];

  if (shown.day !== day.key) {
    const flower = flowerForDay(day.number);
    const bouquet = buildBouquet(`${flower.id}|${day.key}`, flower);
    stage.renderer = new AsciiRenderer(bouquet.mesh);
    stage.box = bouquet.box;
    layout();
    canvas.setAttribute("aria-label", `ASCII art bouquet of ${bouquet.title} wrapped in ${bouquet.wrapName}`);
    $("caption").textContent = `Today's bouquet: ${bouquet.title}, wrapped in ${bouquet.wrapName} with ${/^[aeiou]/.test(bouquet.ribbonName) ? "an" : "a"} ${bouquet.ribbonName} ribbon`;

    canvas.classList.remove("bloom");
    void canvas.offsetWidth; // restart the fade-in
    canvas.classList.add("bloom");
  }

  shown = { day: day.key, period };
  frame(performance.now());
}

$("copy").addEventListener("click", async () => {
  const text = `${stage.renderer.text()}\n\n${$("greeting").textContent}! ${$("note").textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "copied ✿";
  } catch {
    $("copy").textContent = "couldn't copy";
  }
  setTimeout(() => ($("copy").textContent = "copy bouquet"), 1800);
});

let resizeTimer;
function onResize() {
  fitViewport();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    layout();
    frame(performance.now());
  }, 120);
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", onResize);
window.visualViewport?.addEventListener("resize", onResize);
// the card's text can change height (new note, font load), so watch the stage too
new ResizeObserver(() => onResize()).observe($("stage"));

fitViewport();

render();
setInterval(render, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
// redraw once the web font is ready so the first frame isn't in a fallback font
document.fonts?.ready.then(() => frame(performance.now()));
requestAnimationFrame(loop);
