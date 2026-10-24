// Greeting and a short sweet note for each part of the day.
// One note is picked per day and period, so it stays the same if you refresh.

export const PERIODS = {
  morning: {
    greeting: "Good morning",
    notes: [
      "Some fresh flowers to start your day. Hope it goes well.",
      "Hope you slept well. Have a really nice day today.",
      "Take it easy this morning. Something good might happen today.",
      "Coffee, some sunlight and a few flowers. Good way to start.",
      "New day. Hope it's a good one for you.",
      "No need to rush this morning. Take your time.",
      "Hope you get a good breakfast and a smooth day.",
      "Wishing you a bright and easy morning.",
      "New day, new flowers. Same amazing you.",
      "Here are some flowers to keep you company today.",
      "Sending you a little sunshine for the morning.",
      "Start slow. You've got the whole day.",
    ],
  },
  afternoon: {
    greeting: "Good afternoon",
    notes: [
      "Halfway through the day. Take a breath, you're doing great.",
      "A little something to brighten your afternoon.",
      "Take a quick break. The flowers are still here for you.",
      "Hope the rest of your day is easier than the morning.",
      "Drink some water and eat something good.",
      "You've already done more today than you think.",
      "Just a reminder to go easy on yourself.",
      "Hope your day is going well so far.",
      "Take a short break. You deserve it.",
      "Keep going. Evening's almost here.",
    ],
  },
  evening: {
    greeting: "Good evening",
    notes: [
      "The day's almost done. Time to relax a bit.",
      "Hope you get some time to unwind this evening.",
      "However today went, you got through it. Well done.",
      "Time to put work away and do something you enjoy.",
      "Hope you have a calm and nice evening.",
      "Nice sunset tonight. Here are some flowers to go with it.",
      "Eat well, call someone you like, get some rest.",
      "Hope your evening is relaxed and easy.",
      "You did enough today. Really.",
      "Some flowers for the end of your day.",
    ],
  },
  night: {
    greeting: "Good night",
    notes: [
      "Sleep well. New flowers will be here in the morning.",
      "It's late. Time to get some rest.",
      "Let go of today and get some good sleep.",
      "Good night. See you tomorrow.",
      "Hope you have good dreams tonight.",
      "Rest up. You've done enough for one day.",
      "Put the phone down soon and get some sleep.",
      "Sweet dreams. Thanks for being you today.",
      "Get comfy and get some proper sleep.",
      "Good night. See you in the morning with new flowers.",
    ],
  },
};

export function periodForHour(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
