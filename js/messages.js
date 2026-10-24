// Greeting and a short sweet note for each part of the day.
// One note is picked per day and period, so it stays the same if you refresh.

export const PERIODS = {
  morning: {
    greeting: "Good morning",
    notes: [
      "A fresh bouquet for a fresh start. May today be gentle with you.",
      "The lilies opened early just to say hello. Have a lovely day.",
      "Rise slowly, breathe deeply. Something good is on its way.",
      "Coffee, sunlight and a few flowers: everything you need to begin.",
      "Today is a blank page. Write something kind on it.",
      "Like these lilies, you don't have to rush to bloom.",
      "Wishing you soft light, warm tea and small happy surprises.",
      "May your morning be as bright as the first petal to open.",
      "New day, new flowers, same wonderful you.",
      "Here's a little bouquet to carry with you all day.",
      "Sending you sunshine and the smell of fresh lilies.",
      "Start slow. The day will wait for you.",
    ],
  },
  afternoon: {
    greeting: "Good afternoon",
    notes: [
      "Halfway there. Take a breath and stretch, you're doing great.",
      "A little afternoon sunshine, delivered in petals.",
      "Pause for a moment. The lilies are still smiling at you.",
      "May the rest of your day be lighter than the first half.",
      "Drink some water, eat something nice, look at a flower.",
      "You've already done more today than you think.",
      "Here's a petal-soft reminder to be kind to yourself.",
      "The sun is high, and so are our hopes for your day.",
      "Take a tiny break. These flowers aren't going anywhere.",
      "Keep going, sunshine. Evening is on its way.",
    ],
  },
  evening: {
    greeting: "Good evening",
    notes: [
      "The day is winding down. Let your shoulders drop.",
      "Golden light, slow breaths, and lilies to end the day.",
      "Whatever today was, you made it through. Well done.",
      "Time to put the day away and pick up something cozy.",
      "May your evening be warm, quiet and full of good things.",
      "The sky is blushing. Maybe it saw these flowers.",
      "Light a candle, call someone you love, rest a little.",
      "Let the evening be soft, like petals closing for the night.",
      "You did enough today. You are enough, always.",
      "Sunset, supper, and a bouquet just for you.",
    ],
  },
  night: {
    greeting: "Good night",
    notes: [
      "Sleep well. A new bouquet blooms when you wake.",
      "The stars are out and the lilies are dreaming. Rest now.",
      "Close your eyes and let today drift away like petals on water.",
      "Goodnight. Tomorrow has fresh flowers waiting for you.",
      "May your dreams smell like lilies and summer rain.",
      "Rest your heart. You've carried enough for one day.",
      "The moon is keeping watch, so you can let go.",
      "Sweet dreams. Thank you for being you today.",
      "Tuck in, slow down, and let the quiet hold you.",
      "Night night. See you in the morning, with new flowers.",
    ],
  },
};

export function periodForHour(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
