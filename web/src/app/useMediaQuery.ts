import { useSyncExternalStore } from 'react';

/** Desktop layout: the sheet becomes a side panel, like Google Maps on a laptop. */
export const desktopQuery = '(min-width: 900px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
