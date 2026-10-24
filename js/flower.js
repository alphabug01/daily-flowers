// One flower's page: its bouquet in any of its colours, lit for any time of
// day. The choice lives in the address, e.g. flower.html?f=tulips&c=m1&t=evening,
// so a link opens the same view.

import { buildBouquet } from "./scene/bouquet.js";
import { BouquetStage, reducedMotion } from "./scene/stage.js";
import { flowers } from "./flowers/index.js";
import { PERIODS } from "./messages.js";
import { applySky } from "./sky.js";
import { colours, nowPeriod } from "./catalogue.js";
import { unlock } from "./pin.js";

await unlock();

const FPS = 15;
const TIMES = Object.keys(PERIODS);

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const flower = flowers.find((f) => f.id === params.get("f"));
if (!flower) {
  location.replace("florist.html");
  throw new Error(`no flower called "${params.get("f")}"`);
}

const options = colours(flower);
const canvas = $("art");
const stage = new BouquetStage($("stage"), canvas, $("glow"));
const state = {
  colour: options.find((o) => o.id === params.get("c")) ?? options[0],
  time: TIMES.includes(params.get("t")) ? params.get("t") : nowPeriod(),
};

document.title = `${flower.name} · Daily Flowers`;
$("name").textContent = flower.name;

function save() {
  const q = new URLSearchParams({ f: flower.id, c: state.colour.id, t: state.time });
  history.replaceState(null, "", `?${q}`);
}

function pressed(group, value) {
  for (const b of group.children) b.setAttribute("aria-pressed", String(b.dataset.value === value));
}

function showColour() {
  const c = state.colour;
  // the wrap and ribbon go with the colour, so each one always looks the same
  const bouquet = buildBouquet(`${flower.id}|${c.id}`, flower, c.choice);
  stage.setMesh(bouquet.mesh);
  stage.frame(performance.now());
  stage.bloom();
  $("chosen").textContent = c.name;
  canvas.setAttribute("aria-label", `ASCII art bouquet of ${bouquet.title} wrapped in ${bouquet.wrapName}`);
  $("caption").textContent = `${bouquet.title}, wrapped in ${bouquet.wrapName} with ${/^[aeiou]/.test(bouquet.ribbonName) ? "an" : "a"} ${bouquet.ribbonName} ribbon`;
  pressed($("varieties"), c.id);
  pressed($("mixes"), c.id);
}

function showTime() {
  stage.light = applySky(state.time);
  stage.frame(performance.now());
  pressed($("times"), state.time);
}

for (const c of options) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.value = c.id;
  b.title = c.name;
  b.setAttribute("aria-label", c.name);
  b.style.setProperty("--swatch", c.swatch);
  b.addEventListener("click", () => {
    if (state.colour === c) return;
    state.colour = c;
    showColour();
    save();
  });
  $(c.mix ? "mixes" : "varieties").append(b);
}
if (!options.some((o) => o.mix)) {
  $("mix-label").hidden = true;
  $("mixes").hidden = true;
}

for (const t of TIMES) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.value = t;
  b.textContent = t;
  b.addEventListener("click", () => {
    state.time = t;
    showTime();
    save();
  });
  $("times").append(b);
}

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`${stage.text()}\n\n${state.colour.name} ✿`);
    $("copy").textContent = "copied ✿";
  } catch {
    $("copy").textContent = "couldn't copy";
  }
  setTimeout(() => ($("copy").textContent = "copy bouquet"), 1800);
});

showTime();
showColour();
save();

let last = 0;
function loop(time) {
  if (!document.hidden && time - last >= 1000 / FPS) {
    last = time;
    stage.frame(time);
  }
  requestAnimationFrame(loop);
}
if (!reducedMotion) requestAnimationFrame(loop);

let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    stage.layout();
    stage.frame(performance.now());
  }, 120);
}).observe($("stage"));
document.fonts?.ready.then(() => stage.frame(performance.now()));
