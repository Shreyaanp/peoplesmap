import { useLayoutEffect, useRef } from 'react';
import { useSearchField } from 'react-aria';
import { useSearchFieldState } from 'react-stately';
import styles from './SearchBar.module.css';
import { searchLabel, searchPlaceholder, sendSearch, type SearchFieldProps } from './searchShared';

/**
 * The search bar as it first paints: a plain search field, no suggestions. The full bar replaces it
 * moments later (see searchShared.ts). Behaviour from React Aria; the look is ours.
 */
export function SearchField({ text, onTextChange, onSubmit, onClear, handoff }: SearchFieldProps) {
  const state = useSearchFieldState({ value: text, onChange: onTextChange });
  const ref = useRef<HTMLInputElement>(null);
  const { labelProps, inputProps } = useSearchField(
    {
      label: searchLabel,
      placeholder: searchPlaceholder,
      onSubmit: (value) => sendSearch(value, onSubmit, ref.current),
      ...(onClear ? { onClear } : {}),
    },
    state,
    ref,
  );

  // As the full bar takes over, note focus and caret while this input is still in the page.
  useLayoutEffect(() => {
    const input = ref.current;
    return () => {
      if (!handoff || !input) return;
      handoff.focused = document.activeElement === input;
      handoff.caret = input.selectionStart;
    };
  }, [handoff]);

  const clear = () => {
    onTextChange('');
    onClear?.();
    ref.current?.focus();
  };

  return (
    <form role="search" className={styles.search} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.bar}>
        <label {...labelProps} className="visuallyHidden">
          {searchLabel}
        </label>
        <input {...inputProps} ref={ref} className={styles.input} enterKeyHint="search" />
        {text !== '' && (
          <button type="button" className={styles.clear} aria-label="Clear search" onClick={clear}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
    </form>
  );
}
