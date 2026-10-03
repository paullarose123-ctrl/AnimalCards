// Hasard déterministe (pour que les stats d'une carte soient toujours les mêmes)
// et hasard "vrai" injectable (pour pouvoir tester les boosters et les matchs).

/** Hash 32 bits FNV-1a d'une chaîne. */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Générateur pseudo-aléatoire mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** Valeur déterministe dans [0, 1) pour une clé donnée. */
export function hashUnit(key: string): number {
  return mulberry32(hashString(key))();
}

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  let total = 0;
  for (const item of items) total += Math.max(0, weight(item));
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

const samplers = new WeakMap<readonly unknown[], { cdf: Float64Array; total: number }>();

/**
 * Même tirage que weightedPick, pour une liste qui ne change pas (pools de boosters, base d'athlètes) :
 * les poids cumulés sont calculés une fois par liste, puis chaque tirage est une recherche dichotomique.
 * La liste doit toujours être tirée avec la même fonction de poids.
 */
export function weightedPickCached<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  let sampler = samplers.get(items);
  if (!sampler) {
    const cdf = new Float64Array(items.length);
    let total = 0;
    items.forEach((item, i) => {
      total += Math.max(0, weight(item));
      cdf[i] = total;
    });
    sampler = { cdf, total };
    samplers.set(items, sampler);
  }
  const roll = rng() * sampler.total;
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sampler.cdf[mid] <= roll) lo = mid + 1;
    else hi = mid;
  }
  return items[lo];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

let uidCounter = 0;
export function makeUid(prefix = 'c'): string {
  uidCounter = (uidCounter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
