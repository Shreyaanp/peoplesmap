import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { SheetProvider } from './sheet';

/**
 * Every Provider, composed in one deliberate order (outermost first):
 * 1. Server data (TanStack Query): everything below may fetch.
 * 2. Sheet: read by the sheet, the map and the search bar.
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
      <SheetProvider>{children}</SheetProvider>
    </QueryClientProvider>
  );
}
