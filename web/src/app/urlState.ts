import { useSyncExternalStore } from 'react';

/**
 * Shareable UI state lives in the URL: `?person=<id>` is the open profile. Opening pushes a history
 * entry, so the back button closes the profile (Jakob's Law: behave like Google Maps).
 */

const changeEvent = 'peoplemap:urlchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

/** Marks history entries we pushed, so closing can pop them instead of stacking more. */
const pushedMarker = { peoplemap: 'person' };

function navigate(update: (params: URLSearchParams) => void, mode: 'push' | 'replace') {
  const url = new URL(window.location.href);
  update(url.searchParams);
  if (url.href === window.location.href) return;
  if (mode === 'push') window.history.pushState(pushedMarker, '', url);
  else window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(changeEvent));
}

const getPerson = () => new URLSearchParams(window.location.search).get('person');

/** The open profile's person id, or null. */
export function useOpenPerson(): string | null {
  return useSyncExternalStore(subscribe, getPerson, () => null);
}

export function openPerson(id: string): void {
  // Switching from one profile to another replaces, so back always returns to the map.
  navigate((p) => p.set('person', id), getPerson() ? 'replace' : 'push');
}

export function closePerson(): void {
  if (!getPerson()) return;
  // An entry we pushed is popped (popstate updates readers); a shared link just drops the param.
  const state: unknown = window.history.state;
  if (state && typeof state === 'object' && 'peoplemap' in state) window.history.back();
  else navigate((p) => p.delete('person'), 'replace');
}
