/**
 * Hash a string into a small deterministic PRNG (mulberry32 over an FNV-1a seed).
 * Handmade marks — highlighter strokes, stamp poses — come out of this so they
 * look irregular but never change under the reader.
 */
export function createRandom(seed: string): () => number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
