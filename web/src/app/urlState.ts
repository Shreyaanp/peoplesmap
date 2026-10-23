import { useSyncExternalStore } from 'react';

/**
 * Shareable UI state lives in the URL: `?q=` is the search, `?person=<id>` the open profile.
 * Starting either pushes a history entry, so the back button undoes it (Jakob's Law: behave like
 * Google Maps): back from a profile returns to the results, back again clears the search.
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

type Entry = 'person' | 'search';

function navigate(update: (params: URLSearchParams) => void, mode: 'push' | 'replace', entry?: Entry) {
  const url = new URL(window.location.href);
  update(url.searchParams);
  if (url.href === window.location.href) return;
  // Entries we push are marked, so closing can pop them instead of stacking more.
  if (mode === 'push') window.history.pushState({ peoplemap: entry }, '', url);
  else window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(changeEvent));
}

/** True when the current history entry is one we pushed for this kind of state. */
function pushedFor(entry: Entry): boolean {
  const state: unknown = window.history.state;
  return !!state && typeof state === 'object' && 'peoplemap' in state && state.peoplemap === entry;
}

const getPerson = () => new URLSearchParams(window.location.search).get('person');
const getQuery = () => new URLSearchParams(window.location.search).get('q');

/** The open profile's person id, or null. */
export function useOpenPerson(): string | null {
  return useSyncExternalStore(subscribe, getPerson, () => null);
}

export function openPerson(id: string): void {
  // Switching from one profile to another replaces, so back always returns to the map.
  navigate((p) => p.set('person', id), getPerson() ? 'replace' : 'push', 'person');
}

export function closePerson(): void {
  if (!getPerson()) return;
  // An entry we pushed is popped (popstate updates readers); a shared link just drops the param.
  if (pushedFor('person')) window.history.back();
  else navigate((p) => p.delete('person'), 'replace');
}

/** The current search, or null. */
export function useSearchQuery(): string | null {
  return useSyncExternalStore(subscribe, getQuery, () => null);
}

/** Runs a search. A new search over an old one replaces it; a search from the map pushes. */
export function search(query: string): void {
  navigate(
    (p) => {
      p.set('q', query);
      p.delete('person');
    },
    getQuery() ? 'replace' : 'push',
    'search',
  );
}

export function clearSearch(): void {
  if (!getQuery()) return;
  if (pushedFor('search') && !getPerson()) window.history.back();
  else navigate((p) => p.delete('q'), 'replace');
}
