import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys, unwrap } from './core';
import type { InboxSummary } from './types';

/**
 * Unread counts for the inbox button. Kept apart from the chat hooks so the button stays light.
 * Polls until the realtime socket (api/realtime.md) pushes `/user/queue/inbox` instead.
 */
export function useInboxSummary() {
  return useQuery<InboxSummary>({
    queryKey: queryKeys.inboxSummary,
    queryFn: ({ signal }) => unwrap(api.GET('/me/inbox-summary', { signal })),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
