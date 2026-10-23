import { useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { PeopleTile, PersonPin } from '../../api/types';
import type { MapView } from './controller';
import { minPeopleDataZoom, tileKey, tilesFor, type Tile } from './tiles';
import { peopleFetchZoom } from './zoomLevels';

const maxPeopleDataZoom = 14;

async function fetchPeopleTile(
  tile: Tile,
  tags: readonly string[],
  signal: AbortSignal,
): Promise<PeopleTile> {
  const { data, error } = await api.GET('/people/tiles/{z}/{x}/{y}', {
    params: { path: tile, query: tags.length > 0 ? { tags: tags.join(',') } : {} },
    signal,
  });
  if (error) throw new Error(error.title);
  return data;
}

function peopleDataZoom(zoom: number): number {
  return Math.min(maxPeopleDataZoom, Math.max(minPeopleDataZoom, Math.floor(zoom) - 1));
}

/**
 * People in view from mid zoom in. Each tile is its own query (fresh 30s, cancelled when panned
 * past). Returns null until the whole view has arrived; the overlay keeps its pins meanwhile.
 */
export function usePeopleTiles(view: MapView | null, tags: readonly string[]): PersonPin[] | null {
  const tagsKey = [...tags].sort().join(',');
  const tiles = view && view.zoom >= peopleFetchZoom ? tilesFor(view.bounds, peopleDataZoom(view.zoom)) : [];
  return useQueries({
    queries: tiles.map((tile) => ({
      queryKey: ['people', tileKey(tile), tagsKey],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchPeopleTile(tile, tags, signal),
      staleTime: 30_000,
    })),
    combine: (results) => {
      if (results.some((r) => r.isPending)) return null;
      const byId = new Map<string, PersonPin>();
      for (const result of results) for (const pin of result.data?.people ?? []) byId.set(pin.id, pin);
      return [...byId.values()];
    },
  });
}
