// The sky behind the card for each part of the day, and the light it casts
// on the bouquet.

import { moonPhase, moonSvg } from "./moon.js";

// Light follows the sun and moon drawn in the sky behind the card.
export const LIGHTS = {
  morning: { dir: [-0.75, 0.4, 0.55], color: [1.0, 0.9, 0.78], ambient: 0.3, ambientColor: [0.95, 0.85, 0.85] },
  afternoon: { dir: [0.35, 0.85, 0.55], color: [1.0, 0.98, 0.94], ambient: 0.32, ambientColor: [0.85, 0.9, 1.0] },
  evening: { dir: [0.8, 0.25, 0.5], color: [1.0, 0.72, 0.5], ambient: 0.25, ambientColor: [0.75, 0.65, 0.9] },
  night: { dir: [0.55, 0.65, 0.5], color: [0.72, 0.8, 1.0], ambient: 0.22, ambientColor: [0.55, 0.6, 0.85] },
};

// Paint the sky for `period` and return the light for the bouquet. At night
// the orb is the moon in tonight's phase, and moonlight on the bouquet and
// the glass is as strong as the moon is full.
export function applySky(period, now = new Date()) {
  document.body.dataset.period = period;
  const orb = document.querySelector(".orb");
  if (period !== "night") {
    orb.innerHTML = "";
    orb.removeAttribute("title");
    document.body.style.removeProperty("--moon-lit");
    return LIGHTS[period];
  }
  const moon = moonPhase(now);
  orb.innerHTML = moonSvg(moon.phase);
  orb.title = `${moon.name}, ${Math.round(moon.lit * 100)}% lit`;
  document.body.style.setProperty("--moon-lit", moon.lit.toFixed(3));
  const strength = 0.45 + 0.55 * moon.lit;
  return { ...LIGHTS.night, color: LIGHTS.night.color.map((c) => c * strength) };
}
