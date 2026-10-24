import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast, useToastActions, type ToastActions } from './toast';

describe('toast state', () => {
  it('throws a clear error outside its Provider', () => {
    expect(() => renderHook(() => useToast())).toThrow(/inside <ToastProvider>/);
    expect(() => renderHook(() => useToastActions())).toThrow(/inside <ToastProvider>/);
  });

  it('re-renders the reader on each toast; action-only components never', () => {
    const renders = { actions: 0, reader: 0 };
    let actions: ToastActions | undefined;

    function ActionsOnly() {
      renders.actions++;
      actions = useToastActions();
      return null;
    }
    function Reader() {
      renders.reader++;
      return <p>{useToast()?.text ?? 'none'}</p>;
    }

    render(
      <ToastProvider>
        <ActionsOnly />
        <Reader />
      </ToastProvider>,
    );
    act(() => actions?.show({ text: 'Blocked Ritika' }));
    expect(screen.getByText('Blocked Ritika')).toBeInTheDocument();
    act(() => actions?.show({ text: 'Ignored Arjun' }));
    expect(screen.getByText('Ignored Arjun')).toBeInTheDocument();
    expect(renders).toEqual({ actions: 1, reader: 3 });
  });

  it("an older toast's dismiss never closes a newer one", () => {
    let actions: ToastActions | undefined;
    function Reader() {
      actions = useToastActions();
      return <p>{useToast()?.text ?? 'none'}</p>;
    }
    render(
      <ToastProvider>
        <Reader />
      </ToastProvider>,
    );
    act(() => actions?.show({ text: 'first' }));
    act(() => actions?.show({ text: 'second' }));
    act(() => actions?.dismiss(1));
    expect(screen.getByText('second')).toBeInTheDocument();
    act(() => actions?.dismiss());
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
