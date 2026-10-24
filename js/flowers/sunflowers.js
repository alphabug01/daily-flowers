// Sunflowers, modelled in 3D. Each head is a domed disc of seeds, patterned in
// the crossing spirals real sunflowers grow in, ringed by two layers of ray
// petals and backed by pointed green bracts. "Double" varieties (Teddy Bear)
// are a fluffy pompom of short petals around a tiny centre.

import { sum, cross, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size: `disc` is the seed disc's radius, `len` and
// `width` the petals'. `layers` rings of `petals` each; `lean` is how far the
// petals tip forward at the base (radians from the face) and `droop` at the tip.
const SHAPES = {
  single: { disc: 0.24, len: 0.38, width: 0.068, layers: 2, petals: 14, lean: 1.42, droop: 1.75 },
  double: { disc: 0.1, len: 0.28, width: 0.065, layers: 3, petals: 14, lean: 0.6, droop: 1.55 },
};

// Light, clear petal colours so they read against the dark tinted glass card;
// yellow sits opposite its purple, so these stand out the most of any flower.
const varieties = [
  { name: "Classic sunflowers", shape: "single", petal: "#ffc82a", tip: "#ffdf5a", disc: "#6b4524", rim: "#c99040" },
  { name: "Lemon Queen sunflowers", shape: "single", petal: "#fff07a", tip: "#fff7b8", disc: "#6b4a26", rim: "#c9a050" },
  { name: "Teddy Bear sunflowers", shape: "double", petal: "#ffb82e", tip: "#ffd45a", disc: "#8a6a2a", rim: "#d8a840" },
  { name: "Ring of Fire sunflowers", shape: "single", petal: "#ff6a3a", tip: "#ffc23a", disc: "#5e3a1e", rim: "#c07a38" },
  { name: "Italian White sunflowers", shape: "single", petal: "#fbf1cc", tip: "#fffbea", disc: "#5e4022", rim: "#b8904a" },
  { name: "Autumn Beauty sunflowers", shape: "single", petal: "#ff9a3a", tip: "#ffd25a", disc: "#6b4524", rim: "#c98a3a" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Classic & Lemon Queen sunflowers", of: [0, 1] },
  { name: "Sunflowers & Teddy Bears", of: [0, 2] },
  { name: "Autumn mix of sunflowers", of: [0, 3, 5] },
  { name: "Lemon & Italian White sunflowers", of: [1, 4] },
];

// Rustic papers, plus a denim blue that sets off the yellow.
const wraps = [
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "denim blue paper", paper: "#7f9fc8", tissue: "#f2f6ff", pattern: "weave" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
];

// Gold would vanish against the petals; twine, ivory, sky and violet don't.
const ribbons = [
  { name: "twine", color: "#b89466" },
  { name: "ivory", color: "#f8f3e6" },
  { name: "sky", color: "#3fb6e8" },
  { name: "violet", color: "#9b5de5" },
];

const SEPAL = hexToRgb("#6fae4a");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const T = hexToRgb(v.tip);
  const D = hexToRgb(v.disc);
  const Ri = hexToRgb(v.rim);
  const heart = hexToRgb("#7a8a3a");

  return {
    // t runs from the disc (0) to the petal tip (1); s across the petal
    petal: mesh.material({
      color(t, s, tag) {
        let c = mixRgb(P, T, smoothstep(0.3, 1, t));
        c = mixRgb(c, [c[0] * 0.8, c[1] * 0.7, c[2] * 0.6], (1 - smoothstep(0, 0.25, t)) * 0.6);
        // faint veins along the petal
        c = mixRgb(c, P, (1 - smoothstep(0, 0.12, Math.abs(Math.sin(s * 4.5)))) * 0.25);
        const k = 0.9 + 0.2 * hash3(tag, 5, 2);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.2,
      shine: 14,
      translucent: 0.4,
    }),
    // r runs from the middle (0) to the rim (1), a is the angle around
    disc: mesh.material({
      color(r, a) {
        // the two families of seed spirals (21 one way, 34 the other) crossing
        const phi = a * TAU;
        const sp = Math.sin(34 * phi + 60 * r) * Math.sin(21 * phi - 60 * r);
        let c = mixRgb(D, [D[0] * 0.6, D[1] * 0.6, D[2] * 0.6], smoothstep(0, 0.6, sp));
        c = mixRgb(c, Ri, smoothstep(0.72, 0.95, r));
        c = mixRgb(c, heart, (1 - smoothstep(0.05, 0.22, r)) * 0.7);
        return c;
      },
      ks: 0.08,
      shine: 6,
    }),
    floret: mesh.material({ color: () => Ri, ks: 0.05, shine: 4, glow: 0.05 }),
    sepal: mesh.material({ color: (t) => mixRgb(SEPAL, [0.36, 0.55, 0.26], t * 0.5), ks: 0.25, shine: 14, translucent: 0.3 }),
    bud: mesh.material({ color: (t) => mixRgb(SEPAL, P, smoothstep(0.75, 1, t) * 0.6), ks: 0.25, shine: 12 }),
  };
}

// A long, pointed petal (or bract) growing out from `root` along `r`, bending
// from `th0` to `th1` radians away from the face `a`.
function blade(mesh, mat, { root, a, r, len, width, th0, th1, cup, tag }) {
  const b = cross(a, r);
  const N = 8;
  const theta = (t) => th0 + (th1 - th0) * t * t;
  const spine = [root];
  for (let i = 1; i <= N; i++) {
    const th = theta((i - 0.5) / N);
    spine.push(sum([spine[i - 1], 1], [a, (len / N) * Math.cos(th)], [r, (len / N) * Math.sin(th)]));
  }
  mesh.surface(
    (t, v01) => {
      const s = v01 * 2 - 1;
      const f = t * N;
      const i = Math.min(N - 1, Math.floor(f));
      const p = sum([spine[i], 1 - (f - i)], [spine[i + 1], f - i]);
      const th = theta(t);
      const T = sum([a, Math.cos(th)], [r, Math.sin(th)]);
      const n = cross(b, T);
      const w = width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.7) + 0.002;
      return sum([p, 1], [b, s * w], [n, -cup * w * s * s]);
    },
    N,
    3,
    mat,
    tag,
    (u, v01) => [u, v01 * 2 - 1],
  );
}

// One open sunflower facing `axis`.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const a = norm(axis);
  const [e1, e2] = basis(a);
  const Rd = size * S.disc;
  const twist = rnd() * TAU;
  const base = (tag + 1) * 1000;
  const radial = (phi) => sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);

  // the seed disc, gently domed
  mesh.surface(
    (r, w) => sum([center, 1], [a, Rd * 0.22 * (1 - r * r)], [radial(w * TAU), Rd * r]),
    6,
    28,
    mats.disc,
    base + 999,
  );
  // a ring of open florets around the edge of the disc
  for (let k = 0; k < 14; k++) {
    const phi = twist + (k * TAU) / 14;
    mesh.point(sum([center, 1], [a, Rd * 0.06], [radial(phi), Rd * 0.88]), mats.floret, rnd() < 0.5 ? "o" : "*", base + 999);
  }

  // ray petals, layer by layer, each layer offset to fill the gaps
  for (let L = 0; L < S.layers; L++) {
    const back = S.layers - 1 - L; // outer layers sit further back
    for (let k = 0; k < S.petals; k++) {
      const phi = twist + ((k + L * 0.5) * TAU) / S.petals + (rnd() - 0.5) * 0.08;
      const r = radial(phi);
      const lean = S.lean + L * (S.layers > 2 ? 0.3 : 0.06);
      blade(mesh, mats.petal, {
        root: sum([center, 1], [r, Rd * 0.92], [a, -0.02 * size * back]),
        a,
        r,
        len: size * S.len * (0.88 + rnd() * 0.24) * (1 - 0.08 * back),
        width: size * S.width * (0.9 + rnd() * 0.2),
        th0: lean + (rnd() - 0.5) * 0.12,
        th1: S.droop + L * 0.08 + (rnd() - 0.5) * 0.3,
        cup: 0.35,
        tag: base + L * 100 + k,
      });
    }
  }

  // green bracts behind the head
  for (let k = 0; k < 12; k++) {
    const phi = twist + ((k + 0.25) * TAU) / 12;
    const r = radial(phi);
    blade(mesh, mats.sepal, {
      root: sum([center, 1], [a, -size * 0.06], [r, Rd * 0.75]),
      a,
      r,
      len: size * 0.2,
      width: size * 0.05,
      th0: 1.9,
      th1: 2.3,
      cup: 0.2,
      tag: base + 900 + k,
    });
  }
}

// A bud: a tight green head wrapped in pointed bracts, petals just peeking out.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const R = size * 0.32;
  const c = sum([base, 1], [a, R * 0.8]);
  mesh.surface(
    (u, w) => {
      const th = u * Math.PI;
      const ph = w * TAU;
      const spike = 1 + 0.12 * Math.max(0, Math.sin(10 * ph)) * Math.sin(th);
      return sum([c, 1], [a, Math.cos(th) * R * 0.8 * spike], [e1, Math.sin(th) * Math.cos(ph) * R * spike], [e2, Math.sin(th) * Math.sin(ph) * R * spike]);
    },
    8,
    20,
    mats.bud,
    tag,
    (u, w) => [1 - u, w],
  );
}

export default {
  id: "sunflowers",
  name: "Sunflowers",
  varieties,
  mixes,
  wraps,
  ribbons,
  materials,
  bloom,
  bud,
};
