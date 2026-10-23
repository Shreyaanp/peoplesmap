import type { CSSProperties } from 'react';

/**
 * The generated avatar for people without a photo: a warm "aura" seeded from their id, so it is
 * stable everywhere they appear. Colours come from the amber scale tokens; only positions and the
 * pair of steps vary.
 */
const steps = [200, 300, 400, 500, 600, 700] as const;

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** CSS custom properties for `.aura` (see Aura.module.css). */
export function auraVars(id: string): CSSProperties {
  const h = hash(id);
  const light = steps[h % 3] ?? 300;
  const deep = steps[3 + ((h >>> 3) % 3)] ?? 600;
  return {
    '--aura-light': `var(--amber-${light})`,
    '--aura-deep': `var(--amber-${deep})`,
    '--aura-x': `${20 + ((h >>> 6) % 60)}%`,
    '--aura-y': `${15 + ((h >>> 12) % 50)}%`,
  } as CSSProperties;
}
