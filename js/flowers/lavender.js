// Lavender, modelled in 3D. Each "bloom" is a small bunch of spikes, and each
// spike is a stack of whorls of tiny florets on a thin grey-green stalk.
// French lavender also gets its little "rabbit ear" bracts on top.

import { sum, cross, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// How each kind of lavender grows its spikes, as fractions of the flower size.
// `len` is the flowering part, `radius` its thickness, `whorls` how many rings
// of florets, `stalk` the bare stem between the bunch and the flowers.
const SHAPES = {
  // English lavender: slim spikes, lower whorls spaced apart
  english: { len: 0.95, radius: 0.105, whorls: 9, stalk: 0.32, spikes: [4, 6] },
  // lavandin (Provence): long, tapering spikes
  provence: { len: 1.2, radius: 0.095, whorls: 11, stalk: 0.38, spikes: [4, 6] },
  // French (Spanish) lavender: short, plump heads topped with bracts
  french: { len: 0.55, radius: 0.15, whorls: 6, stalk: 0.28, spikes: [3, 4], ears: true },
};

// Colours are kept light and clear so they read against the dark, purple-tinted
// glass card (which shares their hue): florets at least ~3.5:1, most 4.5:1+.
const varieties = [
  { name: "English lavender", shape: "english", floret: "#bfa3ff", calyx: "#9a7ce8", bud: "#a493d6" },
  { name: "Hidcote lavender", shape: "english", floret: "#a985ff", calyx: "#9470f2", bud: "#9a84d8" },
  { name: "Munstead lavender", shape: "english", floret: "#d2cbff", calyx: "#aea4f0", bud: "#b4acdc" },
  { name: "French lavender", shape: "french", floret: "#ac88f8", calyx: "#9070e8", bud: "#9a88c8", ears: "#f2c2ff" },
  { name: "White lavender", shape: "english", floret: "#f8f6fc", calyx: "#dcd8ec", bud: "#d6d9cc" },
  { name: "Pink lavender", shape: "english", floret: "#ffc2e3", calyx: "#e09cc2", bud: "#d4aab8" },
  { name: "Provence lavender", shape: "provence", floret: "#cdb4ff", calyx: "#ab92f0", bud: "#ab9ed0" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Purple & white lavender", of: [0, 4] },
  { name: "Hidcote & Munstead lavender", of: [1, 2] },
  { name: "Pink & white lavender", of: [5, 4] },
  { name: "French & English lavender", of: [3, 0] },
  { name: "Lavender field mix", of: [6, 1, 4] },
];

// Papers that set off purple: warm neutrals, soft greens and a buttery yellow
// (no lilac or violet, which would swallow the flowers).
const wraps = [
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
  { name: "butter yellow paper", paper: "#ecd88c", tissue: "#fffaf0", pattern: "dots" },
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
];

const ribbons = [
  { name: "twine", color: "#b89466" },
  { name: "ivory", color: "#f8f3e6" },
  { name: "gold", color: "#f2b632" },
  { name: "sage", color: "#8fae7e" },
];

const STALK = hexToRgb("#7f9a6a");
const fract = (x) => x - Math.floor(x);

function materials(mesh, v) {
  const F = hexToRgb(v.floret);
  const C = hexToRgb(v.calyx);
  const B = hexToRgb(v.bud);
  const E = v.ears ? hexToRgb(v.ears) : F;

  return {
    // a runs from the base of the spike (0) to the tip (1); b around it
    spike: mesh.material({
      color(a, b, tag) {
        // florets open from the bottom up, so the tip is mostly closed calyx
        const open = 0.8 * (1 - smoothstep(0.62, 1, a));
        const h = hash3(Math.floor(a * 46), Math.floor(b * 7), tag);
        let c = h < open ? F : mixRgb(C, F, h * 0.35);
        c = mixRgb(c, STALK, (1 - smoothstep(0, 0.08, a)) * 0.6);
        const k = 0.9 + 0.2 * hash3(tag, 3, 9);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.12,
      shine: 8,
    }),
    floret: mesh.material({ color: () => F, ks: 0.05, shine: 4, glow: 0.05 }),
    stalk: mesh.material({ color: () => STALK, ks: 0.15, shine: 8 }),
    ears: mesh.material({
      color: (t) => mixRgb(E, [1, 0.92, 1], t * 0.3),
      ks: 0.2,
      shine: 12,
      translucent: 0.5,
    }),
    bud: mesh.material({
      color: (a, b, tag) => mixRgb(STALK, B, smoothstep(0.05, 0.4, a) * (0.75 + 0.25 * hash3(Math.floor(a * 40), Math.floor(b * 6), tag))),
      ks: 0.1,
      shine: 6,
    }),
  };
}

// One spike of florets along `dir`, starting at `base`.
function spike(mesh, mat, { base, dir, len, radius, whorls, bend, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const at = (t) => sum([base, 1], [a, len * t], [bend, len * 0.12 * t * t]);
  mesh.surface(
    (t, v) => {
      const phi = v * Math.PI * 2;
      // whorls bunch up towards the tip and spread apart near the bottom
      const phase = whorls * Math.pow(t, 1.35);
      const bump = Math.pow(Math.sin(Math.PI * fract(phase)), 0.5);
      const gap = 0.2 + 0.55 * smoothstep(0.1, 0.5, t);
      const taper = (1 - Math.pow(t, 3)) * (0.8 + 0.2 * smoothstep(0, 0.35, t));
      const wobble = 1 + 0.14 * Math.sin(5 * phi + Math.floor(phase) * 2.3);
      const r = radius * taper * (gap + (1 - gap) * bump) * wobble;
      return sum([at(t), 1], [e1, Math.cos(phi) * r], [e2, Math.sin(phi) * r]);
    },
    Math.round(whorls * 4),
    6,
    mat,
    tag,
  );
  return { at, a, e1, e2 };
}

// A bunch of lavender spikes rising from one point in the bouquet.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const n = S.spikes[0] + Math.floor(rnd() * (S.spikes[1] - S.spikes[0] + 1));
  // lavender points up, leaning out a little with its place in the bouquet
  const lean = [center[0] * 0.2 + axis[0] * 0.2, 1, axis[2] * 0.3];

  for (let j = 0; j < n; j++) {
    const off = n > 1 ? j / (n - 1) - 0.5 : 0;
    const dir = norm(sum([lean, 1], [[1, 0, 0], off * 0.45 + (rnd() - 0.5) * 0.15], [[0, 0, 1], (rnd() - 0.5) * 0.5]));
    const stalkLen = size * S.stalk * (0.6 + rnd() * 0.8);
    const base = sum([center, 1], [dir, stalkLen], [[1, 0, 0], off * size * 0.3]);
    mesh.line([center, sum([center, 0.5], [base, 0.5], [dir, -stalkLen * 0.1]), base], mats.stalk, tag + j);

    const bend = norm(cross(dir, [0, 0, 1]));
    const { at, a, e1, e2 } = spike(mesh, mats.spike, {
      base,
      dir,
      len: size * S.len * (0.85 + rnd() * 0.3),
      radius: size * S.radius * (0.9 + rnd() * 0.2),
      whorls: S.whorls + Math.floor(rnd() * 3) - 1,
      bend: [bend[0] * (rnd() - 0.5), bend[1] * (rnd() - 0.5), 0],
      tag: tag + j,
    });

    // a few open florets poking out of the spike
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + rnd() * 0.5;
      const phi = rnd() * Math.PI * 2;
      const r = size * S.radius * 1.1;
      mesh.point(sum([at(t), 1], [e1, Math.cos(phi) * r], [e2, Math.sin(phi) * r]), mats.floret, rnd() < 0.5 ? "o" : "*", tag + j);
    }

    // French lavender's bracts: a few petal-like flags standing up off the top
    if (S.ears) {
      const top = at(0.97);
      const ears = 2 + Math.floor(rnd() * 2);
      const twist = rnd() * Math.PI * 2;
      for (let k = 0; k < ears; k++) {
        const phi = twist + (k * Math.PI * 2) / ears;
        const out = sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
        const up = norm(sum([a, 1], [out, 0.45]));
        const side = cross(up, out);
        const L = size * (0.24 + rnd() * 0.08);
        const W = size * 0.07;
        mesh.surface(
          (t, v01) => {
            const s = v01 * 2 - 1;
            const w = W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.8) + 0.002;
            return sum([top, 1], [up, L * t], [out, L * 0.25 * t * t], [side, s * w], [out, -0.3 * w * s * s]);
          },
          6,
          4,
          mats.ears,
          tag + j,
        );
      }
    }
  }
}

// A closed bud: a thin spike that hasn't coloured up yet.
function bud(mesh, mats, { base, dir, size, tag }) {
  spike(mesh, mats.bud, { base, dir, len: size * 1.7, radius: size * 0.1, whorls: 7, bend: [0, 0, 0], tag });
}

export default {
  id: "lavender",
  name: "Lavender",
  varieties,
  mixes,
  wraps,
  ribbons,
  materials,
  bloom,
  bud,
};
