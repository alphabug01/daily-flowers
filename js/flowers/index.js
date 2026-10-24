import lilies from "./lilies.js";
import lavender from "./lavender.js";

// Add more flowers here. The site rotates through them, one per day.
export const flowers = [lilies, lavender];

export function flowerForDay(dayNumber) {
  return flowers[dayNumber % flowers.length];
}
