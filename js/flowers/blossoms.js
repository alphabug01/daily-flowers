// Cherry blossoms (and other spring blossoms), modelled in 3D. Each place in the
// bouquet holds a branch: an angular twig with a couple of side shoots, covered
// in little clusters of five-petalled flowers and round pink buds.
// Double varieties (Kanzan) have a second, smaller ring of petals.

import { sum, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size: the branch is `len` long; flowers are
// `flower` across, in clusters of `cluster` along each twig. `double` adds an
// inner ring of petals.
const SHAPES = {
  single: { len: 1.0, flower: 0.15, cluster: [2, 3], double: false },
  double: { len: 0.9, flower: 0.16, cluster: [2, 3], double: true },
};

// Light, clear colours so they read against the dark tinted glass card.
// `heart` is the deeper colour at each flower's centre, `bud` the closed buds.
const varieties = [
  { name: "Cherry blossoms", shape: "single", petal: "#ffc0d4", edge: "#fff0f4", heart: "#ff7ea6", bud: "#ff8ab0" },
  { name: "White cherry blossoms", shape: "single", petal: "#fff0f4", edge: "#ffffff", heart: "#ffb0c8", bud: "#ffc8d8" },
  { name: "Kanzan cherry blossoms", shape: "double", petal: "#ff8ab8", edge: "#ffc0d8", heart: "#ff5a96", bud: "#ff6aa0" },
  { name: "Plum blossoms", shape: "single", petal: "#ff9ab0", edge: "#ffd0dc", heart: "#ff6a88", bud: "#ff6a8a" },
  { name: "Apple blossoms", shape: "single", petal: "#fbf6ee", edge: "#ffffff", heart: "#ffd8e0", bud: "#ff8aa8" },
  { name: "Peach blossoms", shape: "double", petal: "#ffa8b8", edge: "#ffd8e0", heart: "#ff7090", bud: "#ff7a96" },
];

// Days where two varieties are mixed in the same bouquet.
const mixes = [
  { name: "Pink & white cherry blossoms", of: [0, 1] },
  { name: "Cherry & plum blossoms", of: [0, 3] },
  { name: "Kanzan & white blossoms", of: [2, 1] },
  { name: "Orchard blossoms", of: [4, 5] },
];

// Pale, quiet papers that let the blossom show; washi is a soft Japanese paper.
const wraps = [
  { name: "washi paper", paper: "#efe6d6", tissue: "#ffffff", pattern: "fibre" },
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
];

const TWIG = hexToRgb("#a87a58");
const STAMEN = hexToRgb("#ffe08a");
const LEAF = hexToRgb("#8fbf6a");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const H = hexToRgb(v.heart);
  const B = hexToRgb(v.bud);

  return {
    // r runs from the flower's centre (0) to its petal tips (1)
    petal: mesh.material({
      color(r, s, tag) {
        let c = mixRgb(H, P, smoothstep(0.05, 0.45, r));
        c = mixRgb(c, E, smoothstep(0.7, 1, r) * 0.6);
        const k = 0.93 + 0.14 * hash3(tag, 8, 3);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.1,
      shine: 8,
      translucent: 0.5,
    }),
    stamen: mesh.material({ color: () => STAMEN, ks: 0, shine: 4, glow: 0.05 }),
    twig: mesh.material({ color: () => TWIG, ks: 0.1, shine: 6 }),
    leaf: mesh.material({ color: () => LEAF, ks: 0.2, shine: 10, translucent: 0.3 }),
    bud: mesh.material({ color: () => B, ks: 0.15, shine: 10 }),
  };
}

// One little flower: five rounded petals, gently cupped, facing `n`.
function flower(mesh, mats, { at, n, size, twist, double, tag }) {
  const [e1, e2] = basis(n);
  const ring = (R, lift, rot) =>
    mesh.surface(
      (r, w) => {
        const phi = w * TAU;
        // five rounded lobes with a small notch at each petal's tip
        const lobe = Math.abs(Math.cos(2.5 * (phi + rot)));
        const edge = R * (0.55 + 0.45 * Math.pow(lobe, 0.6)) * (1 - 0.08 * Math.pow(lobe, 40));
        const rho = edge * r;
        return sum([at, 1], [e1, Math.cos(phi) * rho], [e2, Math.sin(phi) * rho], [n, lift + R * 0.25 * r * r]);
      },
      2,
      15,
      mats.petal,
      tag,
    );
  ring(size, 0, twist);
  if (double) ring(size * 0.65, size * 0.08, twist + Math.PI / 5);
  mesh.point(sum([at, 1], [n, size * (double ? 0.18 : 0.08)]), mats.stamen, "*", tag);
}

// A branch of blossom growing out from `center`.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const ax = norm(axis);
  // branches reach up and out from the bouquet, a little towards you
  const out = norm(sum([[center[0], 0, center[2]], 0.6], [[0, 1, 0], 1], [ax, 0.3]));
  const L = size * S.len * (0.9 + rnd() * 0.2);
  const base = (tag + 1) * 1000;
  let fl = 0;

  // an angular twig: a few straight segments, each turning slightly
  const twig = (from, dir, len, segs) => {
    const pts = [from];
    let d = dir;
    for (let i = 1; i <= segs; i++) {
      d = norm(sum([d, 1], [[(rnd() - 0.5) * 0.6, (rnd() - 0.3) * 0.3, (rnd() - 0.5) * 0.3], 1]));
      pts.push(sum([pts[i - 1], 1], [d, len / segs]));
    }
    mesh.line(pts, mats.twig, tag);
    return pts;
  };

  const main = twig(center, out, L, 4);
  const [s1, s2] = basis(out);
  const shoots = [
    main,
    twig(main[1], norm(sum([out, 1], [s1, 0.8])), L * 0.45, 2),
    twig(main[2], norm(sum([out, 1], [s1, -0.8], [s2, 0.3])), L * 0.4, 2),
  ];

  // clusters of flowers along each twig, and buds near the tips
  for (const pts of shoots) {
    for (let i = 1; i < pts.length; i++) {
      const at0 = pts[i];
      const tipEnd = i === pts.length - 1;
      const n = S.cluster[0] + Math.floor(rnd() * (S.cluster[1] - S.cluster[0] + 1));
      for (let k = 0; k < n; k++) {
        const jitter = [(rnd() - 0.5) * size * 0.16, (rnd() - 0.5) * size * 0.14, (rnd() - 0.2) * size * 0.12];
        const at = sum([at0, 1], [jitter, 1]);
        if (tipEnd && k === n - 1) {
          mesh.point(at, mats.bud, rnd() < 0.5 ? "o" : "@", base + 900);
          continue;
        }
        // flowers face mostly towards you, each at its own angle
        const face = norm(sum([ax, 1], [[(rnd() - 0.5) * 0.9, (rnd() - 0.3) * 0.7, 0], 1]));
        flower(mesh, mats, { at, n: face, size: size * S.flower * (0.85 + rnd() * 0.3), twist: rnd() * TAU, double: S.double, tag: base + fl++ });
      }
    }
    // a small fresh leaf or two
    if (rnd() < 0.6) {
      const p = pts[Math.max(1, pts.length - 2)];
      const d = norm(sum([out, 1], [[(rnd() - 0.5) * 1.5, 0, 0.3], 1]));
      const [b] = basis(d);
      const len = size * 0.18;
      mesh.surface(
        (t, v01) => {
          const s = v01 * 2 - 1;
          const w = len * 0.28 * Math.sin(Math.PI * Math.pow(t, 0.8));
          return sum([p, 1], [d, len * t], [b, s * w]);
        },
        5,
        2,
        mats.leaf,
        base + 950,
      );
    }
  }
}

// A bud: a short twig tipped with a cluster of round pink buds.
function bud(mesh, mats, { base, dir, size, tag }) {
  const d = norm(dir);
  const tip = sum([base, 1], [d, size * 0.7]);
  mesh.line([base, sum([base, 1], [d, size * 0.35], [[0.05, 0, 0], 1]), tip], mats.twig, tag);
  for (let k = 0; k < 4; k++) {
    const p = sum([tip, 1], [[Math.cos(k * 1.7) * size * 0.07, Math.sin(k * 2.3) * size * 0.06, 0.02], 1]);
    mesh.point(p, mats.bud, k % 2 ? "o" : "@", tag);
  }
}

export default {
  id: "blossoms",
  name: "Blossoms",
  varieties,
  mixes,
  wraps,
  materials,
  bloom,
  bud,
};
