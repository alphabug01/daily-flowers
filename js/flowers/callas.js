// Calla lilies, modelled in 3D. Each flower is a single spathe: one smooth petal
// rolled into a funnel at the base, opening into a wide mouth whose front lip
// curls back to a point, with a yellow spadix standing inside. Callas grow on
// long, upright stems, so each place in the bouquet holds two of them.

import { sum, norm, basis, cross, dot, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size: the spathe is `len` long and `mouth` wide at
// the top; `lip` is how far its front point reaches beyond the rim and `curl`
// how much it rolls back. `heads` per place.
const SHAPES = {
  // classic white callas: long and elegant, with a big curled lip
  classic: { len: 0.72, mouth: 0.24, lip: 0.2, curl: 0.12, heads: 2 },
  // mini coloured callas: shorter, with a tidier, smaller lip
  mini: { len: 0.6, mouth: 0.2, lip: 0.14, curl: 0.08, heads: 2 },
};

// Light, clear colours so they read against the dark tinted glass card.
// `throat` is the colour deep inside the funnel.
const varieties = [
  { name: "White calla lilies", shape: "classic", spathe: "#fbf8ee", edge: "#ffffff", throat: "#eef4c8" },
  { name: "Yellow calla lilies", shape: "mini", spathe: "#ffe066", edge: "#fff2b0", throat: "#ffc83a" },
  { name: "Pink calla lilies", shape: "mini", spathe: "#ffa8c8", edge: "#ffd2e2", throat: "#fff0c8" },
  { name: "Orange calla lilies", shape: "mini", spathe: "#ffa050", edge: "#ffc888", throat: "#ffe070" },
  { name: "Purple calla lilies", shape: "mini", spathe: "#c79cf0", edge: "#e6d2ff", throat: "#fff0c0" },
  { name: "Mango calla lilies", shape: "mini", spathe: "#ffb070", edge: "#ffb0c8", throat: "#ffe080" },
];

// Days where two varieties are mixed in the same bouquet.
const mixes = [
  { name: "White & yellow calla lilies", of: [0, 1] },
  { name: "Pink & white calla lilies", of: [2, 0] },
  { name: "Sunset calla lilies", of: [3, 5] },
  { name: "Purple & white calla lilies", of: [4, 0] },
];

const GREEN = hexToRgb("#7fae55");
const SPADIX = hexToRgb("#ffd23a");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.spathe);
  const E = hexToRgb(v.edge);
  const T = hexToRgb(v.throat);

  return {
    // t runs from the base of the funnel (0) to the rim (1); s around it (-1..1)
    spathe: mesh.material({
      color(t, s, tag) {
        let c = mixRgb(T, P, smoothstep(0.05, 0.45, t));
        c = mixRgb(c, E, smoothstep(0.8, 1, t) * 0.6);
        // the outside of the funnel is green-flushed at the base
        c = mixRgb(c, GREEN, (1 - smoothstep(0, 0.22, t)) * 0.65);
        const k = 0.94 + 0.12 * hash3(tag, 5, 5);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.4,
      shine: 26,
      translucent: 0.35,
    }),
    spadix: mesh.material({ color: () => SPADIX, ks: 0.15, shine: 8, glow: 0.08 }),
    stem: mesh.material({ color: () => GREEN, ks: 0.2, shine: 10 }),
    bud: mesh.material({ color: (t) => mixRgb(GREEN, P, smoothstep(0.4, 0.9, t)), ks: 0.35, shine: 20 }),
  };
}

// One calla with the base of its funnel at `base`, opening along `a`, its lip
// on the `front` side.
function spathe(mesh, mats, S, { base, a, front, size, tag }) {
  const side = cross(a, front);
  const L = size * S.len;
  const M = size * S.mouth;
  mesh.surface(
    (u, t) => {
      // round the funnel: at the base it wraps more than a full turn (rolled),
      // at the top a little less, leaving the mouth open at the front
      const wrap = TAU * (1.15 - 0.4 * t);
      const phi = Math.PI + (u - 0.5) * wrap; // the seam is at the back
      const facing = Math.cos(phi); // 1 at the front, -1 at the back
      const lipT = Math.pow(Math.max(0, facing), 3) * Math.pow(t, 5);
      const rho = M * (0.12 + 0.88 * Math.pow(t, 1.6)) * (1 + 0.04 * u) + size * S.curl * lipT;
      const h = L * t + size * S.lip * lipT - size * S.curl * 0.6 * lipT * lipT;
      return sum([base, 1], [a, h], [front, Math.cos(phi) * rho], [side, Math.sin(phi) * rho]);
    },
    16,
    10,
    mats.spathe,
    tag,
    (u, t) => [t, u * 2 - 1],
  );
  // the spadix standing up inside
  const sp = [];
  for (let i = 0; i <= 4; i++) sp.push(sum([base, 1], [a, L * (0.3 + 0.45 * (i / 4))], [front, -M * 0.15]));
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const r = size * 0.025 * Math.sin(Math.PI * (0.1 + 0.85 * t));
      const p = sum([sp[0], 1 - t], [sp[4], t]);
      return sum([p, 1], [front, Math.cos(phi) * r], [side, Math.sin(phi) * r]);
    },
    4,
    8,
    mats.spadix,
    tag + 1,
  );
}

// Two callas on long stems rising from one place in the bouquet.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const ax = norm(axis);
  const [e1, e2] = basis(ax);
  const base = (tag + 1) * 1000;
  for (let j = 0; j < S.heads; j++) {
    const off = (j - (S.heads - 1) / 2) * size * 0.45;
    const at = sum([center, 1], [e1, off], [[0, 1, 0], j * size * 0.18 + rnd() * size * 0.1]);
    // callas stand up, tipped a little towards you and splaying apart
    const a = norm(sum([[0, 1, 0], 1], [ax, 0.45], [e1, off * 0.6], [[(rnd() - 0.5) * 0.2, 0, 0], 1]));
    // the lip faces roughly towards you, square to the flower
    const toward = sum([ax, 1], [e1, (rnd() - 0.5) * 0.6]);
    const front = norm(sum([toward, 1], [a, -dot(toward, a)]));
    mesh.line([center, sum([center, 0.5], [at, 0.5], [ax, -size * 0.05]), at], mats.stem, tag);
    spathe(mesh, mats, S, { base: at, a, front, size: size * (0.92 + rnd() * 0.16), tag: base + j * 10 });
  }
}

// A bud: a tightly rolled spathe, a slim green-tipped cone.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(sum([norm(dir), 1], [[0, 1, 0], 0.6]));
  const [e1, e2] = basis(a);
  const L = size * 0.9;
  const R = size * 0.12;
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.8) * (1 + 0.15 * Math.max(0, Math.sin(phi)) * t);
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    12,
    mats.bud,
    tag,
  );
}

export default {
  id: "callas",
  name: "Calla lilies",
  varieties,
  mixes,
  materials,
  bloom,
  bud,
};
