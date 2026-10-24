import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { queryKeys, unwrap } from './core';
import type { ExtractedTag, LatLng, LocationMode, Me, MyLocation, TagInput } from './types';

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
