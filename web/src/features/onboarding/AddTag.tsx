import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { useComboBox, useListBox, useOption } from 'react-aria';
import { Item, useComboBoxState, type ComboBoxState } from 'react-stately';
import { useTagSuggestions } from '../../api/onboarding';
import type { Key } from 'react-stately';
import type { TagSuggestion } from '../../api/types';
import type { TagDraft } from './draft';
import styles from './Steps.module.css';

interface AddTagProps {
  taken: readonly TagDraft[];
  onAdd: (tag: TagDraft) => void;
}

const peopleFormat = new Intl.NumberFormat('en-IN');

/**
 * Smart hybrid input: type anything, or pick a suggestion that shows how many people nearby use it
 * ("#badminton · 340 near Gachibowli"). Enter adds what you typed. Behaviour from React Aria's
 * combobox; the list renders inline under the field so it never covers the chips.
 */
export function AddTag({ taken, onAdd }: AddTagProps) {
  const [text, setText] = useState('');
  const suggestions = useTagSuggestions(text);
  // Nothing to suggest for an empty field (the last answer may linger while the next one loads).
  const items =
    text.trim() === '' ? [] : (suggestions.data ?? []).filter((s) => !taken.some((t) => t.slug === s.slug));

  const inputRef = useRef<HTMLInputElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const addTyped = () => {
    const display = text.replace(/^#/, '').trim();
    if (display.length < 2) return;
    onAdd({ slug: slugOf(display), display, level: 'doing' });
    setText('');
  };

  const state = useComboBoxState<TagSuggestion>({
    items,
    children: (item) => (
      <Item key={item.slug} textValue={item.display}>
        <span className={styles.optionTag}>#{item.display}</span>
        <span className={styles.optionCount}>
          {item.countNearby > 0
            ? `${peopleFormat.format(item.countNearby)} near ${item.nearLabel ?? 'you'}`
            : 'new around here'}
        </span>
      </Item>
    ),
    inputValue: text,
    onInputChange: setText,
    selectedKey: null,
    onSelectionChange: (key) => {
      const picked = items.find((s) => s.slug === key);
      if (!picked) return;
      onAdd({ slug: picked.slug, display: picked.display, level: 'doing' });
      setText('');
    },
    allowsCustomValue: true,
    allowsEmptyCollection: false,
    menuTrigger: 'input',
  });

  const { labelProps, inputProps, listBoxProps } = useComboBox(
    {
      label: 'Add a tag',
      placeholder: '#something you love',
      inputRef,
      listBoxRef,
      popoverRef,
      allowsCustomValue: true,
      // Enter with no suggestion highlighted adds exactly what was typed.
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' && state.selectionManager.focusedKey == null) addTyped();
      },
    },
    state,
  );

  // Suggestions arrive a moment after typing; open the list when they do (the state only opens
  // on input changes, when the collection may still be empty).
  const hasItems = items.length > 0;
  const { isFocused, isOpen, open } = state;
  useEffect(() => {
    if (isFocused && hasItems && !isOpen && text.trim() !== '') open(null, 'input');
  }, [isFocused, hasItems, isOpen, open, text]);

  return (
    <div className={styles.addTag}>
      <label {...labelProps} className="visuallyHidden">
        Add a tag
      </label>
      <div className={styles.addRow}>
        <input {...inputProps} ref={inputRef} className={styles.input} maxLength={40} />
        <button
          type="button"
          className={styles.addButton}
          disabled={text.replace(/^#/, '').trim().length < 2}
          onClick={addTyped}
        >
          Add
        </button>
      </div>
      {state.isOpen && (
        <div ref={popoverRef}>
          <Suggestions {...listBoxProps} listBoxRef={listBoxRef} state={state} />
        </div>
      )}
    </div>
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

function slugOf(display: string): string {
  return display
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
