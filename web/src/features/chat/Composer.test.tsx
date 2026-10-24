import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';

describe('Composer', () => {
  it('sends the trimmed message on Enter and clears, keeping Shift+Enter for a new line', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer to="Ritika" onSend={onSend} />);
    const box = screen.getByRole('textbox', { name: 'Message Ritika' });

    await user.type(box, '  Court 3 at 7?{Shift>}{Enter}{/Shift}see you');
    expect(onSend).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledExactlyOnceWith('Court 3 at 7?\nsee you');
    expect(box).toHaveValue('');
  });

  it('never sends an empty message', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer to="Ritika" onSend={onSend} />);
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await user.type(screen.getByRole('textbox'), '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(send).toBeDisabled();
  });

  it('sends with the button', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<Composer to="Ritika" onSend={onSend} />);
    await user.type(screen.getByRole('textbox'), 'Hi!');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledExactlyOnceWith('Hi!');
  });
});
