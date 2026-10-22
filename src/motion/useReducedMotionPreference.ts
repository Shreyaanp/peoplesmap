import { useSyncExternalStore } from 'react';
import type { Transition } from 'motion/react';
import { fade } from './tokens';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

/** True when the user asked the OS to reduce motion. */
export function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns `full` normally, or a plain fade when reduce-motion is on.
 * Usage: `transition={useMotionTransition(spring.crisp)}`.
 */
export function useMotionTransition(full: Transition): Transition {
  return useReducedMotionPreference() ? fade : full;
}
