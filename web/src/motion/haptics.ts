/**
 * A short tick for the two moments that earn one: Tag Birth chips landing and Connect.
 * Android only (iOS Safari has no web vibration); silent when the user asked for reduced motion.
 */
export function hapticTick(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate(12);
}
