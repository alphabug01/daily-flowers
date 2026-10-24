// Orchids (moth orchids, Phalaenopsis), modelled in 3D. Each stem carries a
// short spray of flat-faced flowers: two broad, round petals like wings, three
// narrower sepals behind them, and a small, bright lip in the middle. Buds are
// little round beads along an arching tip.

import { sum, norm, basis, cross, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// Light, clear colours so they read against the dark tinted glass card.
// `lip` colours the middle lip, `eye` the patch at its throat; `spot` (if set)
// freckles the petals, as on harlequin orchids.
const varieties = [
  { name: "White orchids", petal: "#fbf9f6", edge: "#ffffff", lip: "#ff9ac0", eye: "#ffd84a" },
  { name: "Pink orchids", petal: "#ff9cc8", edge: "#ffc8e0", lip: "#e0408a", eye: "#ffe070" },
  { name: "Purple orchids", petal: "#d08cf0", edge: "#ecc4ff", lip: "#9a3ad0", eye: "#ffe070" },
  { name: "Yellow orchids", petal: "#ffe27a", edge: "#fff2b8", lip: "#ff6a4a", eye: "#ffffff" },
  { name: "Harlequin orchids", petal: "#fbf2f6", edge: "#ffffff", lip: "#c02a70", eye: "#ffd84a", spot: "#b8306e" },
  { name: "Green cymbidium orchids", petal: "#cce69a", edge: "#e6f4c4", lip: "#ff7a9a", eye: "#fff2c0" },
  { name: "Blush orchids", petal: "#ffd6e2", edge: "#fff2f6", lip: "#ff6a9a", eye: "#ffe070" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "White & pink orchids", of: [0, 1] },
  { name: "Purple & white orchids", of: [2, 0] },
  { name: "Harlequin & blush orchids", of: [4, 6] },
  { name: "Tropical orchids", of: [3, 1, 2] },
  { name: "Green & white orchids", of: [5, 0] },
];

// Sleek papers; orchids look best kept simple.
const wraps = [
  { name: "white linen", paper: "#ece8df", tissue: "#ffffff", pattern: "weave" },
  { name: "cream paper", paper: "#e8d8b8", tissue: "#ffffff", pattern: "fibre" },
  { name: "lilac paper", paper: "#b0a2de", tissue: "#f6f2ff", pattern: "stripes" },
  { name: "newsprint", paper: "#d2d4d8", tissue: "#f2efe6", pattern: "print" },
  { name: "sage linen", paper: "#a3bf98", tissue: "#f4f8ee", pattern: "weave" },
];

const STALK = hexToRgb("#5f8a3a");
const BUD_GREEN = hexToRgb("#9cc070");
const TAU = Math.PI * 2;

// Tags within a flower: petals and sepals end in 0-4, the lip in 5.
const LIP = 5;

function materials(mesh, v) {
  const P = hexToRgb(v.petal);
  const E = hexToRgb(v.edge);
  const Lp = hexToRgb(v.lip);
  const Ey = hexToRgb(v.eye);
  const Sp = v.spot ? hexToRgb(v.spot) : null;

  return {
    // t runs from the middle of the flower (0) out to the tip (1); s across it
    petal: mesh.material({
      color(t, s, tag) {
        let c;
        if (tag % 10 === LIP) {
          // a bright lip with a patch of colour at its throat
          c = mixRgb(Lp, Ey, (1 - smoothstep(0.15, 0.45, t)) * (1 - smoothstep(0.2, 0.6, Math.abs(s))));
        } else {
          c = mixRgb(P, E, smoothstep(0.6, 1, t) * 0.6);
          // a blush of the lip colour where the petals meet the middle
          c = mixRgb(c, Lp, (1 - smoothstep(0, 0.25, t)) * 0.35);
          // faint veins along the petal
          c = mixRgb(c, [c[0] * 0.9, c[1] * 0.88, c[2] * 0.9], (1 - smoothstep(0, 0.12, Math.abs(Math.sin(s * 8)))) * 0.35);
          if (Sp) {
            const spot = hash3(Math.floor(t * 9), Math.floor(s * 6 + 6), tag) < 0.3 ? 1 : 0;
            c = mixRgb(c, Sp, spot * smoothstep(0.2, 0.4, t) * 0.75);
          }
        }
        const k = 0.94 + 0.12 * hash3(tag, 2, 9);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.4,
      shine: 26,
      translucent: 0.35,
      outline: 0.02,
    }),
    stalk: mesh.material({ color: () => STALK, ks: 0.25, shine: 12 }),
    bud: mesh.material({ color: (t) => mixRgb(BUD_GREEN, P, smoothstep(0.2, 0.8, t)), ks: 0.35, shine: 20, translucent: 0.3 }),
  };
}

// One flat-faced orchid flower at `c`, facing `n`, with `up` its top.
function flower(mesh, mat, { c, n, up, size, rnd, tag }) {
  const side = cross(up, n);
  // a direction in the flower's face, `ang` radians round from its top
  const dirAt = (ang) => sum([up, Math.cos(ang)], [side, Math.sin(ang)]);
  const leaf = (ang, len, W, round, bend, t2) => {
    const d = dirAt(ang);
    const b = cross(n, d);
    mesh.surface(
      (t, v01) => {
        const s = v01 * 2 - 1;
        // rounded at the tip, pinched at the base
        const w = W * Math.pow(Math.sin(Math.PI * Math.pow(t, round)), 0.6) + 0.002;
        // cupped forwards a little, the tip curling back
        return sum([c, 1], [d, len * t], [b, s * w], [n, size * 0.04 * s * s - bend * t * t]);
      },
      8,
      5,
      mat,
      t2,
      (t, v01) => [t, v01 * 2 - 1],
    );
  };
  const j = () => (rnd() - 0.5) * 0.12;
  // three sepals: one at the top, two angled down behind the petals
  leaf(0 + j(), size * 0.36, size * 0.075, 0.75, size * 0.03, tag);
  leaf((TAU * 2) / 5 + 0.35 + j(), size * 0.36, size * 0.07, 0.75, size * 0.03, tag + 1);
  leaf((-TAU * 2) / 5 - 0.35 + j(), size * 0.36, size * 0.07, 0.75, size * 0.03, tag + 2);
  // two broad, round petals out to the sides, a little in front
  const front = sum([c, 1], [n, size * 0.012]);
  for (const [k, ang] of [[3, Math.PI / 2 - 0.25], [4, -Math.PI / 2 + 0.25]]) {
    const d = dirAt(ang + j());
    const b = cross(n, d);
    mesh.surface(
      (t, v01) => {
        const s = v01 * 2 - 1;
        const w = size * 0.15 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.5)), 0.55) + 0.002;
        return sum([front, 1], [d, size * 0.34 * t], [b, s * w], [n, size * 0.03 * s * s - size * 0.02 * t * t]);
      },
      8,
      6,
      mat,
      tag + k,
      (t, v01) => [t, v01 * 2 - 1],
    );
  }
  // the lip: a small scoop hanging below the middle, forward of everything
  const down = dirAt(Math.PI);
  const b = cross(n, down);
  const lipAt = sum([c, 1], [n, size * 0.04]);
  mesh.surface(
    (t, v01) => {
      const s = v01 * 2 - 1;
      // two side lobes near the base, then a narrower tip
      const w = size * (0.07 * Math.sin(Math.PI * Math.min(1, t * 1.6)) + 0.035 * Math.sin(Math.PI * t)) + 0.002;
      return sum([lipAt, 1], [down, size * 0.2 * t], [b, s * w], [n, size * 0.05 * (1 - s * s) * Math.sin(Math.PI * t) + size * 0.03 * t]);
    },
    7,
    5,
    mat,
    tag + LIP,
    (t, v01) => [t, v01 * 2 - 1],
  );
}

// One spray of orchids: a big flower at `center` and a smaller one further
// along the arching stalk.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const n = norm(axis);
  // the face's top: as near straight up as the facing allows
  const [e1] = basis(n);
  const upRaw = sum([[0, 1, 0], 1], [n, -n[1]]);
  const up = Math.hypot(...upRaw) > 0.2 ? norm(upRaw) : e1;
  const side = norm(cross(up, n));
  const base = (tag + 1) * 1000;
  const S = size * 1.25;

  flower(mesh, mats.petal, { c: center, n, up, size: S, rnd, tag: base });

  // the second flower sits up and off to one side, turned a little away
  const dir = center[0] < 0 ? -1 : 1;
  const c2 = sum([center, 1], [up, S * 0.42], [side, dir * S * 0.48], [n, -S * 0.08]);
  const n2 = norm(sum([n, 1], [side, dir * 0.35], [up, 0.15]));
  const up2 = norm(sum([up, 1], [n2, -0.15]));
  flower(mesh, mats.petal, { c: c2, n: n2, up: up2, size: S * 0.82, rnd, tag: base + 10 });

  // the stalk joining them, arching on past the second flower to a few buds
  const back = (p) => sum([p, 1], [n, -S * 0.04]);
  const tip = sum([c2, 1], [up, S * 0.32], [side, dir * S * 0.28]);
  mesh.line([back(center), back(sum([center, 1], [up, S * 0.28], [side, dir * S * 0.15])), back(c2), tip], mats.stalk, base + 99);
  for (let k = 0; k < 2; k++) {
    const p = sum([c2, 1], [up, S * (0.18 + 0.12 * k)], [side, dir * S * (0.16 + 0.11 * k)]);
    budBead(mesh, mats.bud, p, n, S * (0.045 - 0.012 * k), base + 90 + k);
  }
}

// A small round bud.
function budBead(mesh, mat, c, a, R, tag) {
  const [e1, e2] = basis(a);
  mesh.surface(
    (t, w) => {
      const phi = w * TAU;
      const th = Math.PI * (1 - t);
      return sum([c, 1], [a, Math.cos(th) * R], [e1, Math.sin(th) * Math.cos(phi) * R * 1.1], [e2, Math.sin(th) * Math.sin(phi) * R]);
    },
    6,
    8,
    mat,
    tag,
    (t) => [t, 0],
  );
}

// A bud spray: an arching tip with a row of buds, biggest first.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1] = basis(a);
  const pts = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    pts.push(sum([base, 1], [a, size * 0.75 * t], [e1, size * 0.35 * t * t]));
  }
  mesh.line(pts, mats.stalk, tag);
  for (let k = 0; k < 3; k++) {
    const p = pts[k + 1];
    budBead(mesh, mats.bud, sum([p, 1], [e1, -size * 0.04]), a, size * (0.12 - 0.025 * k), tag);
  }
}

export default {
  id: "orchids",
  name: "Orchids",
  varieties,
  mixes,
  wraps,
  materials,
  bloom,
  bud,
};
