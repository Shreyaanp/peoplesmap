import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { unwrap } from './core';
import type { TagSuggestion } from './types';

/** Suggestions while typing a tag, with how many people nearby use each one. */
export function useTagSuggestions(text: string) {
  const q = text.replace(/^#/, '').trim();
  return useQuery<TagSuggestion[]>({
    queryKey: ['tag-suggest', q],
    queryFn: ({ signal }) =>
      unwrap<{ suggestions: TagSuggestion[] }>(
        api.GET('/tags/suggest', { params: { query: { q, limit: 6 } }, signal }),
      ).then((r) => r.suggestions),
    enabled: q.length >= 1,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}
