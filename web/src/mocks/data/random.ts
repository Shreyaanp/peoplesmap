/** A seeded random source, so every run builds the same mock world. */
export interface Random {
  /** 0 (inclusive) to 1 (exclusive). */
  next(): number;
  int(min: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Picks by weight; `weight` returns a non-negative number per item. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Standard normal sample (Box-Muller). */
  gaussian(): number;
  chance(p: number): boolean;
}

/** mulberry32: tiny, fast, good enough for mock data. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const random: Random = {
    next,
    int: (min, maxInclusive) => min + Math.floor(next() * (maxInclusive - min + 1)),
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('pick() from an empty list');
      return item;
    },
    weighted: (items, weight) => {
      const total = items.reduce((sum, item) => sum + weight(item), 0);
      let r = next() * total;
      for (const item of items) {
        r -= weight(item);
        if (r < 0) return item;
      }
      return random.pick(items);
    },
    gaussian: () => {
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    chance: (p) => next() < p,
  };
  return random;
}

/** A UUIDv7-shaped id: 48-bit millisecond time, then seeded random bits. Deterministic per seed. */
export function uuidV7(random: Random, timeMs: number): string {
  const hex = (n: number, width: number) => Math.floor(n).toString(16).padStart(width, '0');
  const time = hex(timeMs, 12);
  const randA = hex(random.next() * 0x1000, 3);
  const variant = hex(0x8000 + random.next() * 0x4000, 4);
  const tail = hex(random.next() * 0x1000000, 6) + hex(random.next() * 0x1000000, 6);
  return `${time.slice(0, 8)}-${time.slice(8)}-7${randA}-${variant}-${tail}`;
}
