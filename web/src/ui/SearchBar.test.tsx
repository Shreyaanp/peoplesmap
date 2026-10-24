import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';
import { SearchField } from './SearchField';
import { useSearchText, type SearchHandoff } from './searchShared';
import type { TagSuggestion } from '../api/types';

const suggestions: TagSuggestion[] = [
  { slug: 'badminton', display: 'badminton', countNearby: 340, nearLabel: 'Gachibowli' },
  { slug: 'baking', display: 'baking', countNearby: 0 },
];

interface HarnessProps {
  full?: boolean;
  query?: string | null;
  onSubmit?: (q: string) => void;
  onClear?: () => void;
  onText?: (text: string) => void;
  handoff?: SearchHandoff;
}

/** Holds the text the way the app does, so both bars can be driven like the real thing. */
function Harness({ full = true, query = null, onSubmit, onClear, onText, handoff }: HarnessProps) {
  const [text, setText] = useSearchText(query);
  const [seen] = useState(() => handoff);
  const field = {
    query,
    text,
    onTextChange: (next: string) => {
      setText(next);
      onText?.(next);
    },
    ...(onSubmit ? { onSubmit } : {}),
    ...(onClear ? { onClear } : {}),
    ...(seen ? { handoff: seen } : {}),
  };
  return full ? <SearchBar {...field} suggestions={suggestions} /> : <SearchField {...field} />;
}

describe.each([
  ['the plain field', false],
  ['the full bar', true],
])('%s', (_, full) => {
  it('is a labelled search landmark', () => {
    render(<Harness full={full} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole(full ? 'combobox' : 'searchbox', { name: 'Search people by interest' }),
    ).toBeInTheDocument();
  });

  it('submits on Enter and clears with the clear button', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness full={full} onSubmit={onSubmit} />);
    const input = screen.getByRole(full ? 'combobox' : 'searchbox');

    await user.type(input, 'trek this weekend{Enter}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('trek this weekend');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('ignores an empty submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness full={full} onSubmit={onSubmit} />);
    await user.type(screen.getByRole(full ? 'combobox' : 'searchbox'), '   {Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('search text', () => {
  it('shows the search in effect and follows it when it changes (back, a shared link)', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness query="#chess" onClear={onClear} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('#chess');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    rerender(<Harness query={null} onClear={onClear} />);
    expect(input).toHaveValue('');

    rerender(<Harness query="#trekking" onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe('the full bar', () => {
  it('suggests tags with local counts while a tag is typed, and searches the one picked', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByRole('combobox'), '#ba');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      '#badminton340 near Gachibowli',
      '#bakingnew around here',
    ]);

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('#badminton');
    expect(screen.getByRole('combobox')).toHaveValue('#badminton');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('suggests nothing for a sentence', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox'), 'ba this weekend');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('takes over from the plain field mid-typing, keeping text, focus and caret', async () => {
    const handoff: SearchHandoff = { focused: false, caret: null };
    const user = userEvent.setup();
    const { rerender } = render(<Harness full={false} handoff={handoff} />);
    await user.type(screen.getByRole('searchbox'), '#bad');

    rerender(<Harness full handoff={handoff} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('#bad');
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe(4);
    await user.keyboard('m');
    expect(input).toHaveValue('#badm');
  });
});
