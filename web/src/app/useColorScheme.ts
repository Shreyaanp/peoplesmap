import { useSyncExternalStore } from 'react';
import type { ThemeName } from '../tokens';

const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  // `data-theme` on <html> overrides the OS setting (tokens.css reads the same attribute).
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    mql.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function getSnapshot(): ThemeName {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia(query).matches ? 'dark' : 'light';
}

/** The active theme, for code CSS cannot reach (the map style, the glow shader). */
export function useColorScheme(): ThemeName {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}
