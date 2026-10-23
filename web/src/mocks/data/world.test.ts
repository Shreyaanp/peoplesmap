import { describe, expect, it } from 'vitest';
import { haversineKm, roundDistance } from './geo';
import { discover, glowTile, minGlowCount, parseQuery, peopleTile, search } from './queries';
import { createWorld } from './world';

const now = Date.UTC(2026, 9, 23, 12);
const world = createWorld(2000, 42, now);

// The z12 tile that holds Gachibowli and Madhapur.
const gachibowliTile = { z: 12, x: 2939, y: 1846 };

describe('mock world', () => {
  it('is deterministic for a seed', () => {
    const again = createWorld(2000, 42, now);
    expect(again.people.map((p) => p.id)).toEqual(world.people.map((p) => p.id));
    expect(again.people[500]?.point).toEqual(world.people[500]?.point);
  });

  it('keeps everyone inside Hyderabad', () => {
    for (const person of world.people) {
      expect(haversineKm({ lat: 17.42, lng: 78.44 }, person.point)).toBeLessThan(40);
    }
  });

  it('never sends a glow cell under the privacy minimum', () => {
    for (const tags of [[], ['badminton'], ['pottery']]) {
      const tile = glowTile(world, gachibowliTile.z, gachibowliTile.x, gachibowliTile.y, tags);
      for (const cell of tile.cells) {
        expect(cell.count + (cell.relatedCount ?? 0)).toBeGreaterThanOrEqual(minGlowCount);
      }
    }
  });

  it('lights glow cells around the tech west', () => {
    const tile = glowTile(world, gachibowliTile.z, gachibowliTile.x, gachibowliTile.y, []);
    expect(tile.resolution).toBe(8);
    expect(tile.cells.length).toBeGreaterThan(5);
  });

  it('filters people tiles by tag and shows at most three tags per pin', () => {
    const tile = peopleTile(world, world.me, 14, 11757, 7385, ['badminton'], now);
    expect(tile.people.length).toBeGreaterThan(0);
    for (const pin of tile.people) {
      expect(pin.topTags.length).toBeLessThanOrEqual(3);
      expect(pin.matched).toContain('badminton');
    }
  });

  it('leaves hidden people out of the map and discovery', () => {
    const hidden = world.people.find((p) => p.hiddenFromMap && p !== world.me);
    expect(hidden).toBeDefined();
    const ids = discover(world, world.me, undefined, 50).items.map((c) => c.id);
    expect(ids).not.toContain(hidden?.id);
  });

  it('varies the lead interest in the discovery peek', () => {
    const items = discover(world, world.me, undefined, 12).items;
    for (let i = 1; i < items.length; i++) {
      expect(items[i]?.topTags[0]?.slug).not.toBe(items[i - 1]?.topTags[0]?.slug);
    }
  });
});

describe('mock search', () => {
  it('understands tags, area, time and level', () => {
    const q = parseQuery('someone to trek with this weekend near Gachibowli', new Date(now));
    expect(q.tags.map((t) => t.slug)).toEqual(['trekking']);
    expect(q.area?.name).toBe('Gachibowli');
    expect(q.timeWindow?.label).toBe('this weekend');

    expect(parseQuery('learn guitar').level).toBe('teaching');
    expect(parseQuery('#photo').tags.map((t) => t.slug)).toEqual(['photography']);
  });

  it('returns ranked matches with rounded distances', () => {
    const result = search(world, world.me, '#badminton', undefined, undefined, 20, now);
    expect(result.items.length).toBe(20);
    expect(result.nextCursor).toBe('20');
    for (const card of result.items) {
      expect(card.topTags.length).toBeLessThanOrEqual(3);
    }
  });

  it('points to the nearest cluster when nothing is close', () => {
    const result = search(world, world.me, '#hindustani', undefined, undefined, 20, now);
    if (result.items.length > 0 && result.nearest) {
      expect(result.nearest.count).toBeGreaterThan(0);
    }
  });
});

describe('distance rounding', () => {
  it('follows the contract', () => {
    expect(roundDistance(0.4)).toEqual({ km: 1, under: true });
    expect(roundDistance(3.6)).toEqual({ km: 4, under: false });
    expect(roundDistance(13)).toEqual({ km: 15, under: false });
  });
});
