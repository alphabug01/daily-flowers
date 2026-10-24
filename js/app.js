import { buildBouquet } from "./scene/bouquet.js";
import { BouquetStage, reducedMotion } from "./scene/stage.js";
import { flowerForDay } from "./flowers/index.js";
import { PERIODS, periodForHour } from "./messages.js";
import { seeded, pick } from "./random.js";
import { applySky } from "./sky.js";

// The bouquet changes at 5 AM, when the morning starts, not at midnight.
const NEW_BOUQUET_HOUR = 5;

const FPS = 15;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const canvas = $("art");
const stage = new BouquetStage($("stage"), canvas, $("glow"));

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

// Keep the page exactly the height of what's visible (mobile address bars
// grow and shrink the viewport without the CSS units always following).
function fitViewport() {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
}

let last = 0;
function loop(time) {
  if (!document.hidden && time - last >= 1000 / FPS) {
    last = time;
    stage.frame(time);
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

  document.title = `${greeting} · Daily Flowers`;
  $("date").textContent = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("greeting").textContent = greeting;
  $("note").textContent = note;
  stage.light = applySky(period, now);

  if (shown.day !== day.key) {
    const flower = flowerForDay(day.number);
    const bouquet = buildBouquet(`${flower.id}|${day.key}`, flower);
    stage.setMesh(bouquet.mesh);
    canvas.setAttribute("aria-label", `ASCII art bouquet of ${bouquet.title} wrapped in ${bouquet.wrapName}`);
    $("caption").textContent = `Today's bouquet: ${bouquet.title}, wrapped in ${bouquet.wrapName} with ${/^[aeiou]/.test(bouquet.ribbonName) ? "an" : "a"} ${bouquet.ribbonName} ribbon`;
    stage.bloom();
  }

  shown = { day: day.key, period };
  stage.frame(performance.now());
}

$("copy").addEventListener("click", async () => {
  const text = `${stage.text()}\n\n${$("greeting").textContent}! ${$("note").textContent}`;
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
    stage.layout();
    stage.frame(performance.now());
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
document.fonts?.ready.then(() => stage.frame(performance.now()));
requestAnimationFrame(loop);
