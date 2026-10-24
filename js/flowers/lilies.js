// Lilies, modelled in 3D. To add another flower later (roses, tulips...),
// make a file like this one that exports the same shape of object
// (varieties, mixes, materials, bloom, bud) and register it in flowers/index.js.

import { sum, cross, norm, lerp, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// How each kind of lily holds its six petals (tepals).
// `width` is half the petal's width, as a fraction of the flower size.
// Angles are measured from the flower's axis: base is how the petal leaves the
// throat, tip is how far it has curled by the end (more than ~1.6 = recurved).
const SHAPES = {
  // big open Orientals: Stargazer, Casa Blanca
  oriental: { len: 1.0, width: 0.17, base: 0.75, tip: 1.85, curve: 1.7, cup: 0.35, ruffle: 0.045, stamens: 0.36 },
  // flatter, upward-facing Asiatics
  asiatic: { len: 0.92, width: 0.16, base: 1.0, tip: 1.65, curve: 1.4, cup: 0.22, ruffle: 0, stamens: 0.46 },
  // tiger lilies: petals swept right back, stamens hanging out
  turkscap: { len: 0.88, width: 0.12, base: 0.9, tip: 2.6, curve: 1.15, cup: 0.2, ruffle: 0, stamens: 0.34 },
  // long trumpets that only flare at the mouth
  trumpet: { len: 1.15, width: 0.15, base: 0.35, tip: 1.6, curve: 2.8, cup: 0.5, ruffle: 0.015, stamens: 0.14 },
};

const varieties = [
  {
    name: "Stargazer lilies", shape: "oriental",
    petal: "#e8327a", edge: "#fff0f6", edgeAmt: 0.85, throat: "#f6f0cf",
    stripe: "#b8185a", spot: "#7d0b37", spots: 0.34, anther: "#a8401c", bud: "#d9608f",
  },
  {
    name: "Casa Blanca lilies", shape: "oriental",
    petal: "#fbf8f1", edge: "#ffffff", edgeAmt: 0.3, throat: "#d4e69a",
    stripe: "#eef3c4", spot: "#e8d690", spots: 0.08, anther: "#b5521f", bud: "#dde9c2",
  },
  {
    name: "Tiger lilies", shape: "turkscap",
    petal: "#ff7a1a", edge: "#ff9a42", edgeAmt: 0.3, throat: "#ffb347",
    spot: "#3a0c04", spots: 0.4, anther: "#5a1a0a", bud: "#f08a3a",
  },
  {
    name: "Golden Splendor lilies", shape: "trumpet",
    petal: "#ffd23a", edge: "#fff0a0", edgeAmt: 0.45, throat: "#ff9a1f",
    stripe: "#e0a020", spot: "#d07a10", spots: 0, anther: "#a0461a", bud: "#d8c25a",
  },
  {
    name: "Apricot Fudge lilies", shape: "asiatic",
    petal: "#ffa66a", edge: "#ffd6b5", edgeAmt: 0.6, throat: "#ffcf73",
    spot: "#c4552c", spots: 0.12, anther: "#8a3518", bud: "#f2b48a",
  },
  {
    name: "Red Velvet lilies", shape: "asiatic",
    petal: "#d8182f", edge: "#ee3a52", edgeAmt: 0.4, throat: "#8a0a1a",
    spot: "#4a0410", spots: 0.22, anther: "#6a1a0c", bud: "#b8323e",
  },
  {
    name: "Lavender Dream lilies", shape: "oriental",
    petal: "#c7a4ff", edge: "#f4ecff", edgeAmt: 0.75, throat: "#fff3c4",
    stripe: "#a27af5", spot: "#6a3cc8", spots: 0.2, anther: "#b0521e", bud: "#d6c0ff",
  },
  {
    name: "Pink Perfection lilies", shape: "trumpet",
    petal: "#ef6aa0", edge: "#ffc6dd", edgeAmt: 0.55, throat: "#ffe39a",
    stripe: "#c9407a", spot: "#a02a60", spots: 0, anther: "#a8401c", bud: "#e58ab0",
  },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Stargazer & Casa Blanca lilies", of: [0, 1] },
  { name: "Tiger & Golden lilies", of: [2, 3] },
  { name: "Apricot & white lilies", of: [4, 1] },
  { name: "Lavender & pink lilies", of: [6, 7] },
  { name: "Sunset mix of lilies", of: [2, 5, 3] },
];

const BUD_GREEN = hexToRgb("#7fae55");

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const T = hexToRgb(v.throat);
  const St = v.stripe ? hexToRgb(v.stripe) : null;
  const Sp = hexToRgb(v.spot);
  const B = hexToRgb(v.bud);

  return {
    petal: mesh.material({
      // t runs from the throat (0) to the tip (1); s across the petal (-1..1)
      color(t, s, tag) {
        const as = Math.abs(s);
        let c = mixRgb(P, E, smoothstep(0.35, 1, as) * v.edgeAmt);
        if (St) c = mixRgb(c, St, (1 - smoothstep(0, 0.3, as)) * smoothstep(0.08, 0.3, t) * (1 - smoothstep(0.55, 0.9, t)) * 0.7);
        c = mixRgb(c, T, (1 - smoothstep(0.02, 0.32, t)) * 0.8);
        if (v.spots && t > 0.1 && t < 0.62 && as < 0.7) {
          if (hash3(Math.floor(t * 18), Math.floor((s + 1) * 6), tag) < v.spots * (1.1 - t) * 0.6) c = mixRgb(c, Sp, 0.75);
        }
        const k = 0.88 + 0.24 * hash3(tag >> 3, 11, 5);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.22,
      shine: 14,
      translucent: 0.45,
    }),
    filament: mesh.material({ color: () => [0.84, 0.9, 0.66], ks: 0.2, shine: 8, fine: true }),
    anther: mesh.material({ color: () => hexToRgb(v.anther), ks: 0.1, shine: 6 }),
    pistil: mesh.material({ color: () => [0.78, 0.88, 0.6], ks: 0.2, shine: 8, glow: 0.1 }),
    bud: mesh.material({
      color: (t) => mixRgb(BUD_GREEN, B, smoothstep(0.25, 0.95, t)),
      ks: 0.3,
      shine: 16,
      translucent: 0.2,
    }),
  };
}

// One open lily: six curling petals, six stamens and a pistil.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const a = norm(axis);
  const [e1, e2] = basis(a);
  const twist = rnd() * Math.PI * 2;

  for (let k = 0; k < 6; k++) {
    const inner = k % 2 === 1;
    const phi = twist + (k * Math.PI) / 3 + (rnd() - 0.5) * 0.12;
    const r = sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
    const b = cross(a, r);
    const L = size * S.len * (inner ? 0.96 : 1.04) * (0.94 + rnd() * 0.12);
    const W = size * S.width * (inner ? 1.18 : 0.92);
    const th0 = S.base + (rnd() - 0.5) * 0.12;
    const th1 = S.tip + (rnd() - 0.5) * 0.35;
    const theta = (t) => th0 + (th1 - th0) * Math.pow(t, S.curve);

    // walk the petal's midrib out from the throat
    const N = 24;
    const spine = [sum([center, 1], [r, size * 0.04])];
    for (let i = 1; i <= N; i++) {
      const th = theta((i - 0.5) / N);
      spine.push(sum([spine[i - 1], 1], [a, (L / N) * Math.cos(th)], [r, (L / N) * Math.sin(th)]));
    }

    const ruffle = S.ruffle * size;
    const petal = (t, v01) => {
      const s = v01 * 2 - 1;
      const f = t * N;
      const i = Math.min(N - 1, Math.floor(f));
      const p = lerp(spine[i], spine[i + 1], f - i);
      const th = theta(t);
      const T = sum([a, Math.cos(th)], [r, Math.sin(th)]);
      const n = cross(b, T);
      // narrow at the throat, widest a third of the way out, pointed tip
      const w = W * (0.28 * (1 - t) * (1 - t) + Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.85)) + 0.002;
      const cup = S.cup * w * s * s;
      const rib = 0.06 * S.cup * w * (1 - s * s);
      const wave = ruffle * Math.pow(Math.abs(s), 3) * Math.sin(t * 9 + k * 1.7);
      return sum([p, 1], [b, s * w], [n, -cup + rib + wave]);
    };
    mesh.surface(petal, 12, 6, mats.petal, tag + k, (u, v01) => [u, v01 * 2 - 1]);
  }

  // stamens: pale filaments ending in rust-coloured anthers
  const fil = size * S.len * 0.5;
  for (let j = 0; j < 6; j++) {
    const phi = twist + (j * Math.PI) / 3 + Math.PI / 6;
    const r = sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const ang = S.stamens * (0.5 + 0.8 * t);
      pts.push(sum([center, 1], [a, Math.cos(ang) * fil * t], [r, Math.sin(ang) * fil * t]));
    }
    mesh.line(pts, mats.filament, tag);
    mesh.point(pts[6], mats.anther, j % 2 ? "0" : "o", tag);
  }

  // pistil with its three-lobed tip
  const bend = sum([e1, Math.cos(twist)], [e2, Math.sin(twist)]);
  const pist = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pist.push(sum([center, 1], [a, fil * 1.08 * t], [bend, fil * 0.12 * t * t]));
  }
  mesh.line(pist, mats.pistil, tag);
  mesh.point(pist[6], mats.pistil, "*", tag);
}

// A closed bud: long, ridged and pointed, green at the base.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const L = size * 0.95;
  const R = size * 0.15;
  mesh.surface(
    (t, v) => {
      const phi = v * Math.PI * 2;
      const prof = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.55)), 0.9) * (1 + 0.13 * Math.cos(3 * phi));
      return sum([base, 1], [a, L * t], [e1, Math.cos(phi) * prof], [e2, Math.sin(phi) * prof]);
    },
    10,
    12,
    mats.bud,
    tag,
  );
}

export default {
  id: "lilies",
  name: "Lilies",
  varieties,
  mixes,
  materials,
  bloom,
  bud,
};
