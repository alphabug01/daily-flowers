import lilies from "./lilies.js";
import lavender from "./lavender.js";
import hydrangea from "./hydrangea.js";
import sunflowers from "./sunflowers.js";
import roses from "./roses.js";
import daisies from "./daisies.js";
import tulips from "./tulips.js";
import callas from "./callas.js";
import blossoms from "./blossoms.js";
import orchids from "./orchids.js";
import carnations from "./carnations.js";
import irises from "./irises.js";

// Add more flowers here. The site rotates through them, one per day.
export const flowers = [
  lilies, lavender, hydrangea, sunflowers, roses, daisies, tulips,
  callas, blossoms, orchids, carnations, irises,
];

export function flowerForDay(dayNumber) {
  return flowers[dayNumber % flowers.length];
}
