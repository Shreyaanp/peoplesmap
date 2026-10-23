import { useEffect, useState } from 'react';

/**
 * True once the first frame has painted and the browser is idle (or after `timeoutMs` at most).
 * Heavy, non-critical work (MapLibre) starts then, so the shell paints and responds first.
 */
export function useAfterFirstPaint(timeoutMs = 1500): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        idle = window.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      } else {
        // Safari: no idle callback; a short delay after the first frame does the same job.
        timer = setTimeout(() => setReady(true), 100);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [timeoutMs]);
  return ready;
}
