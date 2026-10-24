// Carnations, modelled in 3D. Each bloom is a frilly pom-pom of petals with
// finely toothed edges, standing out of a long green tube (the calyx).
// Picotee carnations have a thin band of a second colour round every edge.

import { sum, norm, basis, cross, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// Rings run from the middle outwards: `n` petals, starting `r0` out, `len`
// long, opening out by `spread` and standing up by `rise` (fractions of the
// flower size). `teeth` is how many notches cut each petal's edge.
const RINGS = [
  { n: 5, r0: 0.02, len: 0.16, spread: 0.3, rise: 0.75 },
  { n: 7, r0: 0.04, len: 0.2, spread: 0.55, rise: 0.6 },
  { n: 8, r0: 0.06, len: 0.24, spread: 0.8, rise: 0.45 },
  { n: 9, r0: 0.08, len: 0.27, spread: 1.0, rise: 0.3 },
  { n: 8, r0: 0.1, len: 0.29, spread: 1.15, rise: 0.12 },
];

// Light, clear colours so they read against the dark tinted glass card.
// `rim` is how strongly the `edge` colour bands the petal edges (picotee).
const varieties = [
  { name: "Red carnations", petal: "#ff4f5e", edge: "#ff7e88", heart: "#d83040", rim: 0.3 },
  { name: "Pink carnations", petal: "#ff9cc4", edge: "#ffc6dc", heart: "#ff6a9e", rim: 0.4 },
  { name: "White carnations", petal: "#fbf8f2", edge: "#ffffff", heart: "#eee6d8", rim: 0.3 },
  { name: "Yellow carnations", petal: "#ffdf5a", edge: "#fff0a0", heart: "#ffbe30", rim: 0.3 },
  { name: "Moonlight carnations", petal: "#c8a8ff", edge: "#e4d4ff", heart: "#a37ef0", rim: 0.4 },
  { name: "Picotee carnations", petal: "#fbf6f2", edge: "#ff4a6e", heart: "#f4e0e4", rim: 1 },
  { name: "Peach carnations", petal: "#ffb894", edge: "#ffdcc4", heart: "#ff9670", rim: 0.4 },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Red & white carnations", of: [0, 2] },
  { name: "Pink & picotee carnations", of: [1, 5] },
  { name: "Sunny carnations", of: [3, 6] },
  { name: "Sweet mix of carnations", of: [1, 4, 2] },
  { name: "Peach & yellow carnations", of: [6, 3, 2] },
];

const CALYX = hexToRgb("#6fa858");
const CALYX_PALE = hexToRgb("#a8cc90");
const TAU = Math.PI * 2;

// A sawtooth from 0 to 1, for the notches in the petal edges.
const saw = (x) => Math.abs(((x % 1) + 1) % 1 - 0.5) * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const H = hexToRgb(v.heart);

  return {
    // t runs from the petal's base (0) to its edge (1); s across it (-1..1)
    petal: mesh.material({
      color(t, s, tag) {
        const f = Math.floor((tag % 100) / 10) / RINGS.length;
        let c = mixRgb(H, P, smoothstep(0, 0.6, f));
        c = mixRgb(c, [c[0] * 0.62, c[1] * 0.55, c[2] * 0.58], (1 - smoothstep(0.1, 0.6, t)) * 0.55);
        c = mixRgb(c, E, smoothstep(0.78, 0.95, t) * v.rim);
        const k = 0.9 + 0.2 * hash3(tag, 6, 2);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.15,
      shine: 12,
      translucent: 0.4,
      outline: 0.025,
    }),
    // t runs down the calyx from its rim (0) to the stem (1)
    calyx: mesh.material({ color: (t) => mixRgb(CALYX, CALYX_PALE, (1 - t) * 0.35), ks: 0.35, shine: 20 }),
    bud: mesh.material({ color: (t) => mixRgb(CALYX, P, smoothstep(0.75, 0.98, t) * 0.8), ks: 0.35, shine: 20, translucent: 0.2 }),
  };
}

// The calyx: a long, narrow tube from `base` along `a`, with pointed teeth round its rim.
function calyx(mesh, mat, { base, a, e1, e2, len, R, tag }) {
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      // narrow at the stem, widening a little to the rim; five teeth on top
      const tooth = smoothstep(0.85, 1, t) * 0.08 * len * (1 - saw((phi / TAU) * 5));
      const r = R * (0.55 + 0.45 * Math.pow(t, 0.6));
      return sum([base, 1], [a, len * t + tooth], [e1, Math.cos(phi) * r], [e2, Math.sin(phi) * r]);
    },
    6,
    14,
    mat,
    tag,
    (t) => [1 - t, 0],
  );
}

// One carnation facing `axis`.
function bloom(mesh, mats, v, { center, axis, size: slot, rnd, tag }) {
  // carnations are small; this keeps them apart in the arrangement
  const size = slot * 0.75;
  const a = norm(sum([norm(axis), 1], [[0, 1, 0], 0.3]));
  const [e1, e2] = basis(a);
  const radial = (phi) => sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
  const twist = rnd() * TAU;
  const base = (tag + 1) * 1000;

  RINGS.forEach((ring, k) => {
    const span = (TAU / ring.n) * 1.55;
    const offset = twist + (k % 2 ? Math.PI / ring.n : 0) + k * 0.3;
    for (let j = 0; j < ring.n; j++) {
      const phi0 = offset + (j * TAU) / ring.n + (rnd() - 0.5) * 0.3;
      const L = size * ring.len * (0.9 + rnd() * 0.2);
      const r0 = size * ring.r0;
      const seed = rnd() * 10;
      const teeth = 5 + Math.floor(rnd() * 3);
      mesh.surface(
        (u, t0) => {
          const s = u * 2 - 1;
          // a fan-shaped petal with a notched, toothed edge
          const t = t0 * (1 - 0.18 * saw((s * teeth) / 2 + seed));
          const phi = phi0 + s * span * 0.5;
          // frilled: the edge waves up and down
          const frill = size * 0.035 * Math.sin(s * 9 + seed) * t * t;
          const rho = r0 + ring.spread * L * t;
          const h = ring.rise * L * t - size * 0.03 * k + frill;
          return sum([center, 1], [a, h], [radial(phi), rho]);
        },
        10,
        4,
        mats.petal,
        base + (k + 1) * 10 + j,
        (u, t0) => [t0, u * 2 - 1],
      );
    }
  });

  const len = size * 0.42;
  calyx(mesh, mats.calyx, {
    base: sum([center, 1], [a, -len - size * 0.1]),
    a,
    e1,
    e2,
    len,
    R: size * 0.08,
    tag: base + 999,
  });
}

// A bud: a slim green spindle, the petals' colour just showing at the tip.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const L = size * 0.85;
  const R = size * 0.11;
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.6) * (1 + 0.05 * Math.cos(5 * phi));
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    10,
    mats.bud,
    tag,
  );
  // two small leaves where the bud meets the stem
  const r = e1;
  const b = cross(a, r);
  for (const side of [-1, 1]) {
    mesh.surface(
      (t, v01) => {
        const s = v01 * 2 - 1;
        const w = size * 0.04 * Math.sin(Math.PI * Math.pow(t, 0.6)) + 0.002;
        return sum([base, 1], [a, size * 0.25 * t], [r, side * size * 0.3 * t], [b, s * w]);
      },
      5,
      2,
      mats.calyx,
      tag,
    );
  }
}

export default {
  id: "carnations",
  name: "Carnations",
  varieties,
  mixes,
  materials,
  bloom,
  bud,
};
