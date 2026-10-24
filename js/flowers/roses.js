// Roses, modelled in 3D, the way a rose is usually drawn: a tight spiral of
// petal wound round the middle, then even rings of cupped petals, each ring
// wider, more open and more curled back than the one inside. Petal edges are
// paler than their insides and every piece has its own tag, so each edge shows
// as a line and the spiral reads even when the rose is only ~20 characters wide.

import { sum, cross, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size. The centre spiral makes `turns` turns,
// `core` wide and `coreH` tall. Each ring has `n` petals starting `r0` out,
// `len` long; `spread` is how far they open outwards, `rise` how far they stand
// up towards you, `reflex` how much their edges curl back.
const SHAPES = {
  // hybrid tea: a high, pointed centre and neat, opening rings
  tea: {
    turns: 2.5, core: 0.12, coreH: 0.22,
    rings: [
      { n: 5, r0: 0.07, len: 0.3, spread: 0.3, rise: 0.95, reflex: 0.02 },
      { n: 5, r0: 0.12, len: 0.36, spread: 0.75, rise: 0.6, reflex: 0.06 },
      { n: 6, r0: 0.16, len: 0.38, spread: 1.1, rise: 0.32, reflex: 0.11 },
    ],
  },
  // garden rose (Juliet, David Austin): more, shorter rings in a full, flat cup
  garden: {
    turns: 3.2, core: 0.1, coreH: 0.14,
    rings: [
      { n: 6, r0: 0.07, len: 0.26, spread: 0.35, rise: 0.8, reflex: 0.01 },
      { n: 7, r0: 0.11, len: 0.3, spread: 0.6, rise: 0.6, reflex: 0.02 },
      { n: 8, r0: 0.15, len: 0.34, spread: 0.85, rise: 0.45, reflex: 0.03 },
      { n: 7, r0: 0.19, len: 0.36, spread: 1.05, rise: 0.3, reflex: 0.1 },
    ],
  },
};

// Light, clear colours so they read against the dark tinted glass card; the
// red is brighter than a florist's red, with deeper red only in the heart.
const varieties = [
  { name: "Red roses", shape: "tea", petal: "#ff5468", edge: "#ff98a4", heart: "#e8364e" },
  { name: "Blush roses", shape: "tea", petal: "#ffc4cc", edge: "#fff0f2", heart: "#ff9aa8" },
  { name: "White roses", shape: "tea", petal: "#fbf6ee", edge: "#ffffff", heart: "#f0e2c4" },
  { name: "Yellow roses", shape: "tea", petal: "#ffd84a", edge: "#fff2a8", heart: "#ffb02a" },
  { name: "Juliet garden roses", shape: "garden", petal: "#ffb488", edge: "#ffe2cc", heart: "#ff9060" },
  { name: "Coral roses", shape: "tea", petal: "#ff7e6e", edge: "#ffbcae", heart: "#f05a4a" },
  { name: "Lavender roses", shape: "garden", petal: "#d4b8ff", edge: "#f4ecff", heart: "#b896f0" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Red & white roses", of: [0, 2] },
  { name: "Blush & white roses", of: [1, 2] },
  { name: "Peach & blush roses", of: [4, 1] },
  { name: "Sunset roses", of: [3, 5, 4] },
  { name: "Red & blush roses", of: [0, 1] },
];

// Classic florist papers; lilac is left out, it fights the reds and yellows.
const wraps = [
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "blush tissue", paper: "#e9a7b8", tissue: "#fff4f6", pattern: "dots" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
];

const SEPAL = hexToRgb("#6fae4a");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const H = hexToRgb(v.heart);
  const rings = SHAPES[v.shape].rings.length;

  return {
    // t runs from the petal's base (0) to its edge (1); s across it (-1..1)
    petal: mesh.material({
      color(t, s, tag) {
        // tags count up in tens by ring: 0 for the centre spiral, 1.. outwards
        const f = Math.floor((tag % 100) / 10) / rings;
        let c = mixRgb(H, P, smoothstep(0, 0.6, f));
        // a pale rim and a deeper inside, so every petal edge reads as a line
        c = mixRgb(c, [c[0] * 0.6, c[1] * 0.5, c[2] * 0.5], (1 - smoothstep(0.1, 0.6, t)) * 0.65);
        c = mixRgb(c, E, smoothstep(0.62, 0.92, t) * 0.9);
        const k = 0.92 + 0.16 * hash3(tag, 4, 7);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.18,
      shine: 16,
      translucent: 0.4,
      // petals sit close together, so outline even small overlaps
      outline: 0.025,
    }),
    sepal: mesh.material({ color: (t) => mixRgb(SEPAL, [0.36, 0.55, 0.26], t * 0.5), ks: 0.25, shine: 14, translucent: 0.3 }),
    bud: mesh.material({ color: (t) => mixRgb(SEPAL, P, smoothstep(0.35, 0.7, t)), ks: 0.25, shine: 16, translucent: 0.2 }),
  };
}

// The green sepals behind a bloom or under a bud: thin, pointed, bending back.
function sepals(mesh, mat, { base, a, e1, e2, len, th0, th1, twist, tag }) {
  for (let k = 0; k < 5; k++) {
    const phi = twist + (k * TAU) / 5;
    const r = sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
    const b = cross(a, r);
    mesh.surface(
      (t, v01) => {
        const s = v01 * 2 - 1;
        const th = th0 + (th1 - th0) * t;
        const w = len * 0.16 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.8) + 0.002;
        return sum([base, 1], [a, len * t * Math.cos(th)], [r, len * t * Math.sin(th)], [b, s * w]);
      },
      6,
      2,
      mat,
      tag,
    );
  }
}

// One open rose facing `axis`.
function bloom(mesh, mats, v, { center, axis, size: slot, rnd, tag }) {
  const S = SHAPES[v.shape];
  // roses are smaller than lilies; this keeps them apart in the arrangement
  const size = slot * 0.7;
  const a = norm(axis);
  const [e1, e2] = basis(a);
  const twist = rnd() * TAU;
  const base = (tag + 1) * 1000;
  const radial = (phi) => sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);

  // the centre: one petal wound round in a spiral, cut into half turns so the
  // renderer outlines each turn against the one inside it
  const halves = Math.ceil(S.turns * 2);
  for (let h = 0; h < halves; h++) {
    const u0 = h / halves;
    const u1 = Math.min(1, (h + 1) / halves);
    mesh.surface(
      (w, t) => {
        const u = u0 + (u1 - u0) * w;
        const phi = twist + u * S.turns * TAU;
        const rho = size * S.core * (0.12 + 0.88 * u) * (1 + 0.25 * t * t * u);
        const top = size * S.coreH * (1 - 0.3 * u);
        return sum([center, 1], [a, top * t - size * 0.02], [radial(phi), rho]);
      },
      6,
      3,
      mats.petal,
      base + h,
      (w, t) => [t, w * 2 - 1],
    );
  }

  // even rings of cupped petals, each ring offset to cover the gaps of the last
  S.rings.forEach((ring, k) => {
    const outer = k === S.rings.length - 1;
    // each petal overlaps its neighbours; the outer ring less, so its rim scallops
    const span = (TAU / ring.n) * (outer ? 1.22 : 1.35);
    const round = outer ? 0.32 : 0.2;
    const offset = twist + (k % 2 ? Math.PI / ring.n : 0);
    for (let j = 0; j < ring.n; j++) {
      const phi0 = offset + (j * TAU) / ring.n + (rnd() - 0.5) * 0.15;
      const L = size * ring.len * (0.94 + rnd() * 0.12);
      const r0 = size * ring.r0;
      const reflex = size * ring.reflex;
      const sink = size * 0.05 * k; // outer rings start lower on the flower
      mesh.surface(
        (u, t0) => {
          const s = u * 2 - 1;
          // a rounded top edge: the sides of the petal are a little shorter
          const t = t0 * (1 - round * s * s);
          const phi = phi0 + s * span * 0.5;
          const rho = r0 + ring.spread * L * t * t + reflex * 4 * Math.pow(t, 4);
          const h = ring.rise * L * t - sink - reflex * 2 * Math.pow(t, 3);
          return sum([center, 1], [a, h], [radial(phi), rho]);
        },
        8,
        5,
        mats.petal,
        base + (k + 1) * 10 + j,
        (u, t0) => [t0, u * 2 - 1],
      );
    }
  });

  sepals(mesh, mats.sepal, {
    base: sum([center, 1], [a, -size * 0.14]),
    a,
    e1,
    e2,
    len: size * 0.3,
    th0: 1.7,
    th1: 2.4,
    twist: twist + 0.3,
    tag: base + 999,
  });
}

// A bud: a closed, pointed swirl of petals in a cup of sepals.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const L = size * 0.8;
  const R = size * 0.2;
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      // egg-shaped, coming to a point, with a twist where the petals wrap
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.8) * (1 + 0.06 * Math.sin(3 * phi + t * 6));
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    14,
    mats.bud,
    tag,
  );
  sepals(mesh, mats.sepal, { base: sum([base, 1], [a, L * 0.12]), a, e1, e2, len: size * 0.45, th0: 0.35, th1: 0.9, twist: 0, tag });
}

export default {
  id: "roses",
  name: "Roses",
  varieties,
  mixes,
  wraps,
  materials,
  bloom,
  bud,
};
