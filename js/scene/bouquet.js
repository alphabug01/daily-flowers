// Arranges a whole bouquet in 3D: flowers over a dome, stems gathered at the
// tie, leaves, baby's breath, a crinkled paper cone and a satin bow.
// y is up, z points towards the viewer.

import { Mesh } from "./mesh.js";
import { add, sub, scale, dot, cross, norm, sum, bezier, hexToRgb, mixRgb, smoothstep, hash3 } from "./math.js";
import { seeded, pick, int } from "../random.js";

const TIE = [0, -1.3, 0];
const DOME = [0, 0.45, 0];
const DOME_R = 1.15;

// Hand-placed arrangements: [x, y, z] position and the way each lily faces.
// Each day jitters one of these a little, so they stay readable but vary.
const ARRANGEMENTS = [
  [ // classic dome of five
    { at: [0, 1.25, 0.05], face: [0, 0.35, 1] },
    { at: [-1.0, 0.6, 0.2], face: [-0.5, 0.2, 1] },
    { at: [1.0, 0.7, 0.15], face: [0.5, 0.25, 1] },
    { at: [-0.25, 0.05, 0.75], face: [-0.1, -0.05, 1] },
    { at: [0.75, -0.05, 0.6], face: [0.35, -0.1, 1] },
  ],
  [ // tall triangle of four
    { at: [0.1, 1.45, -0.1], face: [0.05, 0.45, 1] },
    { at: [-0.8, 0.55, 0.35], face: [-0.35, 0.15, 1] },
    { at: [0.85, 0.45, 0.3], face: [0.4, 0.1, 1] },
    { at: [0, -0.1, 0.8], face: [0, -0.05, 1] },
  ],
  [ // three big blooms
    { at: [-0.65, 0.95, 0.15], face: [-0.35, 0.3, 1] },
    { at: [0.7, 0.85, 0.2], face: [0.4, 0.25, 1] },
    { at: [0.05, 0.0, 0.7], face: [0, 0, 1] },
  ],
  [ // cascading, heavier on one side
    { at: [-0.55, 1.35, -0.05], face: [-0.2, 0.45, 1] },
    { at: [0.6, 1.0, 0.1], face: [0.35, 0.35, 1] },
    { at: [-1.05, 0.25, 0.35], face: [-0.55, 0, 1] },
    { at: [0.25, 0.1, 0.75], face: [0.1, -0.05, 1] },
  ],
];

// Default papers and ribbons. A flower can bring its own lists instead
// (`wraps`, `ribbons`) so the paper sets off its colours rather than clashing.
// `pattern` is one of the kinds in paperPattern() below.
const WRAPS = [
  { name: "kraft paper", paper: "#c49565", tissue: "#f3ead8", pattern: "fibre" },
  { name: "blush tissue", paper: "#e9a7b8", tissue: "#fff4f6", pattern: "dots" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
  { name: "lilac paper", paper: "#b0a2de", tissue: "#f6f2ff", pattern: "stripes" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
];

const RIBBONS = [
  { name: "red", color: "#e8324f" },
  { name: "gold", color: "#f2b632" },
  { name: "ivory", color: "#f8f3e6" },
  { name: "violet", color: "#9b5de5" },
  { name: "sky", color: "#3fb6e8" },
];

const fract = (x) => x - Math.floor(x);

function paperPattern(kind, base, a, b) {
  let k = 1;
  if (kind === "fibre") k = 0.9 + 0.1 * hash3(Math.floor(a * 220), Math.floor(b * 50), 7);
  if (kind === "dots") k = fract(a * 48) < 0.25 && fract(b * 16) < 0.25 ? 1.12 : 0.97;
  if (kind === "weave") k = Math.sin(a * 700) * Math.sin(b * 160) > 0 ? 1.03 : 0.93;
  if (kind === "stripes") k = fract(a * 28) < 0.5 ? 1.06 : 0.93;
  if (kind === "print") k = Math.floor(b * 40) % 2 === 0 && fract(a * 36) < 0.8 ? 0.78 : 1.02;
  return [base[0] * k, base[1] * k, base[2] * k];
}

// Spread directions over the front of a dome, keeping them apart.
function scatter(rnd, count, minAngle, avoid = [], { elev = [0.15, 1.45], azim = 1.9 } = {}) {
  const out = [];
  for (let tries = 0; tries < 3000 && out.length < count; tries++) {
    const e = elev[0] + rnd() * (elev[1] - elev[0]);
    const az = (rnd() * 2 - 1) * azim * (out.length === 0 ? 0.3 : 1);
    const d = [Math.cos(e) * Math.sin(az), Math.sin(e), Math.cos(e) * Math.cos(az)];
    const far = (list, ang) => list.every((o) => Math.acos(Math.min(1, dot(o, d))) > ang);
    if (far(out, minAngle) && far(avoid, minAngle * 0.55)) out.push(d);
  }
  return out;
}

function stem(mesh, mat, from, back, spread) {
  const p1 = sum([from, 1], [back, -0.35]);
  const p2 = add(TIE, [spread[0] * 0.3, 1.1, spread[2] * 0.3]);
  const p3 = add(TIE, [spread[0] * 0.1, -0.5, spread[2] * 0.1]);
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const p = bezier(from, p1, p2, p3, i / 18);
    if (p[1] < TIE[1] + 0.6) pts.push(p);
  }
  if (pts.length > 1) mesh.line(pts, mat);
}

// `colour` picks the colour instead of leaving it to the day: { variety: i }
// for one of the flower's varieties, or { mix: i } for one of its mixes.
export function buildBouquet(key, flower, colour) {
  const rnd = seeded(key);
  const mesh = new Mesh();

  let tones;
  let title;
  if (colour?.mix !== undefined) {
    const mix = flower.mixes[colour.mix];
    tones = mix.of.map((i) => flower.varieties[i]);
    title = mix.name;
  } else if (colour?.variety !== undefined) {
    const variety = flower.varieties[colour.variety];
    tones = [variety];
    title = variety.name;
  } else if (flower.mixes?.length && rnd() < 0.7) {
    const mix = pick(rnd, flower.mixes);
    tones = mix.of.map((i) => flower.varieties[i]);
    title = mix.name;
  } else {
    const variety = pick(rnd, flower.varieties);
    tones = [variety];
    title = variety.name;
  }
  const wrap = pick(rnd, flower.wraps ?? WRAPS);
  const ribbon = pick(rnd, flower.ribbons ?? RIBBONS);
  const toneMats = tones.map((t) => flower.materials(mesh, t));

  const stemMat = mesh.material({ color: () => hexToRgb("#4f9a3c"), ks: 0.25, shine: 12 });
  const leafDark = hexToRgb("#2f7a35");
  const leafLight = hexToRgb("#7fbf5f");
  const leafMat = mesh.material({
    color: (t, s) => mixRgb(leafDark, leafLight, (1 - smoothstep(0, 0.18, Math.abs(s))) * 0.7 + t * 0.15),
    ks: 0.35,
    shine: 18,
    translucent: 0.3,
  });
  const fillerMat = mesh.material({ color: () => [0.97, 0.97, 0.94], ks: 0, shine: 1, glow: 0.12 });
  const fillerStem = mesh.material({ color: () => hexToRgb("#8fb070"), ks: 0.1, shine: 6 });
  const paperBase = hexToRgb(wrap.paper);
  const paperMat = mesh.material({ color: (a, b) => paperPattern(wrap.pattern, paperBase, a, b), ks: 0.08, shine: 5, translucent: 0.15, inside: 0.45 });
  const tissueBase = hexToRgb(wrap.tissue);
  const tissueMat = mesh.material({ color: () => tissueBase, ks: 0.05, shine: 4, translucent: 0.4, inside: 0.55 });
  const ribbonBase = hexToRgb(ribbon.color);
  const ribbonMat = mesh.material({ color: () => ribbonBase, ks: 0.75, shine: 40 });

  // ---- flowers ----
  const flip = rnd() < 0.5 ? -1 : 1;
  const slots = pick(rnd, ARRANGEMENTS);
  const dirs = [];
  slots.forEach((slot, i) => {
    const tone = int(rnd, 0, tones.length - 1);
    const size = 1.05 + rnd() * 0.1;
    const jitter = () => (rnd() - 0.5) * 0.16;
    const center = [slot.at[0] * 1.3 * flip + jitter(), slot.at[1] * 1.2 + jitter(), slot.at[2] + jitter()];
    const axis = norm([slot.face[0] * flip + jitter(), slot.face[1] + jitter(), slot.face[2]]);
    const d = norm(sub(center, DOME));
    dirs.push(d);
    flower.bloom(mesh, toneMats[tone], tones[tone], { center, axis, size, rnd, tag: i * 8 });
    stem(mesh, stemMat, sum([center, 1], [axis, -0.05]), axis, d);
  });

  // ---- buds ----
  const budDirs = scatter(rnd, int(rnd, 1, 2), 0.45, dirs, { elev: [0.9, 1.4], azim: 1.2 });
  budDirs.forEach((d, i) => {
    const tone = int(rnd, 0, tones.length - 1);
    const base = add(DOME, scale(d, DOME_R * 1.55));
    const dir = norm(add(d, [0, 0.7, 0.1]));
    flower.bud(mesh, toneMats[tone], { base, dir, size: 0.42 + rnd() * 0.08, tag: 100 + i });
    stem(mesh, stemMat, base, dir, d);
  });

  // ---- baby's breath ----
  const fillerDirs = scatter(rnd, int(rnd, 4, 7), 0.3, [...dirs, ...budDirs], { elev: [0.1, 1.4], azim: 2.0 });
  for (const d of fillerDirs) {
    const c = add(DOME, scale(d, DOME_R * (1.3 + rnd() * 0.2)));
    const n = int(rnd, 6, 12);
    for (let i = 0; i < n; i++) {
      const p = add(c, [(rnd() - 0.5) * 0.28, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.2]);
      mesh.point(p, fillerMat, rnd() < 0.55 ? "o" : rnd() < 0.5 ? "*" : ".");

    }

  }

  // ---- paper cone ----
  const rTie = 0.17;
  const ph = rnd() * 6;
  const topY = (phi) => -0.5 + 0.7 * (1 - Math.cos(phi)) * 0.5 + 0.06 * Math.sin(9 * phi + ph);
  const cone = (inset, lift, crinkle, ruffle) => (u, v) => {
    const phi = u * Math.PI * 2;
    const top = topY(phi) + lift + ruffle * Math.sin(7 * phi + ph * 2);
    const y = TIE[1] + v * (top - TIE[1]);
    const r = (rTie + (y - TIE[1]) * 1.0) * inset * (1 + crinkle * v * Math.sin(11 * phi + 3 * v + ph));
    return [r * Math.sin(phi), y, r * Math.cos(phi)];
  };
  mesh.surface(cone(0.96, 0.16, 0.06, 0.07), 56, 10, tissueMat);
  mesh.surface(cone(1, 0, 0.035, 0), 56, 12, paperMat);
  // the paper flares a little below the tie
  mesh.surface((u, v) => {
    const phi = u * Math.PI * 2;
    const r = rTie + v * 0.13 * (1 + 0.15 * Math.sin(9 * phi));
    return [r * Math.sin(phi), TIE[1] - v * 0.24, r * Math.cos(phi)];
  }, 32, 3, paperMat);

  // ---- leaves: a bed of foliage behind the flowers, fanning out of the paper ----
  const leafCount = int(rnd, 9, 12);
  for (let i = 0; i < leafCount; i++) {
    const side = i % 2 ? 1 : -1;
    const phi = side * (0.7 + (i / leafCount) * 2.2 + rnd() * 0.3);
    const out = [Math.sin(phi), 0, Math.cos(phi)];
    const top = topY(phi);
    const rim = rTie + (top - TIE[1]) * 1.0;
    const base = [out[0] * rim * 0.55, top - 0.35, out[2] * rim * 0.55];
    const reach = 0.8 + rnd() * 0.6;
    const rise = 1.0 + rnd() * 1.1;
    const p1 = sum([base, 1], [[0, 1, 0], 0.6 * rise], [out, 0.15]);
    const p2 = sum([base, 1], [[0, 1, 0], 0.95 * rise], [out, 0.6 * reach]);
    const p3 = sum([base, 1], [[0, 1, 0], (0.6 + rnd() * 0.4) * rise], [out, 1.05 * reach]);
    const twist = (rnd() - 0.5) * 1.2;
    mesh.surface(
      (t, v01) => {
        const s = v01 * 2 - 1;
        const p = bezier(base, p1, p2, p3, t);
        const T = norm(sub(bezier(base, p1, p2, p3, Math.min(1, t + 0.01)), bezier(base, p1, p2, p3, Math.max(0, t - 0.01))));
        let b = norm(cross(T, out));
        const n0 = cross(T, b);
        const tw = twist * t;
        b = sum([b, Math.cos(tw)], [n0, Math.sin(tw)]);
        const n = cross(T, b);
        const w = 0.11 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.8) + 0.002;
        return sum([p, 1], [b, s * w], [n, 0.35 * w * Math.abs(s)]);
      },
      14,
      4,
      leafMat,
      200 + i,
      (u, v01) => [u, v01 * 2 - 1],
    );
  }

  // ---- satin bow at the tie ----
  mesh.surface((u, v) => {
    const phi = u * Math.PI * 2;
    const r = rTie + 0.025;
    return [r * Math.sin(phi), TIE[1] - 0.05 + v * 0.11, r * Math.cos(phi)];
  }, 32, 2, ribbonMat);
  const knot = [0, TIE[1] + 0.01, rTie + 0.07];
  for (const side of [-1, 1]) {
    const c = add(knot, [side * 0.2, 0.05, -0.01]);
    const tilt = side * -0.35;
    mesh.surface((u, v) => {
      const th = u * Math.PI * 2;
      const ph2 = v * Math.PI;
      const x = 0.19 * Math.sin(ph2) * Math.cos(th);
      const y = 0.1 * Math.sin(ph2) * Math.sin(th);
      const z = 0.06 * Math.cos(ph2);
      return [c[0] + x * Math.cos(tilt) - y * Math.sin(tilt), c[1] + x * Math.sin(tilt) + y * Math.cos(tilt), c[2] + z];
    }, 16, 8, ribbonMat);
    // tails
    const end = add(knot, [side * 0.24, -0.45, 0.04]);
    const mid = add(knot, [side * 0.08, -0.22, 0.06]);
    mesh.surface((t, v01) => {
      const s = v01 * 2 - 1;
      const p = bezier(knot, mid, mid, end, t);
      const T = norm(sub(end, knot));
      const w = norm(cross(T, [0, 0, 1]));
      return sum([p, 1], [w, s * 0.045], [[0, 0, 1], 0.02 * Math.sin(t * 6)]);
    }, 8, 2, ribbonMat);
  }
  mesh.surface((u, v) => {
    const th = u * Math.PI * 2;
    const ph2 = v * Math.PI;
    return [knot[0] + 0.07 * Math.sin(ph2) * Math.cos(th), knot[1] + 0.06 * Math.sin(ph2) * Math.sin(th), knot[2] + 0.04 * Math.cos(ph2) + 0.02];
  }, 10, 6, ribbonMat);

  mesh.finish();

  return { mesh, title, wrapName: wrap.name, ribbonName: ribbon.name };
}
