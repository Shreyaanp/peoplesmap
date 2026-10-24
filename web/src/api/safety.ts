import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { noContent, queryKeys, unwrap } from './core';
import type { Me, PersonMini, ReportInput, Settings, SettingsPatch } from './types';

/**
 * Safety and privacy: my settings (hide me from the map, which folders notify), blocking and
 * reporting. Blocking changes who I can see everywhere, so it refreshes every people query.
 */

/** Every cached answer that lists or shows people. The open conversation drops out with 'inbox'. */
function refreshPeople(client: QueryClient) {
  for (const key of [
    ['people'],
    queryKeys.discover,
    ['search'],
    ['person'],
    queryKeys.inbox,
    queryKeys.blocks,
  ])
    void client.invalidateQueries({ queryKey: key });
}

/** Settings flip at once (they are switches) and roll back if the save fails. */
export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => unwrap<Settings>(api.PATCH('/me/settings', { body: patch })),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: queryKeys.me });
      const previous = client.getQueryData<Me | null>(queryKeys.me);
      if (previous)
        client.setQueryData<Me>(queryKeys.me, { ...previous, settings: { ...previous.settings, ...patch } });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) client.setQueryData(queryKeys.me, context.previous);
    },
    onSuccess: (settings, patch) => {
      const me = client.getQueryData<Me | null>(queryKeys.me);
      if (me) client.setQueryData<Me>(queryKeys.me, { ...me, settings });
      // Hiding takes my own pin off the map.
      if ('hiddenFromMap' in patch) void client.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

/** Block or unblock someone. Neither is ever told. */
export function useBlock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, blocked }: { personId: string; blocked: boolean }) => {
      const params = { params: { path: { personId } } };
      return noContent(
        blocked ? api.PUT('/blocks/{personId}', params) : api.DELETE('/blocks/{personId}', params),
      );
    },
    onSuccess: () => refreshPeople(client),
  });
}

/** People I have blocked, newest first. */
export function useBlocks(enabled: boolean) {
  return useQuery<PersonMini[]>({
    queryKey: queryKeys.blocks,
    queryFn: async ({ signal }) => (await unwrap(api.GET('/me/blocks', { signal }))).items,
    enabled,
  });
}

/** Report someone (or one of their messages), blocking them in the same call unless asked not to. */
export function useReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportInput) => noContent(api.POST('/reports', { body: input })),
    onSuccess: (_result, input) => {
      if (input.alsoBlock !== false) refreshPeople(client);
    },
  });
}
