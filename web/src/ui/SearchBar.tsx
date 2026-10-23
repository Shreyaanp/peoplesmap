import { useRef, useState } from 'react';
import { useSearchField } from 'react-aria';
import { useSearchFieldState } from 'react-stately';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  /** The search in effect (from the URL). The text follows it when it changes, e.g. on back. */
  query?: string | null;
  onSubmit?: (query: string) => void;
  onClear?: () => void;
}

const label = 'Search people by interest';

/** The big search bar the app opens to. Behaviour from React Aria; the look is ours. */
export function SearchBar({ query = null, onSubmit, onClear }: SearchBarProps) {
  const [text, setText] = useState(query ?? '');
  const [shown, setShown] = useState(query);
  if (query !== shown) {
    setShown(query);
    setText(query ?? '');
  }

  const state = useSearchFieldState({ value: text, onChange: setText });
  const ref = useRef<HTMLInputElement>(null);
  const { labelProps, inputProps } = useSearchField(
    {
      label,
      placeholder: 'Try #badminton or "trek this weekend"',
      onSubmit: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit?.(trimmed);
        // On a phone, drop the keyboard so the map can show the results blooming.
        if (window.matchMedia('(pointer: coarse)').matches) ref.current?.blur();
      },
      ...(onClear ? { onClear } : {}),
    },
    state,
    ref,
  );

  const clear = () => {
    state.setValue('');
    onClear?.();
    ref.current?.focus();
  };

  return (
    <form role="search" className={styles.bar} onSubmit={(e) => e.preventDefault()}>
      <label {...labelProps} className="visuallyHidden">
        {label}
      </label>
      <input {...inputProps} ref={ref} className={styles.input} />
      {state.value !== '' && (
        <button type="button" className={styles.clear} aria-label="Clear search" onClick={clear}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </form>
  );
}
