import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { SheetProvider } from './sheet';
import { ToastProvider } from './toast';

/**
 * Every Provider, composed in one deliberate order (outermost first):
 * 1. Server data (TanStack Query): everything below may fetch.
 * 2. Sheet: read by the sheet, the map and the search bar.
 * 3. Toast: shown from any feature (Undo after ignoring or blocking), drawn once by the app.
 * Later: map controller before Search, because Search calls flyTo.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SheetProvider>
        <ToastProvider>{children}</ToastProvider>
      </SheetProvider>
    </QueryClientProvider>
  );
}
