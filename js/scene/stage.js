// Puts a bouquet on screen: fits it to a box, sways it and paints the
// renderer's characters onto a canvas, plus a small blurred copy of the art
// (the light it spreads into the frosted glass behind it).

import { AsciiRenderer } from "./renderer.js";

const PITCH = 0.15;
const CAM_DIST = 9;
export const SWAY = 0.3; // radians the bouquet turns either way
const GLOW_SCALE = 0.25;

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const colorCache = new Map();

// How far the bouquet reaches on screen, measured exactly as the renderer
// draws it: at every angle of the sway and with perspective.
function measure(mesh, sway) {
  const pos = mesh.pos;
  let yMid = 0;
  for (let i = 1; i < pos.length; i += 3) yMid += pos[i];
  yMid /= pos.length / 3;
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const out = { x: 0, lo: Infinity, hi: -Infinity, yMid };
  const steps = sway ? [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1] : [0];
  for (const s of steps) {
    const cy = Math.cos(SWAY * s);
    const sy = Math.sin(SWAY * s);
    for (let i = 0; i < pos.length; i += 3) {
      const x1 = pos[i] * cy + pos[i + 2] * sy;
      const z1 = -pos[i] * sy + pos[i + 2] * cy;
      const y = pos[i + 1] * cp - z1 * sp;
      const z = pos[i + 1] * sp + z1 * cp;
      const f = CAM_DIST / (CAM_DIST - z);
      out.x = Math.max(out.x, Math.abs(x1 * f));
      out.lo = Math.min(out.lo, (y - yMid) * f);
      out.hi = Math.max(out.hi, (y - yMid) * f);
    }
  }
  return out;
}

// The character size for a box: smaller cells on small screens show more detail.
const defaultFont = (width, height) => (Math.min(width, height) < 420 ? 6 : 8);

export class BouquetStage {
  // box: the element whose size the art fills; art and glow: its two canvases
  constructor(box, art, glow, { font = defaultFont } = {}) {
    this.box = box;
    this.art = art;
    this.glow = glow;
    this.ctx = art.getContext("2d");
    this.glowCtx = glow.getContext("2d");
    this.fontFor = font;
    this.renderer = null;
    this.extent = null;
    this.view = null;
    this.light = null;
    this.font = 10;
    this.cellW = 6;
    this.cellH = 12;
    this.dpr = 1;
  }

  setMesh(mesh) {
    this.renderer = new AsciiRenderer(mesh);
    this.extent = measure(mesh, !reducedMotion);
    this.layout();
  }

  layout() {
    if (!this.renderer) return;
    const width = this.box.clientWidth;
    const height = this.box.clientHeight;
    if (!width || !height) return;
    const font = this.fontFor(width, height);
    const cellW = font * 0.6;
    const cellH = font * 1.2;
    const cols = Math.max(20, Math.floor(width / cellW));
    const rows = Math.max(10, Math.floor(height / cellH));
    const wpx = cols * cellW;
    const hpx = rows * cellH;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { art, glow } = this;

    art.style.width = `${wpx}px`;
    art.style.height = `${hpx}px`;
    art.width = Math.round(wpx * dpr);
    art.height = Math.round(hpx * dpr);
    glow.style.width = art.style.width;
    glow.style.height = art.style.height;
    glow.width = Math.max(1, Math.round(wpx * GLOW_SCALE));
    glow.height = Math.max(1, Math.round(hpx * GLOW_SCALE));
    Object.assign(this, { font, cellW, cellH, dpr });
    // fit the bouquet with a one-cell margin on every side
    const m = this.extent;
    const scale = Math.min((wpx - 2 * cellW) / (2 * m.x), (hpx - 2 * cellH) / (m.hi - m.lo));
    this.view = {
      cellW,
      cellH,
      scale,
      cx: wpx / 2,
      cy: hpx / 2 + ((m.hi + m.lo) / 2) * scale,
      yMid: m.yMid,
      camDist: CAM_DIST,
      pitch: PITCH,
      yaw: this.view?.yaw ?? 0,
    };
    this.renderer.resize(cols, rows);
  }

  paint() {
    const r = this.renderer;
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.art.width, this.art.height);
    ctx.font = `${this.font}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    ctx.textBaseline = "top";
    const yOffset = (this.cellH - this.font) / 2;
    for (let row = 0; row < r.rows; row++) {
      for (let col = 0; col < r.cols; col++) {
        const idx = row * r.cols + col;
        const ch = r.chars[idx];
        if (ch === " ") continue;
        const o = idx * 3;
        const key = ((r.rgb[o] >> 2) << 12) | ((r.rgb[o + 1] >> 2) << 6) | (r.rgb[o + 2] >> 2);
        let style = colorCache.get(key);
        if (!style) {
          style = `rgb(${r.rgb[o]},${r.rgb[o + 1]},${r.rgb[o + 2]})`;
          colorCache.set(key, style);
        }
        ctx.fillStyle = style;
        ctx.fillText(ch, col * this.cellW, row * this.cellH + yOffset);
      }
    }
    this.glowCtx.clearRect(0, 0, this.glow.width, this.glow.height);
    this.glowCtx.drawImage(this.art, 0, 0, this.glow.width, this.glow.height);
  }

  // Draw the bouquet at `time` (ms) in its sway; `yaw` fixes the angle instead.
  frame(time, yaw) {
    if (!this.renderer || !this.view || !this.light) return;
    this.view.yaw = yaw ?? (reducedMotion ? 0 : SWAY * Math.sin((time / 1000) * 0.35));
    this.renderer.render(this.view, this.light);
    this.paint();
  }

  // Restart the fade-in, for a new bouquet.
  bloom() {
    for (const el of [this.art, this.glow]) {
      el.classList.remove("bloom");
      void el.offsetWidth;
      el.classList.add("bloom");
    }
  }

  text() {
    return this.renderer.text();
  }
}
