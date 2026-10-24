import lilies from "./lilies.js";

// Add more flowers here. Today only lilies are in the rotation.
export const flowers = [lilies];

export function flowerForDay(dayNumber) {
  return flowers[dayNumber % flowers.length];
}
