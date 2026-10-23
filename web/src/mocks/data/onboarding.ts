import { cellToLatLng, latLngToCell } from 'h3-js';
import type { ExtractedTag, LatLng, Me, MyLocation, TagInput, TagLevel } from '../../api/types';
import { contains, offsetMetres } from './geo';
import { launchBounds, nearestLocality } from './hyderabad';
import { createRandom } from './random';
import { resolveTag } from './vocabulary';
import type { MockPerson, MockTag, MockWorld } from './world';

/**
 * The mock's one real newcomer: the person who signs in with Google. They start in `onboarding`
 * (no tags, no location), and saving the profile turns them into an ordinary person on the map.
 * Stored as plain JSON so it survives reloads in the browser.
 */
export interface Newcomer {
  id: string;
  email: string;
  status: 'onboarding' | 'active';
  displayName: string | null;
  sentence: string | null;
  tags: MockTag[];
  location: { mode: 'exact' | 'neighbourhood'; point: LatLng; locality: string } | null;
}

export function createNewcomer(id: string): Newcomer {
  return {
    id,
    email: 'you@peoplemap.local',
    status: 'onboarding',
    displayName: null,
    sentence: null,
    tags: [],
    location: null,
  };
}

export function newcomerToMe(newcomer: Newcomer): Me {
  const { location } = newcomer;
  return {
    id: newcomer.id,
    status: newcomer.status,
    email: newcomer.email,
    displayName: newcomer.displayName,
    sentence: newcomer.sentence,
    photo: null,
    tags: newcomer.tags,
    liveTags: [],
    location: location
      ? { mode: location.mode, publicPoint: location.point, locality: location.locality }
      : null,
    settings: { hiddenFromMap: false, notifyChats: true, notifyGlows: true },
  };
}

const learningCues = ['learning', 'learn', 'new to', 'getting into', 'beginner', 'trying'];
const teachingCues = ['teach', 'teaching', 'coach', 'coaching', 'mentor', 'mentoring'];

/**
 * "Describe yourself" → tags, the way the server's extractor will behave (minus embeddings):
 * every one-, two- and three-word phrase is looked up in the vocabulary, longest first; an explicit
 * #hashtag that isn't known becomes a new tag. A learning or teaching cue earlier in the same clause
 * sets the level. `spans` point back at the words, so the client can lift them off the sentence.
 */
export function extractTags(sentence: string): ExtractedTag[] {
  const words = [...sentence.matchAll(/#?[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)].map((m) => ({
    text: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
  const found = new Map<string, ExtractedTag>();
  const taken = new Set<number>();

  for (let i = 0; i < words.length; i++) {
    if (taken.has(i)) continue;
    for (let length = 3; length >= 1; length--) {
      const group = words.slice(i, i + length);
      if (group.length < length || group.some((_, k) => taken.has(i + k))) continue;
      const first = group[0];
      const last = group[group.length - 1];
      if (!first || !last) continue;
      const phrase = group.map((w) => w.text.toLowerCase()).join(' ');
      const known = resolveTag(phrase) ?? (length === 1 ? resolveTag(singular(phrase)) : undefined);
      const hashtag = length === 1 && first.text.startsWith('#');
      if (!known && !hashtag) continue;

      const slug = known?.slug ?? slugify(first.text);
      if (slug.length < 2) continue;
      const span: [number, number] = [first.start, last.end];
      const existing = found.get(slug);
      if (existing) {
        existing.spans.push(span);
      } else {
        found.set(slug, {
          slug,
          display: hashtag ? slug : (known?.spellings.find((s) => s === slugify(phrase)) ?? slug),
          level: levelBefore(sentence, first.start),
          spans: [span],
          isNew: !known,
        });
      }
      group.forEach((_, k) => taken.add(i + k));
      break;
    }
  }
  return [...found.values()];
}

/** The nearest cue in the same clause (since the last comma, full stop or "and") decides the level. */
function levelBefore(sentence: string, index: number): TagLevel {
  const clause = (
    sentence
      .slice(0, index)
      .toLowerCase()
      .split(/[,.;!?]| and | but /)
      .pop() ?? ''
  ).trim();
  const lastCue = (cues: readonly string[]) => Math.max(...cues.map((cue) => clause.lastIndexOf(cue)));
  const learning = lastCue(learningCues);
  const teaching = lastCue(teachingCues);
  if (learning < 0 && teaching < 0) return 'doing';
  return teaching > learning ? 'teaching' : 'learning';
}

function singular(word: string): string {
  return word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word;
}

export function slugify(text: string): string {
  return text
    .replace(/^#/, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Snaps the private point the way the server will and keeps only the public one. */
export function placeNewcomer(
  id: string,
  point: LatLng,
  mode: 'exact' | 'neighbourhood',
): MyLocation | undefined {
  if (!contains(launchBounds, point)) return undefined;
  const [lat, lng] = cellToLatLng(latLngToCell(point.lat, point.lng, mode === 'exact' ? 10 : 8));
  // A fixed jitter per person: moving within the same cell never reveals more.
  const random = createRandom([...id].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) | 0, 7));
  const jitterM = mode === 'exact' ? 25 : 150;
  const publicPoint = offsetMetres(
    { lat, lng },
    (random.next() - 0.5) * 2 * jitterM,
    (random.next() - 0.5) * 2 * jitterM,
  );
  return { mode, publicPoint, locality: nearestLocality(point).name };
}

export function toMockTags(tags: readonly TagInput[]): MockTag[] {
  const seen = new Set<string>();
  return tags.flatMap(({ display, level }) => {
    const slug = resolveTag(display)?.slug ?? slugify(display);
    if (seen.has(slug)) return [];
    seen.add(slug);
    return [{ slug, display: display.replace(/^#/, '').trim(), level }];
  });
}

/** Puts a finished newcomer on the mock map, replacing an earlier copy of them. */
export function addToWorld(world: MockWorld, newcomer: Newcomer): void {
  const { location } = newcomer;
  if (newcomer.status !== 'active' || !location) return;
  const person: MockPerson = {
    id: newcomer.id,
    displayName: newcomer.displayName ?? 'You',
    sentence: newcomer.sentence ?? '',
    locality: nearestLocality(location.point),
    mode: location.mode,
    point: location.point,
    tags: newcomer.tags,
    liveTag: null,
    activity: 'today',
    hiddenFromMap: false,
    cells: {
      6: latLngToCell(location.point.lat, location.point.lng, 6),
      7: latLngToCell(location.point.lat, location.point.lng, 7),
      8: latLngToCell(location.point.lat, location.point.lng, 8),
    },
  };
  const index = world.people.findIndex((p) => p.id === person.id);
  if (index >= 0) world.people[index] = person;
  else world.people.push(person);
  world.byId.set(person.id, person);
}
