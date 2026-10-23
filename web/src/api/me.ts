import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { ApiError, queryKeys, unwrap } from './core';
import type { Me } from './types';

/**
 * The signed-in person, or `null` when signed out (401). Any other failure stays an error.
 * Read at boot to choose sign-in or the map, so it lives apart from the heavier hooks.
 */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        return await unwrap(api.GET('/me', { signal }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}
