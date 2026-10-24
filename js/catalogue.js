// What the florist and flower pages need to know about each flower's colours.

import { periodForHour } from "./messages.js";

// A variety's main colours: the first two in its list (petals, then edges or tips).
function tones(variety) {
  return Object.values(variety)
    .filter((v) => typeof v === "string" && v.startsWith("#"))
    .slice(0, 2);
}

// Every colour a flower comes in: each variety, then each mix. `id` is the
// short form used in the page address (v0, v1 … m0, m1 …).
export function colours(flower) {
  const out = flower.varieties.map((v, i) => {
    const [a, b = a] = tones(v);
    return { id: `v${i}`, name: v.name, choice: { variety: i }, swatch: `radial-gradient(circle at 35% 30%, ${b}, ${a} 70%)` };
  });
  (flower.mixes ?? []).forEach((m, i) => {
    const parts = m.of.map((k) => tones(flower.varieties[k])[0]);
    const stops = parts.map((c, k) => `${c} ${(k * 360) / parts.length}deg ${((k + 1) * 360) / parts.length}deg`);
    out.push({ id: `m${i}`, name: m.name, choice: { mix: i }, mix: true, swatch: `conic-gradient(${stops.join(", ")})` });
  });
  return out;
}

export const nowPeriod = () => periodForHour(new Date().getHours());
