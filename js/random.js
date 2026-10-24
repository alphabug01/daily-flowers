// Small seeded random helpers so the same day always produces the same bouquet.

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(key) {
  return mulberry32(hashString(key));
}

export function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

export function int(rnd, min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

export function weighted(rnd, entries) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rnd() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll < 0) return e;
  }
  return entries[entries.length - 1];
}

export function shuffle(rnd, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
