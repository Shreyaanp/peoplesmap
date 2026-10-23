import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys, unwrap } from './core';
import type { ExtractedTag, LatLng, LocationMode, Me, MyLocation, TagInput, TagSuggestion } from './types';

/** Hooks for the onboarding steps: describe yourself, Tag Birth, then location and profile. */

/** "Describe yourself" → suggested tags, with spans back into the sentence for Tag Birth. */
export function useExtractTags() {
  return useMutation({
    mutationFn: async (sentence: string): Promise<ExtractedTag[]> => {
      const { tags } = await unwrap(api.POST('/tags/extract', { body: { sentence } }));
      // The generator reads the [start, end) tuples as plain arrays; give them their shape back.
      return tags.map((tag) => ({ ...tag, spans: tag.spans.map(([start = 0, end = 0]) => [start, end]) }));
    },
  });
}

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

/** Saves the location; the answer carries the public point and the locality name to confirm. */
export function useSaveLocation() {
  return useMutation({
    mutationFn: (location: { point: LatLng; mode: LocationMode }) =>
      unwrap<MyLocation>(api.PUT('/me/location', { body: location })),
  });
}

/** The last step: when it succeeds you are `active`, and the app swaps onboarding for the map. */
export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (profile: { displayName: string; sentence?: string; tags: TagInput[] }) =>
      unwrap<Me>(api.PUT('/me/profile', { body: profile })),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}
