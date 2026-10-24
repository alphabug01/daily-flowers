// Irises, modelled in 3D. Each bloom has three upright petals (standards)
// arching in at the top, three broad petals (falls) that arch out and droop,
// each with a bright beard or signal patch, and three small style arms over
// the falls. Irises stand upright on their stems, leaning a little forwards.

import { sum, norm, basis, cross, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// Light, clear colours so they read against the dark tinted glass card.
// `standard` colours the upright petals, `fall` the drooping ones, `signal`
// the beard or patch on each fall, `vein` the fine lines round it.
const varieties = [
  { name: "Blue flag irises", standard: "#9db0ff", fall: "#8a9cff", signal: "#fff2a0", vein: "#4a56c8" },
  { name: "Purple bearded irises", standard: "#b994ff", fall: "#a27cf4", signal: "#ffc83a", vein: "#5a3aa8" },
  { name: "White irises", standard: "#f8f6fc", fall: "#f2f0f8", signal: "#ffd84a", vein: "#b0a8d0" },
  { name: "Yellow irises", standard: "#ffe066", fall: "#ffd23a", signal: "#ffb020", vein: "#b07a20" },
  { name: "Dutch blue irises", standard: "#7f9aff", fall: "#91a8ff", signal: "#ffd23a", vein: "#3a4ab0" },
  { name: "Bicolour irises", standard: "#f6f2ff", fall: "#a881f0", signal: "#ffcf4a", vein: "#5a3aa8" },
  { name: "Apricot irises", standard: "#ffc29a", fall: "#ffae86", signal: "#ff7a4a", vein: "#c06440" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Blue & white irises", of: [0, 2] },
  { name: "Purple & yellow irises", of: [1, 3] },
  { name: "Dutch & bicolour irises", of: [4, 5] },
  { name: "Meadow mix of irises", of: [0, 3, 2] },
  { name: "Apricot & purple irises", of: [6, 1] },
];

// Cool papers that sit well with the blues and purples.
const wraps = [
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
];

const SPATHE = hexToRgb("#6c9e4e");
const TAU = Math.PI * 2;

// Tags within a bloom: falls end in 0-2, standards in 3-5, style arms in 6-8.
const FALL = 0;
const STANDARD = 3;
const STYLE = 6;

function materials(mesh, v) {
  const St = hexToRgb(v.standard);
  const F = hexToRgb(v.fall);
  const Sg = hexToRgb(v.signal);
  const V = hexToRgb(v.vein);
  const pale = (c, k) => mixRgb(c, [1, 1, 1], k);

  return {
    // t runs from the petal's base (0) to its tip (1); s across it (-1..1)
    petal: mesh.material({
      color(t, s, tag) {
        const part = tag % 10;
        let c;
        if (part >= STYLE) {
          c = pale(St, 0.3);
        } else if (part >= STANDARD) {
          c = mixRgb(mixRgb(St, V, 0.25), St, smoothstep(0, 0.35, t));
        } else {
          c = F;
          // veins fanning out from the throat, fading towards the tip
          const vein = (1 - smoothstep(0, 0.2, Math.abs(Math.sin(s * 10)))) * (1 - smoothstep(0.2, 0.7, t));
          c = mixRgb(c, V, vein * 0.7);
          // the beard: a bright fuzzy stripe down the middle of the fall
          const beard = (1 - smoothstep(0.12, 0.3, Math.abs(s))) * smoothstep(0.08, 0.2, t) * (1 - smoothstep(0.45, 0.6, t));
          c = mixRgb(c, Sg, beard);
          // a paler rim
          c = mixRgb(c, pale(F, 0.35), smoothstep(0.75, 1, t) * 0.5);
        }
        const k = 0.92 + 0.16 * hash3(tag, 7, 1);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.3,
      shine: 20,
      translucent: 0.45,
      outline: 0.02,
    }),
    spathe: mesh.material({ color: (t) => mixRgb(SPATHE, [0.62, 0.7, 0.45], t * 0.5), ks: 0.25, shine: 12, translucent: 0.2 }),
    bud: mesh.material({ color: (t) => mixRgb(SPATHE, mixRgb(St, F, 0.5), smoothstep(0.5, 0.9, t) * 0.9), ks: 0.3, shine: 16, translucent: 0.2 }),
  };
}

// A strap-shaped petal from `base`, heading out along `r` and up along `a`.
// `path(t)` gives [out, up] along its middle; `width(t)` its half-width;
// `cup` curls its sides (positive: up, negative: down).
function petal(mesh, mat, { base, a, r, path, width, cup, tag }) {
  const b = cross(a, r);
  mesh.surface(
    (t, v01) => {
      const s = v01 * 2 - 1;
      const [out, up] = path(t);
      const w = width(t);
      return sum([base, 1], [r, out], [a, up + cup * w * s * s], [b, s * w]);
    },
    10,
    5,
    mat,
    tag,
    (t, v01) => [t, v01 * 2 - 1],
  );
}

// One iris with its throat at `center`.
function bloom(mesh, mats, v, { center, axis, size: slot, rnd, tag }) {
  const size = slot * 0.8;
  // stand upright, leaning a little towards the bouquet's facing
  const a = norm(sum([[0, 1, 0], 1], [norm(axis), 0.45], [[(rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3], 1]));
  const [e1, e2] = basis(a);
  const radial = (phi) => sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
  // turn the bloom so a fall faces the viewer
  const toward = norm([axis[0], 0, axis[2]]);
  const twist = Math.atan2(toward[0] * e2[0] + toward[2] * e2[2], toward[0] * e1[0] + toward[2] * e1[2]) + (rnd() - 0.5) * 0.4;
  const base = (tag + 1) * 1000;
  const spoon = (W, p) => (t) => W * Math.pow(Math.sin(Math.PI * Math.pow(t, p)), 0.75) + 0.004;

  for (let k = 0; k < 3; k++) {
    const phi = twist + (k * TAU) / 3;
    // falls: a narrow claw rising from the throat, then a broad blade arching
    // out and drooping down
    const L = size * 0.52 * (0.92 + rnd() * 0.16);
    petal(mesh, mats.petal, {
      base: center,
      a,
      r: radial(phi + (rnd() - 0.5) * 0.15),
      path: (t) => [L * (0.08 + 0.75 * t), L * (0.45 * Math.sin(Math.PI * 0.9 * t) - 0.75 * t * t * t)],
      width: spoon(size * 0.15, 0.55),
      cup: -0.5,
      tag: base + FALL + k,
    });
    // standards: upright, cupped, arching in towards each other at the top
    const Ls = size * 0.5 * (0.92 + rnd() * 0.16);
    petal(mesh, mats.petal, {
      base: sum([center, 1], [a, size * 0.04]),
      a,
      r: radial(phi + Math.PI / 3 + (rnd() - 0.5) * 0.15),
      path: (t) => [Ls * (0.06 + 0.35 * Math.sin(Math.PI * 0.85 * t) - 0.12 * t * t), Ls * t],
      width: spoon(size * 0.12, 0.6),
      cup: 0.5,
      tag: base + STANDARD + k,
    });
    // style arms: short, narrow petals lying over the base of each fall
    const La = size * 0.24;
    petal(mesh, mats.petal, {
      base: sum([center, 1], [a, size * 0.05]),
      a,
      r: radial(phi),
      path: (t) => [La * t, La * 0.35 * Math.sin(Math.PI * t * 0.8)],
      width: spoon(size * 0.045, 0.7),
      cup: 0.6,
      tag: base + STYLE + k,
    });
  }

  // the papery green sheath at the base of the flower
  const r = radial(twist + Math.PI);
  petal(mesh, mats.spathe, {
    base: sum([center, 1], [a, -size * 0.3]),
    a,
    r,
    path: (t) => [size * 0.06 * t, size * 0.32 * t],
    width: (t) => size * 0.05 * (1 - t) + 0.003,
    cup: 0.3,
    tag: base + 999,
  });
}

// A bud: a slim, pointed spindle in a green sheath, colour showing at the tip.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(sum([norm(dir), 1], [[0, 1, 0], 0.8]));
  const [e1, e2] = basis(a);
  const L = size * 0.95;
  const R = size * 0.1;
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.68)), 0.65) * (1 + 0.06 * Math.sin(3 * phi + t * 5));
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    10,
    mats.bud,
    tag,
  );
}

export default {
  id: "irises",
  name: "Irises",
  varieties,
  mixes,
  wraps,
  materials,
  bloom,
  bud,
};
