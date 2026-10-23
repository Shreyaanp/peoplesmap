import { describe, expect, it } from 'vitest';
import type { PersonPin } from '../../api/types';
import { createPeopleIndex, itemsIn, type MapItem, springOrigins } from './clusters';

function pin(id: string, lat: number, lng: number, tags: string[]): PersonPin {
  return {
    id,
    point: { lat, lng },
    topTags: tags.map((display) => ({ slug: display, display, level: 'doing' })),
    liveTag: null,
  } as unknown as PersonPin;
}

// Two pairs of people in Gachibowli, a few hundred metres apart.
const pins = [
  pin('a', 17.44, 78.348, ['badminton', 'chess']),
  pin('b', 17.4401, 78.3481, ['badminton']),
  pin('c', 17.443, 78.352, ['photography']),
  pin('d', 17.4431, 78.3521, ['badminton', 'photography']),
];
const everywhere: [number, number, number, number] = [78, 17, 79, 18];

describe('people index', () => {
  it('groups people with a sample of faces and the tag most of them share', () => {
    const index = createPeopleIndex(pins);
    const [group] = itemsIn(index, everywhere, 10);
    expect(group).toMatchObject({ kind: 'cluster', count: 4, topTag: 'badminton' });
    expect(group?.kind === 'cluster' && group.sample).toHaveLength(3);
  });

  it('springs what a split group lets go from its centre, one after another', () => {
    const index = createPeopleIndex(pins);
    const leaves = (id: number, limit: number) =>
      index.getLeaves(id, limit).map((leaf) => leaf.properties.pin.id);
    const before = itemsIn(index, everywhere, 10);
    const after = itemsIn(index, everywhere, 17);
    const parent = before[0] as Extract<MapItem, { kind: 'cluster' }>;

    const origins = springOrigins(before, after, leaves, true);
    expect(origins.size).toBe(after.length);
    for (const origin of origins.values()) expect(origin).toMatchObject({ lng: parent.lng, lat: parent.lat });
    expect([...origins.values()].map((o) => o.order).sort()).toEqual([...after.keys()]);
  });

  it('pops a merged group in where it stands when zooming out', () => {
    const index = createPeopleIndex(pins);
    const leaves = (id: number, limit: number) =>
      index.getLeaves(id, limit).map((leaf) => leaf.properties.pin.id);
    const before = itemsIn(index, everywhere, 17);
    const after = itemsIn(index, everywhere, 10);
    const [group] = after;

    const origins = springOrigins(before, after, leaves, false);
    expect(origins.get(group?.key ?? '')).toEqual({ lng: group?.lng, lat: group?.lat, order: 0 });
  });

  it('leaves the first view and plain pans alone', () => {
    const index = createPeopleIndex(pins);
    const items = itemsIn(index, everywhere, 17);
    expect(springOrigins([], items, () => [], true).size).toBe(0);
    expect(springOrigins(items, items, () => [], true).size).toBe(0);
  });
});
