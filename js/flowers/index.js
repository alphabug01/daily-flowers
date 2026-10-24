import lilies from "./lilies.js";
import lavender from "./lavender.js";
import hydrangea from "./hydrangea.js";
import sunflowers from "./sunflowers.js";

// Add more flowers here. The site rotates through them, one per day.
export const flowers = [lilies, lavender, hydrangea, sunflowers];

export function flowerForDay(dayNumber) {
  return flowers[dayNumber % flowers.length];
}
