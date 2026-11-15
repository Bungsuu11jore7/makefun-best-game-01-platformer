// Emberleap — seeded random numbers (mulberry32) so every ?shot= scene is
// deterministic: the same seed always builds the same level decorations.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max] from a seeded rng.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array from a seeded rng.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
