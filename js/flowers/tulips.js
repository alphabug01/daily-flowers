// Tulips, modelled in 3D. Each bloom is a cup of six broad petals, three outer
// and three inner, curving in towards the top. Tulips stand upright on their
// stems, so the cup points mostly up whatever way its place in the bouquet faces.

import { sum, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size: the cup is `width` across at its widest and
// `height` tall; `open` flares the petal tips outwards, `tip` makes them pointed
// (0 is rounded), `lean` tips the cup towards the viewer.
const SHAPES = {
  // classic Darwin tulips: a deep, rounded, closed cup
  cup: { width: 0.3, height: 0.62, open: 0, tip: 0.1, lean: 0.35 },
  // lily-flowered: a narrower waist and pointed petals flaring out at the tips
  lily: { width: 0.26, height: 0.66, open: 0.14, tip: 0.55, lean: 0.35 },
};

// Light, clear colours so they read against the dark tinted glass card.
// `base` is the colour deep inside the cup; `stripe` paints flames (striped tulips).
const varieties = [
  { name: "Red tulips", shape: "cup", petal: "#ff5a5a", edge: "#ff8a80", base: "#ffd04a" },
  { name: "Pink tulips", shape: "cup", petal: "#ff9ac4", edge: "#ffc8de", base: "#fff0a8" },
  { name: "Yellow tulips", shape: "cup", petal: "#ffd84a", edge: "#fff0a0", base: "#ffb030" },
  { name: "White tulips", shape: "lily", petal: "#fbf6ee", edge: "#ffffff", base: "#e6f0b0" },
  { name: "Purple tulips", shape: "cup", petal: "#c49cff", edge: "#e2ccff", base: "#fff0c0" },
  { name: "Orange tulips", shape: "lily", petal: "#ff9a4a", edge: "#ffc27a", base: "#ffe060" },
  { name: "Flaming tulips", shape: "cup", petal: "#ffe066", edge: "#fff2b0", base: "#ffd04a", stripe: "#ff5a5a" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Red & yellow tulips", of: [0, 2] },
  { name: "Pink & white tulips", of: [1, 3] },
  { name: "Spring mix of tulips", of: [1, 2, 4] },
  { name: "Orange & purple tulips", of: [5, 4] },
  { name: "Red & white tulips", of: [0, 3] },
];

const BUD_GREEN = hexToRgb("#8fbf5a");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const B = hexToRgb(v.base);
  const St = v.stripe ? hexToRgb(v.stripe) : null;

  return {
    // t runs from the base of the cup (0) to the petal's tip (1); s across it
    petal: mesh.material({
      color(t, s, tag) {
        let c = mixRgb(B, P, smoothstep(0.02, 0.28, t));
        c = mixRgb(c, E, smoothstep(0.75, 1, t) * 0.6);
        // flames: a feathered stripe up the middle and along the edges
        if (St) {
          const flame = Math.max(0, Math.sin(s * 7 + hash3(tag, 2, 2) * 6) - 0.2) * smoothstep(0.3, 0.9, t);
          c = mixRgb(c, St, Math.min(1, flame * 1.3));
        }
        const k = 0.92 + 0.16 * hash3(tag, 3, 8);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.35,
      shine: 22,
      translucent: 0.3,
    }),
    bud: mesh.material({ color: (t) => mixRgb(BUD_GREEN, P, smoothstep(0.35, 0.85, t)), ks: 0.3, shine: 18, translucent: 0.2 }),
  };
}

// One petal of the cup, centred on angle `phi0` and `span` radians wide.
function petal(mesh, mat, { center, a, e1, e2, phi0, span, R, H, open, tip, inset, tag }) {
  mesh.surface(
    (u, t0) => {
      const s = u * 2 - 1;
      // the top edge: rounded, or pointed for lily-flowered tulips
      const t = t0 * (1 - (0.25 + tip * 0.6) * Math.pow(Math.abs(s), 1.4 - tip * 0.6));
      const phi = phi0 + s * span * 0.5;
      // the cup's profile: narrow at the base, widest just above halfway, curving in at the top
      const rho = R * inset * (0.28 + 0.78 * Math.sin(Math.PI * (0.12 + 0.62 * t))) + open * H * Math.pow(t, 3);
      return sum([center, 1], [a, H * t], [e1, Math.cos(phi) * rho], [e2, Math.sin(phi) * rho]);
    },
    7,
    8,
    mat,
    tag,
    (u, t0) => [t0, u * 2 - 1],
  );
}

// One tulip with its cup's base at `center`.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  // stand upright, leaning a little towards the bouquet's facing
  const a = norm(sum([[0, 1, 0], 1], [norm(axis), S.lean], [[(rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3], 1]));
  const [e1, e2] = basis(a);
  const R = size * S.width * (0.92 + rnd() * 0.16);
  const H = size * S.height * (0.92 + rnd() * 0.16);
  const twist = rnd() * TAU;
  const base = (tag + 1) * 1000;
  for (let k = 0; k < 6; k++) {
    const inner = k % 2 === 1;
    petal(mesh, mats.petal, {
      center,
      a,
      e1,
      e2,
      phi0: twist + (k * TAU) / 6 + (rnd() - 0.5) * 0.1,
      span: (TAU / 3) * (inner ? 1.05 : 1.2),
      R,
      H: H * (inner ? 0.96 : 1),
      open: S.open * (0.8 + rnd() * 0.4),
      tip: S.tip,
      inset: inner ? 0.9 : 1,
      tag: base + k,
    });
  }
}

// A bud: a tight, green-tinged egg, colouring up towards the tip.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(sum([norm(dir), 1], [[0, 1, 0], 0.6]));
  const [e1, e2] = basis(a);
  const L = size * 0.8;
  const R = size * 0.2;
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.7) * (1 + 0.06 * Math.cos(3 * phi));
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    12,
    mats.bud,
    tag,
  );
}

export default {
  id: "tulips",
  name: "Tulips",
  varieties,
  mixes,
  materials,
  bloom,
  bud,
};
