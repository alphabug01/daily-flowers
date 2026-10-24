// The moon's phase, worked out from the date alone: days since a known new
// moon, wrapped by the length of a lunar month. Good to within a few hours,
// which is plenty for a picture in the sky.

const SYNODIC_MONTH = 29.530588853; // days from one new moon to the next
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 6 Jan 2000, 18:14 UTC
const DAY_MS = 86400000;

const NAMES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
];

// phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
// lit: how much of the face is lit, 0 to 1
export function moonPhase(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / DAY_MS;
  const phase = (((days / SYNODIC_MONTH) % 1) + 1) % 1;
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const name = NAMES[Math.round(phase * 8) % 8];
  return { phase, lit, name };
}

// An SVG of the moon as seen from the northern hemisphere: lit on the right
// while waxing, on the left while waning. The dark part is left out, as it is
// in the real sky. The lit part is a crisp disc seen through a blurred mask,
// so the outer edge stays sharp while the terminator fades softly into shadow.
export function moonSvg(phase) {
  const r = 50;
  const far = r + 20; // past the disc, so only the terminator edge is blurred
  const waxing = phase < 0.5;
  const c = Math.cos(2 * Math.PI * phase);
  const rx = Math.abs(c) * r;
  // the terminator is half an ellipse from pole to pole that bulges towards
  // the lit side for a crescent and away from it when gibbous; the mask is
  // everything on the lit side of it
  const side = waxing ? far : -far;
  const sweep = waxing === c > 0 ? 1 : 0;
  const mask = `M0 ${-far} L0 ${-r} A${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${r} L0 ${far} L${side} ${far} L${side} ${-far}Z`;
  // widest fade at the quarters; narrower towards new and full, so a thin
  // crescent doesn't blur away and a full moon's rim stays crisp
  const soft = (1 + 4 * Math.abs(Math.sin(2 * Math.PI * phase))).toFixed(2);
  return `<svg viewBox="-50 -50 100 100" width="100%" height="100%">
    <defs>
      <filter id="moon-soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="${soft}" /></filter>
      <mask id="moon-lit" maskUnits="userSpaceOnUse" x="${-far}" y="${-far}" width="${2 * far}" height="${2 * far}">
        <path d="${mask}" fill="#fff" filter="url(#moon-soft)" />
      </mask>
    </defs>
    <circle r="${r}" fill="var(--orb)" mask="url(#moon-lit)" />
  </svg>`;
}
