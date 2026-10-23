import { describe, expect, it } from 'vitest';
import { extractTags, placeNewcomer } from './onboarding';

describe('extractTags', () => {
  it('finds known tags with their spans and levels', () => {
    const sentence = 'I play badminton most evenings, I am learning photography and I can teach React.';
    const tags = extractTags(sentence);
    expect(tags.map((t) => [t.slug, t.level])).toEqual([
      ['badminton', 'doing'],
      ['photography', 'learning'],
      ['react', 'teaching'],
    ]);
    const [start, end] = tags[1]?.spans[0] ?? [0, 0];
    expect(sentence.slice(start, end)).toBe('photography');
  });

  it('keeps the spelling people used and merges repeats', () => {
    const tags = extractTags('Photo walks on weekends, more photo walks soon');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toMatchObject({ slug: 'photography', display: 'photo', isNew: false });
    expect(tags[0]?.spans).toHaveLength(2);
  });

  it('prefers the longest phrase and accepts new hashtags', () => {
    const tags = extractTags('Big on board games and #origami');
    expect(tags.map((t) => [t.slug, t.isNew])).toEqual([
      ['board-games', false],
      ['origami', true],
    ]);
  });

  it('a cue only reaches its own clause', () => {
    const tags = extractTags('Learning guitar, running every morning');
    expect(tags.find((t) => t.slug === 'running')?.level).toBe('doing');
  });
});

describe('placeNewcomer', () => {
  it('snaps inside Hyderabad and refuses points outside', () => {
    const placed = placeNewcomer('id-1', { lat: 17.44, lng: 78.35 }, 'neighbourhood');
    expect(placed?.locality).toBe('Gachibowli');
    expect(placed?.publicPoint).not.toEqual({ lat: 17.44, lng: 78.35 });
    expect(placeNewcomer('id-1', { lat: 12.97, lng: 77.59 }, 'exact')).toBeUndefined();
  });
});
