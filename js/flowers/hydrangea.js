// Hydrangeas, modelled in 3D. Each bloom is a head of many small four-petalled
// florets spread over a dome. Mopheads are full and round; lacecaps are flatter,
// with a ring of big florets around a cushion of tiny fertile buds.
// Florets grow in little bunches; each bunch gets its own tag, so the renderer
// outlines the bunches and the head reads as lumpy clusters, not a smooth ball.

import { sum, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// `radius` is the head's size, `cap` how far round the dome the florets reach
// (radians from the top), `flat` squashes the dome, `count` florets per head.
const SHAPES = {
  mophead: { radius: 0.56, cap: 1.35, flat: 1, count: 46, floret: 0.15 },
  lacecap: { radius: 0.6, cap: 1.1, flat: 0.45, count: 14, floret: 0.16, fertile: 60 },
};

// Light, clear colours so they read against the dark tinted glass card.
// Each head blends between `a` and `b` floret by floret.
const varieties = [
  { name: "Blue hydrangeas", shape: "mophead", a: "#8fb8ff", b: "#a9b0ff", eye: "#eef4ff" },
  { name: "Pink hydrangeas", shape: "mophead", a: "#ffa8cf", b: "#ffc6de", eye: "#fff0f6" },
  { name: "White hydrangeas", shape: "mophead", a: "#f6f7f0", b: "#e2efd0", eye: "#ffffff" },
  { name: "Purple hydrangeas", shape: "mophead", a: "#c39dff", b: "#ab90ff", eye: "#f2eaff" },
  { name: "Limelight hydrangeas", shape: "mophead", a: "#d6ee9a", b: "#f0f5d8", eye: "#ffffff" },
  { name: "Lacecap hydrangeas", shape: "lacecap", a: "#a6c4ff", b: "#c0c8ff", eye: "#ffffff", fertile: "#7f8ff0" },
  { name: "Antique hydrangeas", shape: "mophead", a: "#e6aabb", b: "#bcd3a2", eye: "#fff6f0" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Blue & white hydrangeas", of: [0, 2] },
  { name: "Pink & white hydrangeas", of: [1, 2] },
  { name: "Blue & purple hydrangeas", of: [0, 3] },
  { name: "Limelight & antique hydrangeas", of: [4, 6] },
  { name: "Garden mix of hydrangeas", of: [0, 1, 3] },
];

// Lilac paper would swallow the purple and blue heads, so it's left out here.
const wraps = [
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
  { name: "blush tissue", paper: "#e9a7b8", tissue: "#fff4f6", pattern: "dots" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
];

const BUD_GREEN = hexToRgb("#8fbf6a");
const HEART = hexToRgb("#3f5a3a"); // the shaded inside of the head, between florets
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function materials(mesh, v) {
  const A = hexToRgb(v.a);
  const B = hexToRgb(v.b);
  const Eye = hexToRgb(v.eye);
  const Fe = v.fertile ? hexToRgb(v.fertile) : A;

  return {
    // r runs from the floret's eye (0) to its petal tips (1)
    floret: mesh.material({
      color(r, s, tag) {
        let c = mixRgb(A, B, hash3(tag, 7, 3));
        c = mixRgb(c, Eye, (1 - smoothstep(0, 0.3, r)) * 0.55);
        const k = 0.9 + 0.2 * hash3(tag, 1, 9);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.12,
      shine: 10,
      translucent: 0.35,
    }),
    heart: mesh.material({ color: () => mixRgb(HEART, A, 0.6), ks: 0, shine: 4 }),
    fertile: mesh.material({ color: () => Fe, ks: 0.1, shine: 6, glow: 0.05 }),
    eye: mesh.material({ color: () => Eye, ks: 0, shine: 4, glow: 0.05 }),
    bud: mesh.material({
      color: (a, b, tag) => mixRgb(BUD_GREEN, A, 0.25 + 0.2 * hash3(Math.floor(a * 9), Math.floor(b * 9), tag)),
      ks: 0.15,
      shine: 8,
    }),
  };
}

// One floret: four rounded petals, a little cupped, facing `n`.
function floret(mesh, mat, { at, n, size, twist, tag }) {
  const [e1, e2] = basis(n);
  mesh.surface(
    (r, v) => {
      const phi = v * TAU;
      const petal = size * (0.68 + 0.32 * Math.cos(4 * (phi + twist)));
      const rho = petal * r;
      return sum([at, 1], [e1, Math.cos(phi) * rho], [e2, Math.sin(phi) * rho], [n, -0.15 * size * r * r]);
    },
    2,
    10,
    mat,
    tag,
  );
}

// A whole head of florets over a dome facing `axis`.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const a = norm(axis);
  const [e1, e2] = basis(a);
  const R = size * S.radius * (0.92 + rnd() * 0.16);
  // the dome's centre sits back from the flower's position, so it bulges forward
  const core = sum([center, 1], [a, -R * 0.35 * S.flat]);
  const onDome = (theta, phi, lift = 1) => {
    const n = sum([a, Math.cos(theta)], [e1, Math.sin(theta) * Math.cos(phi)], [e2, Math.sin(theta) * Math.sin(phi)]);
    const p = sum([core, 1], [a, Math.cos(theta) * R * S.flat * lift], [e1, Math.sin(theta) * Math.cos(phi) * R * lift], [e2, Math.sin(theta) * Math.sin(phi) * R * lift]);
    // squash the normal the same way as the dome
    return { p, n: norm(sum([a, Math.cos(theta) / S.flat], [e1, Math.sin(theta) * Math.cos(phi)], [e2, Math.sin(theta) * Math.sin(phi)])) };
  };

  // the shaded heart of the head, so you never see through the gaps
  mesh.surface(
    (u, w) => onDome(u * S.cap * 0.97, w * TAU, 0.9).p,
    8,
    20,
    mats.heart,
    tag * 1000 + 999,
  );

  // florets spread evenly over the cap (a golden-angle spiral)
  const top = 1 - Math.cos(S.cap);
  const spin = rnd() * TAU;
  for (let k = 0; k < S.count; k++) {
    const f = (k + 0.5) / S.count;
    // lacecaps keep their big florets in a ring round the edge
    const theta = v.shape === "lacecap" ? S.cap * (0.82 + 0.18 * rnd()) : Math.acos(1 - f * top);
    const phi = v.shape === "lacecap" ? (k / S.count) * TAU + spin + (rnd() - 0.5) * 0.25 : spin + k * GOLDEN;
    const { p, n } = onDome(theta, phi, 1.02);
    const jitter = norm(sum([n, 1], [e1, (rnd() - 0.5) * 0.12], [e2, (rnd() - 0.5) * 0.12]));
    const fs = size * S.floret * (0.85 + rnd() * 0.3);
    // bunch nearby florets together: bands down the dome, segments around it
    const band = Math.round(theta / 0.42);
    const segs = Math.max(1, Math.round(Math.sin(theta) * 7));
    const seg = Math.round((((phi % TAU) + TAU) % TAU) / TAU * segs) % segs;
    const ftag = tag * 1000 + band * 20 + seg;
    floret(mesh, mats.floret, { at: p, n: jitter, size: fs, twist: rnd() * TAU, tag: ftag });
    if (rnd() < 0.35) mesh.point(sum([p, 1], [n, fs * 0.1]), mats.eye, ".", ftag);
  }

  // lacecap centres: a cushion of tiny fertile buds
  for (let k = 0; k < (S.fertile ?? 0); k++) {
    const f = (k + 0.5) / S.fertile;
    const theta = Math.acos(1 - f * (1 - Math.cos(S.cap * 0.75)));
    const { p } = onDome(theta, spin + k * GOLDEN, 1.03);
    mesh.point(p, mats.fertile, rnd() < 0.5 ? "o" : rnd() < 0.5 ? "*" : ".", tag * 1000 + 900);
  }
}

// A bud: a small, tight, greenish ball of closed florets.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const R = size * 0.26;
  const c = sum([base, 1], [a, R * 0.6]);
  mesh.surface(
    (u, w) => {
      const th = u * Math.PI;
      const ph = w * TAU;
      const bump = 1 + 0.08 * Math.sin(7 * th) * Math.sin(6 * ph);
      return sum([c, 1], [a, Math.cos(th) * R * bump], [e1, Math.sin(th) * Math.cos(ph) * R * bump], [e2, Math.sin(th) * Math.sin(ph) * R * bump]);
    },
    10,
    14,
    mats.bud,
    tag,
  );
}

export default {
  id: "hydrangea",
  name: "Hydrangeas",
  varieties,
  mixes,
  wraps,
  materials,
  bloom,
  bud,
};
