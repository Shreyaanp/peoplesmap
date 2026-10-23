import type { Map as MapLibreMap } from 'maplibre-gl';
import { cancelFrame, frame } from 'motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Supercluster from 'supercluster';
import type { PersonPin } from '../../api/types';
import { Aura } from '../../ui/Aura';
import styles from './PinOverlay.module.css';
import { faceAt, morphAt } from './zoomLevels';

/** Never more DOM pins than this (the 60fps budget on a mid-range phone). */
const maxPins = 150;

type Item =
  | { key: string; kind: 'person'; lng: number; lat: number; pin: PersonPin }
  | { key: string; kind: 'cluster'; lng: number; lat: number; count: number; clusterId: number };

interface PinOverlayProps {
  map: MapLibreMap;
  pins: readonly PersonPin[];
  /** 1 or 3 tags on a pin (the open motion-lab question; `?pinTags=3` to compare). */
  tagsShown: 1 | 3;
  onSelect?: (personId: string) => void;
}

function personLabel(pin: PersonPin): string {
  const tags = pin.topTags.map((t) => t.display).join(', ');
  return pin.liveTag ? `Person into ${tags}, live now: ${pin.liveTag.display}` : `Person into ${tags}`;
}

/**
 * People as DOM pins over the map. React decides which pins exist (clusters recomputed when a move
 * settles or the zoom crosses a whole level); one frame loop owns where they are, writing transforms
 * and the --morph / --face progress. No React render happens while the map moves.
 */
export function PinOverlay({ map, pins, tagsShown, onSelect }: PinOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, { el: HTMLElement; lng: number; lat: number }>());
  const dirty = useRef(true);
  const [items, setItems] = useState<Item[]>([]);

  const index = useMemo(() => {
    const cluster = new Supercluster<{ pin: PersonPin }>({ radius: 56, maxZoom: 17 });
    cluster.load(
      pins.map((pin) => ({
        type: 'Feature',
        properties: { pin },
        geometry: { type: 'Point', coordinates: [pin.point.lng, pin.point.lat] },
      })),
    );
    return cluster;
  }, [pins]);

  // Which pins exist: recomputed when a move settles or the zoom crosses a whole level.
  useEffect(() => {
    let level = -1;
    const update = () => {
      const zoom = map.getZoom();
      level = Math.floor(zoom);
      const b = map.getBounds();
      // Half a screen of margin, so short pans never reveal an empty edge.
      const padX = (b.getEast() - b.getWest()) / 2;
      const padY = (b.getNorth() - b.getSouth()) / 2;
      const center = map.getCenter();
      const features = index.getClusters(
        [b.getWest() - padX, b.getSouth() - padY, b.getEast() + padX, b.getNorth() + padY],
        level,
      );
      const next: Item[] = features.map((f) => {
        const [lng = 0, lat = 0] = f.geometry.coordinates;
        if ('cluster' in f.properties && f.properties.cluster) {
          const { cluster_id: clusterId, point_count: count } = f.properties;
          return { key: `c${clusterId}`, kind: 'cluster', lng, lat, count, clusterId };
        }
        const { pin } = f.properties as { pin: PersonPin };
        return { key: pin.id, kind: 'person', lng, lat, pin };
      });
      next.sort(
        (a, b2) =>
          Math.hypot(a.lng - center.lng, a.lat - center.lat) -
          Math.hypot(b2.lng - center.lng, b2.lat - center.lat),
      );
      setItems(next.slice(0, maxPins));
    };
    const onZoom = () => {
      if (Math.floor(map.getZoom()) !== level) update();
    };
    update();
    map.on('moveend', update);
    map.on('zoom', onZoom);
    return () => {
      map.off('moveend', update);
      map.off('zoom', onZoom);
    };
  }, [map, index]);

  // Where pins are: one loop on Motion's frame clock. Read the camera, then write transforms.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const positions = new Map<string, { x: number; y: number }>();
    let zoom = map.getZoom();
    let changed = false;
    const markDirty = () => {
      dirty.current = true;
    };
    const read = () => {
      if (!dirty.current) return;
      dirty.current = false;
      zoom = map.getZoom();
      for (const [key, node] of nodes.current) {
        const p = map.project([node.lng, node.lat]);
        positions.set(key, { x: p.x, y: p.y });
      }
      changed = true;
    };
    const render = () => {
      if (!changed) return;
      changed = false;
      const morph = morphAt(zoom);
      root.style.setProperty('--morph', morph.toFixed(3));
      root.style.setProperty('--face', faceAt(zoom).toFixed(3));
      root.dataset.active = String(morph > 0.02);
      for (const [key, node] of nodes.current) {
        const p = positions.get(key);
        if (p) node.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      }
    };
    map.on('move', markDirty);
    map.on('resize', markDirty);
    frame.read(read, true);
    frame.render(render, true);
    return () => {
      map.off('move', markDirty);
      map.off('resize', markDirty);
      cancelFrame(read);
      cancelFrame(render);
    };
  }, [map]);

  // New pins need a position before their first paint.
  useEffect(() => {
    dirty.current = true;
  }, [items]);

  const register = useCallback(
    (item: Item) => (el: HTMLElement | null) => {
      if (!el) return;
      nodes.current.set(item.key, { el, lng: item.lng, lat: item.lat });
      dirty.current = true;
      return () => {
        nodes.current.delete(item.key);
      };
    },
    [],
  );

  const zoomIntoCluster = (item: Extract<Item, { kind: 'cluster' }>) => {
    const zoom = Math.min(index.getClusterExpansionZoom(item.clusterId), 18);
    map.easeTo({ center: [item.lng, item.lat], zoom });
  };

  return (
    <div ref={rootRef} className={styles.overlay} data-active="false" data-tags={tagsShown}>
      {items.map((item) =>
        item.kind === 'cluster' ? (
          <button
            key={item.key}
            ref={register(item)}
            type="button"
            className={styles.pin}
            aria-label={`${item.count} people here. Zoom in`}
            onClick={() => zoomIntoCluster(item)}
          >
            <span className={styles.anchor}>
              <span className={styles.cluster}>{item.count}</span>
            </span>
          </button>
        ) : (
          <button
            key={item.key}
            ref={register(item)}
            type="button"
            className={styles.pin}
            aria-label={personLabel(item.pin)}
            data-live={item.pin.liveTag ? 'true' : undefined}
            onClick={() => onSelect?.(item.pin.id)}
          >
            <span className={styles.anchor}>
              <span className={styles.flipper}>
                <span className={styles.tagSide}>
                  <span className={styles.dot} />
                  <span className={styles.lead}>#{item.pin.topTags[0]?.display}</span>
                  {item.pin.topTags.slice(1).map((tag) => (
                    <span key={tag.slug} className={styles.more}>
                      #{tag.display}
                    </span>
                  ))}
                </span>
                <span className={styles.faceSide}>
                  <Aura seed={item.pin.id} />
                </span>
              </span>
            </span>
          </button>
        ),
      )}
    </div>
  );
}
