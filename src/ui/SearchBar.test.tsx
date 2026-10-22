import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('is a labelled search landmark', () => {
    render(<SearchBar />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search people by interest' })).toBeInTheDocument();
  });

  it('submits on Enter and clears with the clear button', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox');

    await user.type(input, '#badminton{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('#badminton');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
});
