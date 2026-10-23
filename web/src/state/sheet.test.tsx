import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SheetProvider, useSheet, useSheetActions, type SheetActions } from './sheet';

describe('sheet state', () => {
  it('throws a clear error outside its Provider', () => {
    expect(() => renderHook(() => useSheet((s) => s.snap))).toThrow(/inside <SheetProvider>/);
    expect(() => renderHook(() => useSheetActions())).toThrow(/inside <SheetProvider>/);
  });

  it('re-renders only readers whose slice changed; action-only components never', () => {
    const renders = { actions: 0, snap: 0, moving: 0 };
    let actions: SheetActions | undefined;

    function ActionsOnly() {
      renders.actions++;
      actions = useSheetActions();
      return null;
    }
    function SnapReader() {
      renders.snap++;
      return <p>{useSheet((s) => s.snap)}</p>;
    }
    function MovingReader() {
      renders.moving++;
      useSheet((s) => s.moving);
      return null;
    }

    render(
      <SheetProvider>
        <ActionsOnly />
        <SnapReader />
        <MovingReader />
      </SheetProvider>,
    );
    expect(renders).toEqual({ actions: 1, snap: 1, moving: 1 });

    act(() => actions?.setSnap('half'));
    expect(screen.getByText('half')).toBeInTheDocument();
    expect(renders).toEqual({ actions: 1, snap: 2, moving: 1 });

    act(() => actions?.setMoving(true));
    expect(renders).toEqual({ actions: 1, snap: 2, moving: 2 });

    // Setting the same value is a no-op.
    act(() => actions?.setSnap('half'));
    expect(renders).toEqual({ actions: 1, snap: 2, moving: 2 });
  });
});
