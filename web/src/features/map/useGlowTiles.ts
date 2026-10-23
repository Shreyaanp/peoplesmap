import { useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { GlowCell, GlowTile } from '../../api/types';
import type { MapView } from './controller';
import { glowDataZoom, tileKey, tilesFor, type Tile } from './tiles';

const glowsVisibleBelowZoom = 14.5;

export interface GlowFrame {
  cells: GlowCell[];
  resolution: 6 | 7 | 8;
}

async function fetchGlowTile(tile: Tile, tags: readonly string[], signal: AbortSignal): Promise<GlowTile> {
  const { data, error } = await api.GET('/glows/{z}/{x}/{y}', {
    params: { path: tile, query: tags.length > 0 ? { tags: tags.join(',') } : {} },
    signal,
  });
  if (error) throw new Error(error.title);
  return data;
}

/**
 * Glow cells for the tiles in view. Each tile is its own query (cached 60s). Returns null until every
 * tile of the view has arrived; the map keeps showing the previous glows meanwhile, so zooming never
 * flashes empty.
 */
export function useGlowTiles(view: MapView | null, tags: readonly string[]): GlowFrame | null {
  const tagsKey = [...tags].sort().join(',');
  // Past the Zoom Morph the glows are invisible, so their tiles are not fetched.
  const tiles =
    view && view.zoom < glowsVisibleBelowZoom ? tilesFor(view.bounds, glowDataZoom(view.zoom)) : [];
  return useQueries({
    queries: tiles.map((tile) => ({
      queryKey: ['glows', tileKey(tile), tagsKey],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchGlowTile(tile, tags, signal),
      staleTime: 60_000,
    })),
    combine: (results) => {
      if (results.length === 0 || results.some((r) => r.isPending)) return null;
      const loaded = results.flatMap((r) => (r.data ? [r.data] : []));
      const first = loaded[0];
      if (!first) return null;
      return { cells: loaded.flatMap((d) => d.cells), resolution: first.resolution };
    },
  });
}
