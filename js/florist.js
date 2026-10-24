// The florist page: a tile for every flower, each showing a small bouquet in its
// first colour. A tile's bouquet sways while you hover over it.

import { buildBouquet } from "./scene/bouquet.js";
import { BouquetStage, reducedMotion } from "./scene/stage.js";
import { flowers } from "./flowers/index.js";
import { applySky, LIGHTS } from "./sky.js";
import { colours, nowPeriod } from "./catalogue.js";
import { unlock } from "./pin.js";

await unlock();

const FPS = 15;

// The sky follows the time, but the tiles are lit evenly, like product photos,
// so every flower is easy to see; the flower page shows them at other times.
applySky(nowPeriod());
const light = LIGHTS.afternoon;
const grid = document.getElementById("grid");
const tiles = new Map(); // tile element -> its stage, once built

function tile(flower) {
  const li = document.createElement("li");
  const options = colours(flower);
  const count = flower.varieties.length;
  const mixes = options.length - count;
  li.innerHTML = `
    <a class="tile" href="flower.html?f=${flower.id}">
      <div class="stage">
        <canvas class="glow" aria-hidden="true"></canvas>
        <canvas class="art" aria-hidden="true"></canvas>
      </div>
      <h2></h2>
      <p>${count} colours${mixes ? ` · ${mixes} mixes` : ""}</p>
      <div class="dots" aria-hidden="true"></div>
    </a>`;
  li.querySelector("h2").textContent = flower.name;
  const dots = li.querySelector(".dots");
  for (const c of options.filter((o) => !o.mix)) {
    const dot = document.createElement("span");
    dot.style.setProperty("--swatch", c.swatch);
    dots.append(dot);
  }
  li.flower = flower;
  return li;
}

// Build a tile's bouquet the first time it scrolls into view.
function build(li) {
  const box = li.querySelector(".stage");
  const stage = new BouquetStage(box, li.querySelector(".art"), li.querySelector(".glow"), { font: () => 5 });
  stage.light = light;
  stage.setMesh(buildBouquet(`${li.flower.id}|gallery`, li.flower, { variety: 0 }).mesh);
  stage.frame(0, 0);
  stage.bloom();
  tiles.set(li, stage);
}

for (const flower of flowers) grid.append(tile(flower));

const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || tiles.has(e.target)) continue;
      build(e.target);
      seen.unobserve(e.target);
    }
  },
  { rootMargin: "200px" },
);
for (const li of grid.children) seen.observe(li);

// ---- sway the tile under the pointer (or focused) ----

let active = null;
let start = 0;
for (const li of grid.children) {
  const a = li.querySelector("a");
  const on = () => {
    active = li;
    start = performance.now();
  };
  const off = () => {
    if (active !== li) return;
    active = null;
    tiles.get(li)?.frame(0, 0);
  };
  a.addEventListener("pointerenter", on);
  a.addEventListener("focus", on);
  a.addEventListener("pointerleave", off);
  a.addEventListener("blur", off);
}

let last = 0;
function loop(time) {
  if (active && time - last >= 1000 / FPS) {
    last = time;
    // start from facing forward, so the bouquet doesn't jump
    tiles.get(active)?.frame(time - start);
  }
  requestAnimationFrame(loop);
}
if (!reducedMotion) requestAnimationFrame(loop);

new ResizeObserver(() => {
  for (const stage of tiles.values()) {
    stage.layout();
    stage.frame(0, 0);
  }
}).observe(grid);
document.fonts?.ready.then(() => tiles.forEach((s) => s.frame(0, 0)));
