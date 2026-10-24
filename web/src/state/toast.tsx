import { createContext, use, useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * The one toast at the bottom of the screen: a short confirmation, often with Undo (undo over
 * confirm dialogs). It lives above every feature, so it outlives the profile or folder that showed
 * it. A new toast replaces the current one.
 */

export interface Toast {
  /** Increases with each toast, so a timer for an older one never closes a newer one. */
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export interface ToastActions {
  show(toast: Omit<Toast, 'id'>): void;
  /** Closes the toast, or only that one when an id is given. */
  dismiss(id?: number): void;
}

interface ToastStore extends ToastActions {
  getState(): Toast | null;
  subscribe(listener: () => void): () => void;
}

function createToastStore(): ToastStore {
  let state: Toast | null = null;
  let next = 1;
  const listeners = new Set<() => void>();
  const set = (toast: Toast | null) => {
    state = toast;
    for (const listener of listeners) listener();
  };
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    show: (toast) => set({ ...toast, id: next++ }),
    dismiss: (id) => {
      if (state && (id === undefined || state.id === id)) set(null);
    },
  };
}

const ToastStoreContext = createContext<ToastStore | null>(null);
ToastStoreContext.displayName = 'ToastStoreContext';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createToastStore);
  return <ToastStoreContext value={store}>{children}</ToastStoreContext>;
}

function useToastStore(): ToastStore {
  const store = use(ToastStoreContext);
  if (!store) throw new Error('useToast / useToastActions must be used inside <ToastProvider>.');
  return store;
}

/** The toast on show, or null. */
export function useToast(): Toast | null {
  const store = useToastStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Show and dismiss. Stable for the app's lifetime: callers never re-render because of them. */
export function useToastActions(): ToastActions {
  return useToastStore();
}
