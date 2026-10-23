/**
 * The three zoom levels and the scrubbed transitions between them. Progress follows the zoom itself,
 * so every transition is interruptible and reversible by definition: pinch back and it plays backwards.
 *
 * | Zoom      | Shows                     |
 * | --------- | ------------------------- |
 * | < 13      | Tag Weather (glows)       |
 * | 13 – 14.5 | Zoom Morph: glows → pins  |
 * | 14.5 – 16 | Tag pins                  |
 * | 16 – 17   | Pins flip to faces        |
 * | ≥ 17      | Photo bubbles             |
 */

export const morphStartZoom = 13;
export const morphEndZoom = 14.5;
export const faceStartZoom = 16;
export const faceEndZoom = 17;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 0 = all glow, 1 = all pins. Written to `--morph` on the pin overlay every frame. */
export function morphAt(zoom: number): number {
  return smoothstep(morphStartZoom, morphEndZoom, zoom);
}

/** 0 = tag side, 1 = face side. Written to `--face`. */
export function faceAt(zoom: number): number {
  return smoothstep(faceStartZoom, faceEndZoom, zoom);
}

/** People tiles are fetched from a little before the morph starts, so pins are ready when it does. */
export const peopleFetchZoom = morphStartZoom - 0.5;
