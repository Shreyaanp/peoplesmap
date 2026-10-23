import { createContext, use, useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * The bottom sheet's client state. Many components read a slice of it (the sheet, the map's padding,
 * the search bar), so the context holds one stable store and readers subscribe through a selector:
 * only components whose slice changed re-render. The open profile is URL state, not here.
 */

export type SheetSnap = 'peek' | 'half' | 'full';

export interface SheetState {
  snap: SheetSnap;
  /** True while the sheet is dragged or settling (glass swaps to a solid tint). */
  moving: boolean;
}

export interface SheetActions {
  setSnap(snap: SheetSnap): void;
  setMoving(moving: boolean): void;
}

interface SheetStore extends SheetActions {
  getState(): SheetState;
  subscribe(listener: () => void): () => void;
}

function createSheetStore(initial: SheetState): SheetStore {
  let state = initial;
  const listeners = new Set<() => void>();
  const set = (next: Partial<SheetState>) => {
    const merged = { ...state, ...next };
    if (merged.snap === state.snap && merged.moving === state.moving) return;
    state = merged;
    for (const listener of listeners) listener();
  };
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSnap: (snap) => set({ snap }),
    setMoving: (moving) => set({ moving }),
  };
}

const SheetStoreContext = createContext<SheetStore | null>(null);
SheetStoreContext.displayName = 'SheetStoreContext';

export function SheetProvider({
  children,
  initial = { snap: 'peek', moving: false },
}: {
  children: ReactNode;
  initial?: SheetState;
}) {
  const [store] = useState(() => createSheetStore(initial));
  return <SheetStoreContext value={store}>{children}</SheetStoreContext>;
}

function useSheetStore(): SheetStore {
  const store = use(SheetStoreContext);
  if (!store) throw new Error('useSheet / useSheetActions must be used inside <SheetProvider>.');
  return store;
}

/** Reads one slice of the sheet state; re-renders only when that slice changes. */
export function useSheet<T>(selector: (state: SheetState) => T): T {
  const store = useSheetStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

/** The sheet's actions. Stable for the app's lifetime: callers never re-render because of them. */
export function useSheetActions(): SheetActions {
  return useSheetStore();
}
