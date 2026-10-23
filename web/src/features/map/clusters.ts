import Supercluster from 'supercluster';
import type { PersonPin } from '../../api/types';

/** How many faces a group shows when stacked up close. */
const sampleSize = 3;
/** The longest spring-out queue: later pins leave together, so a big group never drags on. */
const maxOrder = 6;

/** What a group of people carries up the cluster tree: a few faces and how often each tag appears. */
interface GroupProps {
  sample: string[];
  tags: Record<string, number>;
}

export type MapItem =
  | { key: string; kind: 'person'; lng: number; lat: number; pin: PersonPin }
  | {
      key: string;
      kind: 'cluster';
      lng: number;
      lat: number;
      count: number;
      clusterId: number;
      /** Up to three people in the group, for the stacked faces. */
      sample: string[];
      /** The tag most of the group shares. */
      topTag: string | undefined;
    };

export type PeopleIndex = Supercluster<{ pin: PersonPin }, GroupProps>;

export function createPeopleIndex(pins: readonly PersonPin[]): PeopleIndex {
  const index: PeopleIndex = new Supercluster({
    radius: 56,
    maxZoom: 17,
    map: ({ pin }) => ({
      sample: [pin.id],
      tags: Object.fromEntries(pin.topTags.map((t) => [t.display, 1])),
    }),
    reduce: (into, from) => {
      if (into.sample.length < sampleSize)
        into.sample.push(...from.sample.slice(0, sampleSize - into.sample.length));
      for (const [tag, count] of Object.entries(from.tags)) into.tags[tag] = (into.tags[tag] ?? 0) + count;
    },
  });
  index.load(
    pins.map((pin) => ({
      type: 'Feature',
      properties: { pin },
      geometry: { type: 'Point', coordinates: [pin.point.lng, pin.point.lat] },
    })),
  );
  return index;
}

function topTag(tags: Record<string, number>): string | undefined {
  let best: string | undefined;
  let most = 0;
  for (const [tag, count] of Object.entries(tags)) {
    if (count > most) [best, most] = [tag, count];
  }
  return best;
}

/** People and groups inside a bounding box at a whole zoom level. */
export function itemsIn(
  index: PeopleIndex,
  bbox: [number, number, number, number],
  level: number,
): MapItem[] {
  return index.getClusters(bbox, level).map((f) => {
    const [lng = 0, lat = 0] = f.geometry.coordinates;
    const props = f.properties;
    if ('cluster' in props && props.cluster) {
      return {
        key: `c${props.cluster_id}`,
        kind: 'cluster',
        lng,
        lat,
        count: props.point_count,
        clusterId: props.cluster_id,
        sample: props.sample,
        topTag: topTag(props.tags),
      };
    }
    const { pin } = props as { pin: PersonPin };
    return { key: pin.id, kind: 'person', lng, lat, pin };
  });
}

/** Where a newly shown item springs out from, and its place in the queue. */
export interface SpringOrigin {
  lng: number;
  lat: number;
  order: number;
}

/**
 * When zooming in splits a group, the people and smaller groups that came out of it spring out from
 * its centre, one after another. When zooming out merges people into a new group, the group pops in
 * where it stands. Anything else (panned into view) just appears.
 */
export function springOrigins(
  before: readonly MapItem[],
  after: readonly MapItem[],
  leaves: (clusterId: number, limit: number) => string[],
  zoomingIn: boolean,
): Map<string, SpringOrigin> {
  const origins = new Map<string, SpringOrigin>();
  if (before.length === 0) return origins;
  const beforeKeys = new Set(before.map((item) => item.key));
  const afterKeys = new Set(after.map((item) => item.key));

  if (!zoomingIn) {
    for (const item of after) {
      if (item.kind === 'cluster' && !beforeKeys.has(item.key)) {
        origins.set(item.key, { lng: item.lng, lat: item.lat, order: 0 });
      }
    }
    return origins;
  }

  // Every person inside a group that just split, mapped to that group.
  const parentOf = new Map<string, Extract<MapItem, { kind: 'cluster' }>>();
  for (const item of before) {
    if (item.kind !== 'cluster' || afterKeys.has(item.key)) continue;
    for (const id of leaves(item.clusterId, Infinity)) parentOf.set(id, item);
  }

  const queue = new Map<string, number>();
  for (const item of after) {
    if (beforeKeys.has(item.key)) continue;
    const someone = item.kind === 'person' ? item.pin.id : leaves(item.clusterId, 1)[0];
    const parent = someone ? parentOf.get(someone) : undefined;
    if (parent) {
      const order = queue.get(parent.key) ?? 0;
      queue.set(parent.key, order + 1);
      origins.set(item.key, { lng: parent.lng, lat: parent.lat, order: Math.min(order, maxOrder) });
    }
  }
  return origins;
}
