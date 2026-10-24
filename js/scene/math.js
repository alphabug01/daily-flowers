// Tiny 3D helpers. Vectors are plain [x, y, z] arrays.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function norm(a) {
  const l = len(a);
  return l < 1e-12 ? [0, 0, 1] : [a[0] / l, a[1] / l, a[2] / l];
}

// Add several scaled vectors: sum([v, 2], [w, -1]) = 2v - w
export function sum(...terms) {
  const out = [0, 0, 0];
  for (const [v, s] of terms) {
    out[0] += v[0] * s;
    out[1] += v[1] * s;
    out[2] += v[2] * s;
  }
  return out;
}

// Two unit vectors perpendicular to `axis` (and to each other).
export function basis(axis) {
  const ref = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = norm(cross(axis, ref));
  const e2 = cross(axis, e1);
  return [e1, e2];
}

export function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return sum([p0, u * u * u], [p1, 3 * u * u * t], [p2, 3 * u * t * t], [p3, t * t * t]);
}

export const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const mixRgb = lerp;

// Deterministic hash of a few integers to [0, 1).
export function hash3(a, b, c) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
