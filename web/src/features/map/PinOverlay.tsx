import type { Map as MapLibreMap } from 'maplibre-gl';
import { cancelFrame, frame } from 'motion';
import {
  type AnimationEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LatLng, PersonPin } from '../../api/types';
import { Aura } from '../../ui/Aura';
import {
  bloomOrigins,
  createPeopleIndex,
  itemsIn,
  leadTag,
  type MapItem,
  springOrigins,
  type SpringOrigin,
} from './clusters';
import styles from './PinOverlay.module.css';
import { faceAt, morphAt } from './zoomLevels';

/** Never more DOM pins than this (the 60fps budget on a mid-range phone). */
const maxPins = 150;

type Group = Extract<MapItem, { kind: 'cluster' }>;

interface PinOverlayProps {
  map: MapLibreMap;
  pins: readonly PersonPin[];
  /** 1 or 3 tags on a pin (the open motion-lab question; `?pinTags=3` to compare). */
  tagsShown: 1 | 3;
  onSelect?: (personId: string) => void;
  /** Tapping a group glides in until it splits. */
  onZoomInto: (center: LatLng, zoom: number) => void;
  /** The search filter (matched slugs). When it changes, the next set of pins blooms in. */
  filterKey: string;
}

interface PinNode {
  el: HTMLElement;
  lng: number;
  lat: number;
  /** Set when the pin has just come out of a group: where from, and its place in the queue. */
  origin?: SpringOrigin | undefined;
}

/** Lead tag first (the one a search matched), then the rest of the top tags. */
function personLabel(pin: PersonPin): string {
  const tags = [...new Set([leadTag(pin), ...pin.topTags.map((t) => t.display)])].filter(Boolean).join(', ');
  return pin.liveTag ? `Person into ${tags}, live now: ${pin.liveTag.display}` : `Person into ${tags}`;
}

function groupLabel(group: Group): string {
  const into = group.topTag ? `, many into #${group.topTag}` : '';
  return `${group.count} people here${into}. Zoom in`;
}

/** The glow behind a group grows with the headcount, gently: 2 people 1.2×, 8 people 1.5×, at most 1.8×. */
function groupScale(count: number): number {
  return Math.min(1.8, 1 + Math.log2(count) / 6);
}

/**
 * People as DOM pins over the map. React decides which pins exist (clusters recomputed when a move
 * settles or the zoom crosses a whole level); one frame loop owns where they are, writing transforms
 * and the --morph / --face progress. No React render happens while the map moves.
 *
 * A group is a glow puck with its headcount at tag zoom and a stack of faces up close (cross-faded
 * by --face). Zooming in splits it, and whatever came out springs from the group's centre to its
 * own place, one after another.
 */
export function PinOverlay({ map, pins, tagsShown, onSelect, onZoomInto, filterKey }: PinOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, PinNode>());
  const dirty = useRef(true);
  /** Spring origins for pins about to mount, handed to each node as it registers. */
  const origins = useRef(new Map<string, SpringOrigin>());
  const [items, setItems] = useState<MapItem[]>([]);

  const index = useMemo(() => createPeopleIndex(pins), [pins]);

  // The filter the current pins were loaded for. Pins arrive after the filter changes (their tiles
  // are fetched for it), so the first new set after a change is the one that blooms.
  const filter = useRef(filterKey);
  const bloomedFor = useRef(filterKey);
  useEffect(() => {
    filter.current = filterKey;
  }, [filterKey]);

  // Which pins exist: recomputed when a move settles or the zoom crosses a whole level.
  useEffect(() => {
    let level = -1;
    let shown: MapItem[] = [];
    const bloom = bloomedFor.current !== filter.current;
    bloomedFor.current = filter.current;
    const leaves = (clusterId: number, limit: number) =>
      index.getLeaves(clusterId, limit).map((leaf) => leaf.properties.pin.id);
    const update = () => {
      const zoom = map.getZoom();
      const previousLevel = level;
      level = Math.floor(zoom);
      const b = map.getBounds();
      // Half a screen of margin, so short pans never reveal an empty edge.
      const padX = (b.getEast() - b.getWest()) / 2;
      const padY = (b.getNorth() - b.getSouth()) / 2;
      const center = map.getCenter();
      const next = itemsIn(
        index,
        [b.getWest() - padX, b.getSouth() - padY, b.getEast() + padX, b.getNorth() + padY],
        level,
      );
      next.sort(
        (a, b2) =>
          Math.hypot(a.lng - center.lng, a.lat - center.lat) -
          Math.hypot(b2.lng - center.lng, b2.lat - center.lat),
      );
      const kept = next.slice(0, maxPins);
      if (previousLevel === -1 && bloom) {
        origins.current = bloomOrigins(kept);
      } else if (previousLevel !== -1 && previousLevel !== level) {
        origins.current = springOrigins(shown, kept, leaves, level > previousLevel);
      }
      shown = kept;
      setItems(kept);
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
    const springs = new Map<HTMLElement, { dx: number; dy: number; order: number }>();
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
        if (node.origin) {
          const from = map.project([node.origin.lng, node.origin.lat]);
          springs.set(node.el, { dx: from.x - p.x, dy: from.y - p.y, order: node.origin.order });
          node.origin = undefined;
        }
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
      // Pins fresh out of a group: start the CSS spring from the group's centre (see .spring).
      for (const [el, { dx, dy, order }] of springs) {
        el.style.setProperty('--from-x', `${dx.toFixed(1)}px`);
        el.style.setProperty('--from-y', `${dy.toFixed(1)}px`);
        el.style.setProperty('--order', String(order));
        el.dataset.spring = 'true';
      }
      springs.clear();
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
    (item: MapItem) => (el: HTMLElement | null) => {
      if (!el) return;
      const origin = origins.current.get(item.key);
      origins.current.delete(item.key);
      nodes.current.set(item.key, { el, lng: item.lng, lat: item.lat, origin });
      dirty.current = true;
      return () => {
        nodes.current.delete(item.key);
      };
    },
    [],
  );

  /** The spring-out plays once; dropping the attribute keeps a later restyle from replaying it. */
  const endSpring = (event: AnimationEvent<HTMLElement>) => {
    if (event.animationName.includes('spring-out')) delete event.currentTarget.dataset.spring;
  };

  const zoomIntoCluster = (item: Group) => {
    const zoom = Math.min(index.getClusterExpansionZoom(item.clusterId), 18);
    onZoomInto({ lng: item.lng, lat: item.lat }, zoom);
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
            aria-label={groupLabel(item)}
            onClick={() => zoomIntoCluster(item)}
            onAnimationEnd={endSpring}
          >
            <span className={styles.spring}>
              <span className={styles.anchor}>
                <span
                  className={styles.group}
                  style={{ '--group-scale': groupScale(item.count).toFixed(2) } as CSSProperties}
                >
                  <span className={styles.puck}>
                    <span className={styles.halo} />
                    <span className={styles.count}>{item.count}</span>
                  </span>
                  <span className={styles.stack}>
                    {item.sample.map((id) => (
                      <Aura key={id} seed={id} className={styles.stackFace} />
                    ))}
                    <span className={styles.stackCount}>{item.count}</span>
                  </span>
                </span>
              </span>
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
            onAnimationEnd={endSpring}
          >
            <span className={styles.spring}>
              <span className={styles.anchor}>
                <span className={styles.flipper}>
                  <span className={styles.tagSide}>
                    <span className={styles.dot} />
                    <span className={styles.lead}>#{leadTag(item.pin)}</span>
                    {item.pin.topTags
                      .filter((tag) => tag.display !== leadTag(item.pin))
                      .slice(0, 2)
                      .map((tag) => (
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
            </span>
          </button>
        ),
      )}
    </div>
  );
}
