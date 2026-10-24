import { useState } from 'react';

/**
 * What the two search bars share. The plain field paints with the app; the full bar, with tag
 * suggestions, loads just after first paint and takes over, keeping the text, focus and caret.
 */

export const searchLabel = 'Search people by interest';
export const searchPlaceholder = 'Try #badminton or "trek this weekend"';

/** Focus and caret, handed from the plain field to the full bar as it takes over. */
export interface SearchHandoff {
  focused: boolean;
  caret: number | null;
}

export interface SearchFieldProps {
  /** The search in effect (from the URL). */
  query: string | null;
  /** The text in the bar; see `useSearchText`. */
  text: string;
  onTextChange: (text: string) => void;
  onSubmit?: (query: string) => void;
  onClear?: () => void;
  handoff?: SearchHandoff;
}

/** The bar's text: what is typed, following the search in effect when it changes (back, a shared link). */
export function useSearchText(query: string | null) {
  const [text, setText] = useState(query ?? '');
  const [shown, setShown] = useState(query);
  if (query !== shown) {
    setShown(query);
    setText(query ?? '');
  }
  return [text, setText] as const;
}

/** The tag being typed ("#badm" → "badm"), or "" when the text is a sentence or empty. */
export function tagPrefix(text: string): string {
  const word = text.trim().replace(/^#/, '');
  return word !== '' && !/\s/.test(word) ? word.toLowerCase() : '';
}

/** Sends a search; ignores an empty one. */
export function sendSearch(
  value: string,
  onSubmit: ((query: string) => void) | undefined,
  input: HTMLInputElement | null,
) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  onSubmit?.(trimmed);
  // On a phone, drop the keyboard so the map can show the results blooming.
  if (window.matchMedia('(pointer: coarse)').matches) input?.blur();
  return true;
}
