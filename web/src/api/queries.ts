import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys, unwrap } from './core';
import type { ConnectionState, PersonCardPage, Profile } from './types';

/**
 * Server data hooks shared across features. Query keys and freshness follow the Build Plan:
 * profiles 5 min (prefetched on press), discovery 30s.
 */

export { useMe } from './me';

export function useDiscover() {
  return useQuery<PersonCardPage>({
    queryKey: queryKeys.discover,
    queryFn: ({ signal }) => unwrap(api.GET('/discover', { params: { query: { limit: 20 } }, signal })),
    staleTime: 30_000,
  });
}

function profileQuery(id: string) {
  return {
    queryKey: queryKeys.person(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      unwrap(api.GET('/people/{personId}', { params: { path: { personId: id } }, signal })),
    staleTime: 5 * 60_000,
  };
}

export function useProfile(id: string) {
  return useQuery<Profile>(profileQuery(id));
}

/** Warm the profile on press-down, so the sheet opens with it already loaded. */
export function usePrefetchProfile() {
  const client = useQueryClient();
  return (id: string) => void client.prefetchQuery(profileQuery(id));
}

/** Connect / disconnect, optimistic: the button flips at once and rolls back on failure. */
export function useConnect(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (connect: boolean) =>
      unwrap<ConnectionState>(
        connect
          ? api.PUT('/connections/{personId}', { params: { path: { personId: id } } })
          : api.DELETE('/connections/{personId}', { params: { path: { personId: id } } }),
      ),
    onMutate: async (connect) => {
      await client.cancelQueries({ queryKey: queryKeys.person(id) });
      const previous = client.getQueryData<Profile>(queryKeys.person(id));
      if (previous) {
        client.setQueryData<Profile>(queryKeys.person(id), {
          ...previous,
          connection: { ...previous.connection, iConnect: connect },
        });
      }
      return { previous };
    },
    onError: (_error, _connect, context) => {
      if (context?.previous) client.setQueryData(queryKeys.person(id), context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.person(id) }),
  });
}
