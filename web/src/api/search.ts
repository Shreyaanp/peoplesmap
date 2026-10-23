import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys, unwrap } from './core';
import type { SearchResult } from './types';

/**
 * The search the URL asks for (`?q=`). The map reads the same query for its tag filter and the
 * camera; the sheet reads it for the list. Results stay fresh for 30s, like discovery. A new search
 * over an old one keeps the old results showing until the new ones land (`isPlaceholderData`).
 */
export function useSearch(q: string | null) {
  return useQuery<SearchResult>({
    queryKey: queryKeys.search(q ?? ''),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/search', { params: { query: { q: q ?? '', limit: 20 } }, signal })),
    enabled: !!q,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** The canonical tags a search matched: what the map filters by. Empty without a search. */
export function matchedSlugs(result: SearchResult | undefined): string[] {
  return result?.query.tags.map((tag) => tag.slug) ?? [];
}
