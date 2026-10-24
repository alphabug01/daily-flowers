// Collects everything in the bouquet: triangle surfaces (petals, leaves, paper),
// thin lines (stems, filaments) and single points (anthers, baby's breath).

import { sub, cross, norm } from "./math.js";

export class Mesh {
  constructor() {
    this.materials = [];
    this.pos = [];
    this.nrm = [];
    // per vertex: material, two surface coordinates, and an id used for patterns
    this.mat = [];
    this.ua = [];
    this.ub = [];
    this.tag = [];
    this.tris = [];
    this.lines = [];
    this.points = [];
  }

  // A material is { color(a, b, tag) -> [r,g,b], ks, shine, glow }
  material(def) {
    this.materials.push({ ks: 0.15, shine: 10, glow: 0, ...def });
    return this.materials.length - 1;
  }

  vertex(p, n, mat, a, b, tag) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.mat.push(mat);
    this.ua.push(a);
    this.ub.push(b);
    this.tag.push(tag);
    return this.mat.length - 1;
  }

  // A parametric surface fn(u, v) -> point, with u, v in [0, 1].
  // Normals come from the surface itself, so curls and crinkles shade properly.
  surface(fn, nu, nv, mat, tag = 0, coords = (u, v) => [u, v]) {
    const e = 1e-3;
    const base = this.mat.length;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const v = j / nv;
        const du = sub(fn(Math.min(1, u + e), v), fn(Math.max(0, u - e), v));
        const dv = sub(fn(u, Math.min(1, v + e)), fn(u, Math.max(0, v - e)));
        const [a, b] = coords(u, v);
        this.vertex(fn(u, v), norm(cross(du, dv)), mat, a, b, tag);
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = base + j * (nu + 1) + i;
        const b = a + 1;
        const c = a + nu + 1;
        const d = c + 1;
        this.tris.push(a, b, d, a, d, c);
      }
    }
  }

  line(points, mat, tag = 0) {
    this.lines.push({ points, mat, tag });
  }

  point(p, mat, ch, tag = 0) {
    this.points.push({ p, mat, ch, tag });
  }

  // Pack into typed arrays once the scene is built.
  finish() {
    this.pos = Float32Array.from(this.pos);
    this.nrm = Float32Array.from(this.nrm);
    this.ua = Float32Array.from(this.ua);
    this.ub = Float32Array.from(this.ub);
    this.mat = Int16Array.from(this.mat);
    this.tag = Int32Array.from(this.tag);
    this.tris = Uint32Array.from(this.tris);
    return this;
  }
}
