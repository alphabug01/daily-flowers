// Software renderer that draws a Mesh into a grid of characters.
// Brightness picks the character, the material picks the colour.

import { norm, dot, cross, clamp } from "./math.js";

// sparse to dense: dense characters read as brighter on the dark card
const RAMP = " .,:;i!+*o%&#@";
const SURFACE = 0;
const LINE = 1;
const POINT = 2;

const SHADOW_SIZE = 192;
const SHADOW_RANGE = 3.4;

export class AsciiRenderer {
  constructor(mesh) {
    this.mesh = mesh;
    const nv = mesh.mat.length;
    this.vp = new Float32Array(nv * 3); // view-space positions
    this.vn = new Float32Array(nv * 3); // view-space normals
    this.sx = new Float32Array(nv); // screen cell coordinates
    this.sy = new Float32Array(nv);
    this.lu = new Float32Array(nv); // light-space coordinates
    this.lv = new Float32Array(nv);
    this.ld = new Float32Array(nv);
    this.shadow = new Float32Array(SHADOW_SIZE * SHADOW_SIZE);
    this.cols = 0;
    this.rows = 0;
  }

  resize(cols, rows) {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.depth = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.cmat = new Int16Array(n);
    this.ctag = new Int32Array(n);
    this.ca = new Float32Array(n);
    this.cb = new Float32Array(n);
    this.cn = new Float32Array(n * 3);
    this.cp = new Float32Array(n * 3);
    this.cch = new Array(n);
    this.chars = new Array(n);
    this.rgb = new Uint8ClampedArray(n * 3);
    this.raw = new Float32Array(n);
    this.col = new Float32Array(n * 3);
  }

  // view: { cellW, cellH, scale, cx, cy, yMid, camDist, yaw, pitch }
  // light: { dir, color, ambient, ambientColor }
  render(view, light) {
    const { mesh } = this;
    const { cols: W, rows: H } = this;
    const L = norm(light.dir);

    // ---- transform vertices into view space ----
    const cy = Math.cos(view.yaw);
    const syw = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch);
    const sp = Math.sin(view.pitch);
    const toView = (x, y, z, out, o) => {
      const x1 = x * cy + z * syw;
      const z1 = -x * syw + z * cy;
      out[o] = x1;
      out[o + 1] = y * cp - z1 * sp;
      out[o + 2] = y * sp + z1 * cp;
    };
    const project = (x, y, z) => {
      const f = view.camDist / (view.camDist - z);
      return [(view.cx + x * view.scale * f) / view.cellW, (view.cy - (y - view.yMid) * view.scale * f) / view.cellH];
    };

    const nv = mesh.mat.length;
    const [ex, ey] = lightBasis(L);
    for (let i = 0; i < nv; i++) {
      const o = i * 3;
      toView(mesh.pos[o], mesh.pos[o + 1], mesh.pos[o + 2], this.vp, o);
      toView(mesh.nrm[o], mesh.nrm[o + 1], mesh.nrm[o + 2], this.vn, o);
      const x = this.vp[o];
      const y = this.vp[o + 1];
      const z = this.vp[o + 2];
      const [c, r] = project(x, y, z);
      this.sx[i] = c;
      this.sy[i] = r;
      this.lu[i] = ((x * ex[0] + y * ex[1] + z * ex[2]) / SHADOW_RANGE + 1) * 0.5 * SHADOW_SIZE;
      this.lv[i] = ((x * ey[0] + y * ey[1] + z * ey[2]) / SHADOW_RANGE + 1) * 0.5 * SHADOW_SIZE;
      this.ld[i] = x * L[0] + y * L[1] + z * L[2];
    }

    // ---- shadow map: depth towards the light ----
    const shadow = this.shadow;
    shadow.fill(-Infinity);
    const tris = mesh.tris;
    for (let t = 0; t < tris.length; t += 3) {
      const i0 = tris[t];
      const i1 = tris[t + 1];
      const i2 = tris[t + 2];
      rasterize(
        SHADOW_SIZE, SHADOW_SIZE,
        this.lu[i0], this.lv[i0], this.lu[i1], this.lv[i1], this.lu[i2], this.lv[i2],
        (idx, w0, w1, w2) => {
          const d = w0 * this.ld[i0] + w1 * this.ld[i1] + w2 * this.ld[i2];
          if (d > shadow[idx]) shadow[idx] = d;
        },
      );
    }

    // ---- main pass ----
    const depth = this.depth;
    depth.fill(-Infinity);
    this.cmat.fill(-1);
    const { vp, vn, cn, cp: cpos } = this;
    for (let t = 0; t < tris.length; t += 3) {
      const i0 = tris[t];
      const i1 = tris[t + 1];
      const i2 = tris[t + 2];
      const o0 = i0 * 3;
      const o1 = i1 * 3;
      const o2 = i2 * 3;
      rasterize(W, H, this.sx[i0], this.sy[i0], this.sx[i1], this.sy[i1], this.sx[i2], this.sy[i2], (idx, w0, w1, w2) => {
        const z = w0 * vp[o0 + 2] + w1 * vp[o1 + 2] + w2 * vp[o2 + 2];
        if (z <= depth[idx]) return;
        depth[idx] = z;
        this.kind[idx] = SURFACE;
        this.cmat[idx] = mesh.mat[i0];
        this.ctag[idx] = mesh.tag[i0];
        this.ca[idx] = w0 * mesh.ua[i0] + w1 * mesh.ua[i1] + w2 * mesh.ua[i2];
        this.cb[idx] = w0 * mesh.ub[i0] + w1 * mesh.ub[i1] + w2 * mesh.ub[i2];
        const c = idx * 3;
        for (let k = 0; k < 3; k++) {
          cn[c + k] = w0 * vn[o0 + k] + w1 * vn[o1 + k] + w2 * vn[o2 + k];
          cpos[c + k] = w0 * vp[o0 + k] + w1 * vp[o1 + k] + w2 * vp[o2 + k];
        }
      });
    }

    const tmp = [0, 0, 0];
    const writeCell = (c, r, z, kind, mat, tag, ch, n, p) => {
      if (c < 0 || r < 0 || c >= W || r >= H) return;
      const idx = r * W + c;
      if (z <= depth[idx]) return;
      depth[idx] = z;
      this.kind[idx] = kind;
      this.cmat[idx] = mat;
      this.ctag[idx] = tag;
      this.cch[idx] = ch;
      this.ca[idx] = 0;
      this.cb[idx] = 0;
      for (let k = 0; k < 3; k++) {
        cn[idx * 3 + k] = n[k];
        cpos[idx * 3 + k] = p[k];
      }
    };

    // thin lines: stems, filaments
    for (const line of mesh.lines) {
      const pts = line.points.map((p) => {
        toView(p[0], p[1], p[2], tmp, 0);
        return [tmp[0], tmp[1], tmp[2]];
      });
      for (let s = 0; s < pts.length - 1; s++) {
        const a = pts[s];
        const b = pts[s + 1];
        const [ac, ar] = project(a[0], a[1], a[2]);
        const [bc, br] = project(b[0], b[1], b[2]);
        const dx = (bc - ac) * view.cellW;
        const dy = (br - ar) * view.cellH;
        const ch = lineChar(dx, dy);
        const T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
        const steps = Math.ceil(Math.max(Math.abs(bc - ac), Math.abs(br - ar)) * 2) + 1;
        for (let k = 0; k <= steps; k++) {
          const f = k / steps;
          const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
          writeCell(Math.floor(ac + (bc - ac) * f), Math.floor(ar + (br - ar) * f), p[2] + 0.02, LINE, line.mat, line.tag, ch, T, p);
        }
      }
    }

    // points: anthers, baby's breath
    for (const pt of mesh.points) {
      toView(pt.p[0], pt.p[1], pt.p[2], tmp, 0);
      const p = [tmp[0], tmp[1], tmp[2]];
      const [c, r] = project(p[0], p[1], p[2]);
      writeCell(Math.floor(c), Math.floor(r), p[2] + 0.04, POINT, pt.mat, pt.tag, pt.ch, [0, 0, 1], p);
    }

    // ---- shading ----
    const amb = light.ambient;
    const ambC = light.ambientColor;
    const LC = light.color;
    const mats = mesh.materials;
    for (let idx = 0; idx < W * H; idx++) {
      const m = this.cmat[idx];
      if (m < 0) {
        this.chars[idx] = " ";
        continue;
      }
      const mat = mats[m];
      const base = mat.color(this.ca[idx], this.cb[idx], this.ctag[idx]);
      const o = idx * 3;
      const P = [cpos[o], cpos[o + 1], cpos[o + 2]];
      const V = norm([-P[0], view.yMid - P[1], view.camDist - P[2]]);
      const Hv = norm([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);
      const kind = this.kind[idx];

      let diff;
      let spec = 0;
      let ndl = 1;
      let inside = 1;
      if (kind === SURFACE) {
        let N = norm([cn[o], cn[o + 1], cn[o + 2]]);
        if (dot(N, V) < 0) {
          N = [-N[0], -N[1], -N[2]];
          // the inside of the paper cone is in its own shade
          if (mat.inside) inside = mat.inside;
        }
        ndl = dot(N, L);
        // soft "wrapped" light so the side facing away still shows its form,
        // plus a little light coming through thin petals and leaves
        diff = Math.max(0, (ndl + 0.4) / 1.4) + (ndl < 0 ? -ndl * (mat.translucent ?? 0) * 0.5 : 0);
        if (ndl > 0) spec = mat.ks * Math.pow(Math.max(0, dot(N, Hv)), mat.shine);
      } else if (kind === LINE) {
        const T = [cn[o], cn[o + 1], cn[o + 2]];
        const tl = dot(T, L);
        diff = Math.sqrt(Math.max(0, 1 - tl * tl)) * 0.85;
        const th = dot(T, Hv);
        spec = mat.ks * 0.5 * Math.pow(Math.sqrt(Math.max(0, 1 - th * th)), mat.shine);
      } else {
        diff = 0.6 + 0.4 * Math.max(0, L[2]);
      }

      // shadow lookup with a little softening
      let lit = 1;
      if (kind === SURFACE) {
        const u = (dot(P, ex) / SHADOW_RANGE + 1) * 0.5 * SHADOW_SIZE;
        const v = (dot(P, ey) / SHADOW_RANGE + 1) * 0.5 * SHADOW_SIZE;
        const d = dot(P, L);
        let hits = 0;
        let total = 0;
        // slope-scaled bias: surfaces at a grazing angle to the light need more
        const bias = 0.05 + 0.12 * (1 - Math.abs(ndl));
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const sxp = Math.floor(u) + ox;
            const syp = Math.floor(v) + oy;
            if (sxp < 0 || syp < 0 || sxp >= SHADOW_SIZE || syp >= SHADOW_SIZE) continue;
            total++;
            if (d < shadow[syp * SHADOW_SIZE + sxp] - bias) hits++;
          }
        }
        if (total) lit = 1 - (hits / total) * 0.8;
      }

      // Outline: darken a cell when a neighbour belongs to a different petal
      // (or anything else) that sits in front of it, so overlapping petals
      // separate instead of merging into one blob.
      let ao = 1;
      if (kind === SURFACE) {
        const z = depth[idx];
        const tag = this.ctag[idx];
        const c = idx % W;
        const behind = (n) => this.cmat[n] >= 0 && this.kind[n] === SURFACE &&
          depth[n] > z + (this.ctag[n] !== tag ? 0.12 : 0.3);
        if ((c > 0 && behind(idx - 1)) || (c < W - 1 && behind(idx + 1)) ||
            (idx >= W && behind(idx - W)) || (idx < W * (H - 1) && behind(idx + W))) {
          ao = 0.45;
        }
      }
      const fog = 0.75 + 0.25 * clamp((P[2] + 2.2) / 4.4);

      // Raw light at this spot; exposure is settled once the whole frame is known.
      this.raw[idx] = (amb * 0.7 + diff * lit * 0.7 + mat.glow + spec * lit) * ao * fog * inside;
      const lightMix = clamp(diff * lit);
      for (let k = 0; k < 3; k++) {
        const tint = ambC[k] + (LC[k] - ambC[k]) * lightMix;
        this.col[o + k] = base[k] * tint + spec * lit * LC[k] * 0.5;
      }
    }

    // ---- auto exposure: map the frame's bright end near the top of the ramp ----
    const hist = new Uint32Array(64);
    let count = 0;
    for (let idx = 0; idx < W * H; idx++) {
      if (this.cmat[idx] < 0 || this.kind[idx] !== SURFACE) continue;
      hist[Math.min(63, Math.floor(this.raw[idx] * 32))]++;
      count++;
    }
    let seen = 0;
    let p92 = 1;
    for (let b = 0; b < 64; b++) {
      seen += hist[b];
      if (seen >= count * 0.92) {
        p92 = (b + 1) / 32;
        break;
      }
    }
    const exposure = 0.95 / Math.max(0.15, p92);

    // ---- characters and colours ----
    for (let idx = 0; idx < W * H; idx++) {
      const m = this.cmat[idx];
      if (m < 0) {
        this.chars[idx] = " ";
        continue;
      }
      const o = idx * 3;
      const light1 = clamp(this.raw[idx] * exposure);
      let ch;
      if (this.kind[idx] === SURFACE) {
        // a little contrast so petals show a gradient instead of flat fills
        const level = Math.round(Math.pow(light1, 1.15) * (RAMP.length - 1));
        ch = RAMP[Math.max(1, Math.min(RAMP.length - 1, level))];
      } else {
        ch = light1 < 0.12 ? "." : mats[m].fine ? (light1 > 0.6 ? ":" : ".") : this.cch[idx];
      }
      this.chars[idx] = ch;
      // keep the material's hue; brightness follows the light
      const tone = 0.5 + 0.7 * light1;
      for (let k = 0; k < 3; k++) this.rgb[o + k] = clamp(this.col[o + k] * tone) * 255;
    }
  }

  text() {
    const lines = [];
    for (let r = 0; r < this.rows; r++) lines.push(this.chars.slice(r * this.cols, (r + 1) * this.cols).join("").trimEnd());
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines.join("\n");
  }
}

function lightBasis(L) {
  const ref = Math.abs(L[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const ex = norm(cross(ref, L));
  const ey = cross(L, ex);
  return [ex, ey];
}

function lineChar(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay > ax * 2.4) return "|";
  if (ax > ay * 2.4) return "-";
  return dx * dy < 0 ? "/" : "\\";
}

// Visit every cell whose centre lies inside the triangle.
function rasterize(W, H, x0, y0, x1, y1, x2, y2, visit) {
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-9) return;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  const inv = 1 / area;
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * inv;
      if (w0 < -1e-6) continue;
      const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * inv;
      if (w1 < -1e-6) continue;
      const w2 = 1 - w0 - w1;
      if (w2 < -1e-6) continue;
      visit(y * W + x, w0, w1, w2);
    }
  }
}
