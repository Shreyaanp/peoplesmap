/**
 * Motion tokens: the only source of durations, easings and springs.
 * ESLint forbids inline numbers in `transition` props; import from here.
 * Mirrored in src/tokens/motion.css (checked by tokens.test.ts).
 */

export type Bezier = readonly [number, number, number, number];

/** Liquid: the map world. Slow start, long settle, 0.6–1.2s. */
export const liquid = {
  ease: [0.45, 0, 0.15, 1] as Bezier,
  settle: [0.22, 1, 0.36, 1] as Bezier,
  duration: { short: 0.6, base: 0.9, long: 1.2 },
} as const;

/** Crisp: UI glass. Fast out with a small spring, 0.15–0.3s. */
export const crisp = {
  ease: [0.2, 0, 0, 1] as Bezier,
  springEase: [0.34, 1.36, 0.64, 1] as Bezier,
  duration: { short: 0.15, base: 0.22, long: 0.3 },
} as const;

/** Spring presets for Motion. Springs are interruptible by nature. */
export const spring = {
  /** Buttons, chips, dropdown items. */
  crisp: { type: 'spring', stiffness: 500, damping: 30, mass: 1 },
  /** Bottom sheet snapping, with a little stretch. */
  sheet: { type: 'spring', stiffness: 420, damping: 36, mass: 1 },
  /** Gentle settle for larger surfaces. */
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
} as const;

/** Delay between items that arrive one after another (Tag Birth chips, pins springing out). */
export const stagger = { item: 0.06 } as const;

/** Reduced-motion fallback: a plain fade. */
export const fade = { duration: 0.2, ease: crisp.ease } as const;

/** Liquid easing as a function, for MapLibre camera animations (flyTo / easeTo `easing`). */
export function liquidEasing(t: number): number {
  return cubicBezier(liquid.ease, t);
}

/** Evaluates a CSS-style cubic-bezier at progress t (0..1). */
export function cubicBezier([x1, y1, x2, y2]: Bezier, t: number): number {
  const curve = (s: number, a: number, b: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  let s = t;
  // Solve x(s) = t with Newton-Raphson, then read y(s).
  for (let i = 0; i < 8; i++) {
    const err = curve(s, x1, x2) - t;
    const slope = 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s ** 2;
    if (Math.abs(err) < 1e-6 || slope === 0) break;
    s = Math.min(1, Math.max(0, s - err / slope));
  }
  return curve(s, y1, y2);
}
