import { useSyncExternalStore } from 'react';

/**
 * Shareable UI state lives in the URL: `?q=` is the search, `?person=<id>` the open profile,
 * `?inbox=chats|glows` the inbox, `?thread=<id>` a conversation and `?with=<id>` a first message
 * to someone. Starting any of them pushes a history entry, so the back button undoes it (Jakob's
 * Law: behave like Google Maps): back from a profile returns to the results, back again clears the
 * search.
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

type Entry = 'person' | 'search' | 'inbox' | 'thread';

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

export type InboxFolder = 'chats' | 'glows';

const param = (name: string) => () => new URLSearchParams(window.location.search).get(name);
const getFolder = param('inbox');
const getThread = param('thread');
const getDraft = param('with');

/** The inbox folder on show, or null when the inbox is closed. A conversation keeps it open too. */
export function useInboxFolder(): InboxFolder | null {
  const folder = useSyncExternalStore(subscribe, getFolder, () => null);
  return folder === 'chats' || folder === 'glows' ? folder : null;
}

/** The open conversation's thread id, or null. */
export function useOpenThread(): string | null {
  return useSyncExternalStore(subscribe, getThread, () => null);
}

/** The person a first message is being written to (no conversation yet), or null. */
export function useDraftWith(): string | null {
  return useSyncExternalStore(subscribe, getDraft, () => null);
}

export function openInbox(folder: InboxFolder = 'chats'): void {
  navigate((p) => p.set('inbox', folder), 'push', 'inbox');
}

/** Switching folders replaces, so back still closes the inbox in one step. */
export function showFolder(folder: InboxFolder): void {
  navigate((p) => p.set('inbox', folder), 'replace');
}

export function closeInbox(): void {
  if (!getFolder() && !getThread() && !getDraft()) return;
  if (pushedFor('inbox')) window.history.back();
  else
    navigate((p) => {
      p.delete('inbox');
      p.delete('thread');
      p.delete('with');
    }, 'replace');
}

/** Opens a conversation over whatever is showing (the inbox, a profile); back returns to it. */
export function openThread(id: string): void {
  // A first message that just became a conversation swaps in place.
  const mode = getDraft() ? 'replace' : 'push';
  navigate(
    (p) => {
      p.set('thread', id);
      p.delete('with');
    },
    mode,
    'thread',
  );
}

/** Opens a first message to someone we have no conversation with yet. */
export function openDraft(personId: string): void {
  navigate((p) => p.set('with', personId), 'push', 'thread');
}

export function closeThread(): void {
  if (!getThread() && !getDraft()) return;
  if (pushedFor('thread')) window.history.back();
  else
    navigate((p) => {
      p.delete('thread');
      p.delete('with');
    }, 'replace');
}

/** From a conversation to that person's profile on the map; back returns to the conversation. */
export function showPersonFromChat(id: string): void {
  navigate(
    (p) => {
      p.delete('inbox');
      p.delete('thread');
      p.delete('with');
      p.set('person', id);
    },
    'push',
    'person',
  );
}
