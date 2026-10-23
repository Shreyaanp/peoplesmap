import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { ApiError, queryKeys, unwrap } from './core';
import type { GlowTile, Me } from './types';

/** The coarse amber city behind the sign-in screen: counts only, public. */
export function useCityGlow() {
  return useQuery<GlowTile>({
    queryKey: queryKeys.cityGlow,
    queryFn: ({ signal }) => unwrap(api.GET('/public/city-glow', { signal })),
    staleTime: 10 * 60_000,
  });
}

export type SignInWith = { credential: string } | { personId: string };

/** Signing in stores the returned person as `me`; the signed-in app renders from there. */
export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (how: SignInWith) =>
      unwrap<Me>(
        'credential' in how ? api.POST('/auth/google', { body: how }) : api.POST('/auth/dev', { body: how }),
      ),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}

/** Signing out drops every cached answer, so nothing from one person survives into the next session. */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.POST('/auth/logout');
      if (error) throw new ApiError('Sign out failed', response.status);
    },
    onSuccess: () => {
      // `me` is updated in place (its observers must hear it); everything else is dropped.
      client.setQueryData(queryKeys.me, null);
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
    },
  });
}
