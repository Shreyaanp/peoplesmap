import { useRef } from 'react';
import { useSearchField } from 'react-aria';
import { useSearchFieldState } from 'react-stately';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSubmit?: (query: string) => void;
}

const label = 'Search people by interest';

/** The big search bar the app opens to. Behaviour from React Aria; the look is ours. */
export function SearchBar({ onSubmit }: SearchBarProps) {
  const state = useSearchFieldState({});
  const ref = useRef<HTMLInputElement>(null);
  const { labelProps, inputProps } = useSearchField(
    { label, placeholder: 'Try #badminton or "trek this weekend"', ...(onSubmit ? { onSubmit } : {}) },
    state,
    ref,
  );

  const clear = () => {
    state.setValue('');
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
