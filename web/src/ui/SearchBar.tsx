import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { useComboBox, useListBox, useOption } from 'react-aria';
import { Item, useComboBoxState, type ComboBoxState, type Key } from 'react-stately';
import type { TagSuggestion } from '../api/types';
import styles from './SearchBar.module.css';
import { searchLabel, searchPlaceholder, sendSearch, tagPrefix, type SearchFieldProps } from './searchShared';

interface SearchBarProps extends SearchFieldProps {
  /** Tags for what is being typed, with how many people nearby use each. */
  suggestions?: readonly TagSuggestion[];
}

const peopleFormat = new Intl.NumberFormat('en-IN');

/**
 * The full search bar. Typing a tag drops down suggestions with local counts
 * ("#badminton · 340 near Gachibowli"); Enter with none highlighted searches exactly what was typed,
 * so a sentence ("trek this weekend") goes straight through. It loads just after first paint and
 * replaces the plain field (searchShared.ts). Behaviour from React Aria's combobox; the look is ours.
 */
export function SearchBar({
  query,
  text,
  onTextChange,
  onSubmit,
  onClear,
  handoff,
  suggestions = [],
}: SearchBarProps) {
  // Suggestions are for a tag being typed, not a sentence; a search just sent needs none.
  const [sent, setSent] = useState<string | null>(null);
  const typing = tagPrefix(text);
  const items = typing && text !== query && text !== sent ? suggestions.filter((s) => s.slug !== typing) : [];

  const inputRef = useRef<HTMLInputElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Taking over from the plain field: carry on where the person was typing.
  useEffect(() => {
    const input = inputRef.current;
    if (!handoff?.focused || !input) return;
    input.focus();
    if (handoff.caret != null) input.setSelectionRange(handoff.caret, handoff.caret);
  }, [handoff]);

  const submit = (value: string) => {
    if (!sendSearch(value, onSubmit, inputRef.current)) return;
    setSent(value);
    state.close();
  };

  const state = useComboBoxState<TagSuggestion>({
    items,
    children: (item) => (
      <Item key={item.slug} textValue={`#${item.display}`}>
        <span className={styles.optionTag}>
          #{item.display.slice(0, typing.length)}
          <b>{item.display.slice(typing.length)}</b>
        </span>
        <span className={styles.optionCount}>
          {item.countNearby > 0
            ? `${peopleFormat.format(item.countNearby)} near ${item.nearLabel ?? 'you'}`
            : 'new around here'}
        </span>
      </Item>
    ),
    inputValue: text,
    onInputChange: onTextChange,
    selectedKey: null,
    onSelectionChange: (key) => {
      const picked = items.find((s) => s.slug === key);
      if (!picked) return;
      onTextChange(`#${picked.display}`);
      submit(`#${picked.display}`);
    },
    allowsCustomValue: true,
    allowsEmptyCollection: false,
    menuTrigger: 'input',
  });

  const { labelProps, inputProps, listBoxProps } = useComboBox(
    {
      label: searchLabel,
      placeholder: searchPlaceholder,
      inputRef,
      listBoxRef,
      popoverRef,
      allowsCustomValue: true,
    },
    state,
  );

  // Suggestions arrive a moment after typing; open the list when they do (the state only opens on
  // input changes, when the collection may still be empty).
  const hasItems = items.length > 0;
  const { isFocused, isOpen, open } = state;
  useEffect(() => {
    if (isFocused && hasItems && !isOpen) open(null, 'input');
  }, [isFocused, hasItems, isOpen, open]);

  // Read the highlight before React Aria handles the key: picking an option clears it, and that
  // Enter must not also send the half-typed text.
  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && state.selectionManager.focusedKey == null) submit(text);
  };

  const clear = () => {
    onTextChange('');
    state.close();
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <form role="search" className={styles.search} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.bar}>
        <label {...labelProps} className="visuallyHidden">
          {searchLabel}
        </label>
        <input
          {...inputProps}
          ref={inputRef}
          onKeyDownCapture={onKeyDownCapture}
          type="search"
          className={styles.input}
          enterKeyHint="search"
        />
        {text !== '' && (
          <button type="button" className={styles.clear} aria-label="Clear search" onClick={clear}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {state.isOpen && hasItems && (
        <div ref={popoverRef} className={styles.popover}>
          <Suggestions {...listBoxProps} listBoxRef={listBoxRef} state={state} />
        </div>
      )}
    </form>
  );
}

function Suggestions({
  listBoxRef,
  state,
  ...props
}: Parameters<typeof useListBox>[0] & {
  listBoxRef: RefObject<HTMLUListElement | null>;
  state: ComboBoxState<TagSuggestion>;
}) {
  const { listBoxProps } = useListBox(props, state, listBoxRef);
  return (
    <ul {...listBoxProps} ref={listBoxRef} className={styles.options}>
      {[...state.collection].map((item) => (
        <Option key={item.key} itemKey={item.key} state={state}>
          {item.rendered}
        </Option>
      ))}
    </ul>
  );
}

function Option({
  itemKey,
  state,
  children,
}: {
  itemKey: Key;
  state: ComboBoxState<TagSuggestion>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isFocused } = useOption({ key: itemKey }, state, ref);
  return (
    <li {...optionProps} ref={ref} className={styles.option} data-focused={isFocused}>
      {children}
    </li>
  );
}

export default SearchBar;
