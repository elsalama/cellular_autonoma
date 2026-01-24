// Deterministic PRNG (mulberry32). Fast, simple, good enough for reproducible seeding.
// Returns a float in [0, 1).
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function clampU32(n: number) {
  return n >>> 0;
}

export function randomSeedU32() {
  // Non-crypto; only used when user asks for a new seed.
  // Keep deterministic flows deterministic by always storing/showing the seed.
  return (Math.random() * 0xffffffff) >>> 0;
}

