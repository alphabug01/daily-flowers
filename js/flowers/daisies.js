// Daisies, modelled in 3D. Each head is a domed yellow (or dark) centre ringed
// with thin ray petals. Daisies are small, so each place in the arrangement
// holds a little bunch of heads on short stalks rather than a single bloom.
// Gerberas are bigger, one or two to a place, with a second ring of short rays;
// chamomile is tiny, with a tall cone and rays that fold back.

import { sum, cross, norm, basis, hexToRgb, mixRgb, smoothstep, hash3 } from "../scene/math.js";

// As fractions of the flower size. `heads` per place, each `head` across;
// `disc` is the centre's radius and `dome` how high it rises (as a fraction of
// its radius). Rays: `rays` in each of `layers`, `len` long and `width` wide,
// leaving the centre at `lean` radians from the face and ending at `droop`.
const SHAPES = {
  daisy: { heads: [3, 4], head: 0.5, disc: 0.2, dome: 0.35, rays: 24, layers: 1, len: 0.62, width: 0.05, lean: 1.5, droop: 1.62 },
  gerbera: { heads: [1, 2], head: 0.85, disc: 0.2, dome: 0.15, rays: 22, layers: 2, len: 0.55, width: 0.055, lean: 1.4, droop: 1.6 },
  chamomile: { heads: [4, 5], head: 0.32, disc: 0.24, dome: 0.8, rays: 16, layers: 1, len: 0.5, width: 0.06, lean: 1.75, droop: 2.25 },
};

// Light, clear colours so they read against the dark tinted glass card.
const varieties = [
  { name: "Shasta daisies", shape: "daisy", ray: "#fbfbf4", tip: "#ffffff", disc: "#ffcc33", ring: "#f0a020" },
  { name: "Pink-tipped daisies", shape: "daisy", ray: "#fbf6f6", tip: "#ff9ac0", disc: "#ffcc33", ring: "#f0a020" },
  { name: "Pink gerbera daisies", shape: "gerbera", ray: "#ff8ab8", tip: "#ffb4d2", disc: "#6a4424", ring: "#ffd04a" },
  { name: "Orange gerbera daisies", shape: "gerbera", ray: "#ff9a3a", tip: "#ffbc6a", disc: "#6a4424", ring: "#ffd04a" },
  { name: "Yellow gerbera daisies", shape: "gerbera", ray: "#ffd84a", tip: "#ffe98a", disc: "#7a5a24", ring: "#ffb030" },
  { name: "Red gerbera daisies", shape: "gerbera", ray: "#ff5a50", tip: "#ff8a70", disc: "#5a3420", ring: "#ffd04a" },
  { name: "Chamomile", shape: "chamomile", ray: "#fbfbf4", tip: "#ffffff", disc: "#ffd23a", ring: "#f2b02a" },
];

// Days where two or three varieties are mixed in the same bouquet.
const mixes = [
  { name: "Pink & white daisies", of: [0, 1] },
  { name: "Daisies & chamomile", of: [0, 6] },
  { name: "Sunny gerbera mix", of: [3, 4] },
  { name: "Rainbow gerberas", of: [2, 3, 4] },
  { name: "Gerberas & daisies", of: [2, 0] },
];

const SEPAL = hexToRgb("#6fae4a");
const STALK = hexToRgb("#5f9e44");
const TAU = Math.PI * 2;

function materials(mesh, v) {
  const R = hexToRgb(v.ray);
  const T = hexToRgb(v.tip);
  const D = hexToRgb(v.disc);
  const Ri = hexToRgb(v.ring);

  return {
    // t runs from the centre (0) to the ray's tip (1)
    ray: mesh.material({
      color(t, s, tag) {
        let c = mixRgb(R, T, smoothstep(0.45, 1, t));
        c = mixRgb(c, [c[0] * 0.85, c[1] * 0.85, c[2] * 0.8], 1 - smoothstep(0, 0.2, t));
        const k = 0.93 + 0.14 * hash3(tag, 6, 1);
        return [c[0] * k, c[1] * k, c[2] * k];
      },
      ks: 0.15,
      shine: 12,
      translucent: 0.45,
      // rays lie close together, so outline even small overlaps
      outline: 0.03,
    }),
    // r runs from the middle (0) to the edge (1) of the centre
    disc: mesh.material({
      color(r, a, tag) {
        // tiny florets: a fine speckle, with a brighter ring of open ones at the edge
        const speck = hash3(Math.floor(r * 14), Math.floor(a * 60), tag);
        let c = mixRgb(D, [D[0] * 0.75, D[1] * 0.7, D[2] * 0.6], speck * 0.5);
        c = mixRgb(c, Ri, smoothstep(0.7, 0.95, r));
        return c;
      },
      ks: 0.1,
      shine: 6,
    }),
    stalk: mesh.material({ color: () => STALK, ks: 0.15, shine: 8 }),
    sepal: mesh.material({ color: () => SEPAL, ks: 0.2, shine: 10, translucent: 0.3 }),
    bud: mesh.material({ color: (t) => mixRgb(SEPAL, R, smoothstep(0.7, 0.95, t) * 0.7), ks: 0.2, shine: 10 }),
  };
}

// A thin ray growing out from `root` along `r`, bending from `th0` to `th1`
// radians away from the face `a`.
function ray(mesh, mat, { root, a, r, len, width, th0, th1, tag }) {
  const b = cross(a, r);
  const N = 6;
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
      const n = cross(b, sum([a, Math.cos(th)], [r, Math.sin(th)]));
      // strap-shaped, with a rounded tip
      const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.55 + 0.45 * Math.pow(t, 3))), 0.5) + 0.002;
      return sum([p, 1], [b, s * w], [n, -0.25 * w * s * s]);
    },
    N,
    2,
    mat,
    tag,
    (u, v01) => [u, v01 * 2 - 1],
  );
}

// One daisy head of radius `size` facing `a`, centred on `center`.
function head(mesh, mats, S, { center, a, size, rnd, tag }) {
  const [e1, e2] = basis(a);
  const Rd = size * S.disc;
  const twist = rnd() * TAU;
  const radial = (phi) => sum([e1, Math.cos(phi)], [e2, Math.sin(phi)]);

  mesh.surface(
    (r, w) => sum([center, 1], [a, Rd * S.dome * (1 - r * r)], [radial(w * TAU), Rd * r]),
    5,
    20,
    mats.disc,
    tag + 99,
  );

  for (let L = 0; L < S.layers; L++) {
    const inner = L > 0; // gerberas: a ring of short rays inside the main one
    for (let k = 0; k < S.rays; k++) {
      const phi = twist + ((k + L * 0.5) * TAU) / S.rays + (rnd() - 0.5) * 0.06;
      ray(mesh, mats.ray, {
        root: sum([center, 1], [radial(phi), Rd * 0.95], [a, inner ? 0.01 * size : 0]),
        a,
        r: radial(phi),
        len: size * S.len * (inner ? 0.55 : 1) * (0.9 + rnd() * 0.2),
        width: size * S.width * (inner ? 0.8 : 1) * (0.9 + rnd() * 0.2),
        th0: S.lean - (inner ? 0.35 : 0) + (rnd() - 0.5) * 0.1,
        th1: S.droop - (inner ? 0.3 : 0) + (rnd() - 0.5) * 0.25,
        tag: tag + L * 40 + k,
      });
    }
  }

  // a ring of green bracts behind the head
  for (let k = 0; k < 10; k++) {
    const phi = twist + ((k + 0.5) * TAU) / 10;
    ray(mesh, mats.sepal, {
      root: sum([center, 1], [a, -size * 0.04], [radial(phi), Rd * 0.7]),
      a,
      r: radial(phi),
      len: size * 0.16,
      width: size * 0.04,
      th0: 2.0,
      th1: 2.4,
      tag: tag + 98,
    });
  }
}

// A little bunch of daisy heads on short stalks, all rising from one place.
function bloom(mesh, mats, v, { center, axis, size, rnd, tag }) {
  const S = SHAPES[v.shape];
  const a0 = norm(axis);
  const [e1, e2] = basis(a0);
  const n = S.heads[0] + Math.floor(rnd() * (S.heads[1] - S.heads[0] + 1));
  const spin = rnd() * TAU;

  for (let j = 0; j < n; j++) {
    // the first head sits in the middle, the rest around it
    const ang = spin + (j * TAU) / Math.max(1, n - 1);
    const out = j === 0 && n > 2 ? 0 : size * (n > 1 ? 0.42 : 0) * (0.85 + rnd() * 0.3);
    const dir = sum([e1, Math.cos(ang)], [e2, Math.sin(ang)]);
    const at = sum([center, 1], [dir, out], [a0, (rnd() - 0.3) * size * 0.25]);
    // heads tip outwards a little, like a real bunch
    const a = norm(sum([a0, 1], [dir, out ? 0.35 : 0], [[0, 1, 0], 0.1]));
    mesh.line([center, sum([center, 0.5], [at, 0.5], [a0, -size * 0.08]), at], mats.stalk, tag);
    head(mesh, mats, S, { center: at, a, size: size * S.head * (0.9 + rnd() * 0.2), rnd, tag: (tag + 1) * 1000 + j * 100 });
  }
}

// A bud: a small green ball with a hint of white rays at the top.
function bud(mesh, mats, { base, dir, size, tag }) {
  const a = norm(dir);
  const [e1, e2] = basis(a);
  const R = size * 0.24;
  const c = sum([base, 1], [a, R * 0.7]);
  mesh.surface(
    (u, w) => {
      const th = u * Math.PI;
      const ph = w * TAU;
      return sum([c, 1], [a, Math.cos(th) * R * 0.8], [e1, Math.sin(th) * Math.cos(ph) * R], [e2, Math.sin(th) * Math.sin(ph) * R]);
    },
    8,
    14,
    mats.bud,
    tag,
    (u, w) => [1 - u, w],
  );
}

export default {
  id: "daisies",
  name: "Daisies",
  varieties,
  mixes,
  materials,
  bloom,
  bud,
};
