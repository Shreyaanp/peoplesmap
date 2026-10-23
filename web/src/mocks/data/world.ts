import { cellToLatLng, latLngToCell } from 'h3-js';
import type { LatLng, LiveTag, TagLevel } from '../../api/types';
import { offsetMetres } from './geo';
import { localities, type Locality } from './hyderabad';
import { createRandom, uuidV7, type Random } from './random';
import { tagBySlug, vocabulary, type Category, type VocabularyTag } from './vocabulary';

export interface MockTag {
  slug: string;
  display: string;
  level: TagLevel;
}

export interface MockPerson {
  id: string;
  displayName: string;
  sentence: string;
  locality: Locality;
  mode: 'exact' | 'neighbourhood';
  /** The snapped public point. The "exact" point is never kept in the mock world at all. */
  point: LatLng;
  /** Ordered by rank: the first three show on pins. */
  tags: MockTag[];
  liveTag: LiveTag | null;
  activity: 'today' | 'this_week' | null;
  hiddenFromMap: boolean;
  /** H3 cells of the public point, for glow aggregation. */
  cells: { 6: string; 7: string; 8: string };
}

export interface MockWorld {
  people: MockPerson[];
  byId: Map<string, MockPerson>;
  /** The seeded person the dev login starts as. */
  me: MockPerson;
}

const firstNames = [
  'Aarav',
  'Aditi',
  'Akhil',
  'Ananya',
  'Arjun',
  'Bhavana',
  'Chaitanya',
  'Deepika',
  'Divya',
  'Farhan',
  'Gayatri',
  'Harsha',
  'Ishaan',
  'Jahnavi',
  'Karthik',
  'Kavya',
  'Lakshmi',
  'Manish',
  'Meera',
  'Mohammed',
  'Nandini',
  'Nikhil',
  'Pooja',
  'Pranav',
  'Rahul',
  'Ritika',
  'Rohan',
  'Sahithi',
  'Sameer',
  'Sana',
  'Sandeep',
  'Shreya',
  'Siddharth',
  'Sneha',
  'Srikanth',
  'Swathi',
  'Tanvi',
  'Tejas',
  'Uday',
  'Varun',
  'Vishnu',
  'Yamini',
  'Zoya',
  'Abhinav',
  'Ayesha',
  'Charan',
  'Harika',
  'Imran',
  'Keerthi',
  'Naveen',
];
const initials = 'ABCDGKMNPRSTVY';

/** Persona: the one or two kinds of interest a person mostly has. Keeps tag sets believable. */
const categories: readonly Category[] = [
  'sport',
  'outdoors',
  'music',
  'art',
  'tech',
  'food',
  'learning',
  'games',
  'wellness',
  'social',
];

const learningCues = ['learning', 'getting into', 'new to'];
const teachingCues = ['teaching', 'coaching', 'happy to teach'];

/** Builds the mock world. Same seed and count → the same people, every time. */
export function createWorld(count: number, seed = 42, now = Date.now()): MockWorld {
  const random = createRandom(seed);
  const baseTime = Date.UTC(2026, 0, 1);
  const people: MockPerson[] = [];
  for (let i = 0; i < count; i++) {
    people.push(createPerson(random, baseTime + i * 997, now));
  }

  // The dev user: a Gachibowli regular with a recognisable tag set.
  const me = people[0];
  const home = localities[0];
  if (!me || !home) throw new Error('The mock world needs at least one person and one locality');
  Object.assign(me, {
    displayName: 'Riya S.',
    locality: home,
    tags: [
      { slug: 'badminton', display: 'badminton', level: 'doing' },
      { slug: 'photography', display: 'photography', level: 'learning' },
      { slug: 'filter-coffee', display: 'filter-coffee', level: 'doing' },
      { slug: 'react', display: 'react', level: 'teaching' },
      { slug: 'trekking', display: 'trekking', level: 'doing' },
    ],
    sentence: 'I play badminton most evenings, I am learning photography and I can teach React.',
    hiddenFromMap: false,
  } satisfies Partial<MockPerson>);
  placePerson(me, home, random);

  return { people, byId: new Map(people.map((p) => [p.id, p])), me };
}

function createPerson(random: Random, timeMs: number, now: number): MockPerson {
  const id = uuidV7(random, timeMs);
  const locality = random.weighted(localities, (l) => l.weight);
  const persona = [random.pick(categories), random.pick(categories)];

  const tagCount = random.int(3, 9);
  const chosen = new Map<string, VocabularyTag>();
  while (chosen.size < tagCount) {
    // Mostly persona interests, sometimes anything at all.
    const pool = random.chance(0.75) ? vocabulary.filter((v) => persona.includes(v.category)) : vocabulary;
    const tag = random.weighted(pool, (v) => v.popularity);
    chosen.set(tag.slug, tag);
  }

  const tags: MockTag[] = [...chosen.values()].map((tag) => ({
    slug: tag.slug,
    display: random.chance(0.3) ? random.pick(tag.spellings) : tag.slug,
    level: random.weighted<TagLevel>(['doing', 'learning', 'teaching'], (l) =>
      l === 'doing' ? 6 : l === 'learning' ? 2.5 : 1.5,
    ),
  }));

  const person: MockPerson = {
    id,
    displayName: `${random.pick(firstNames)} ${random.pick([...initials])}.`,
    sentence: sentenceFor(tags, random),
    locality,
    mode: random.chance(0.7) ? 'neighbourhood' : 'exact',
    point: locality.center,
    tags,
    liveTag: random.chance(0.06) ? liveTagFor(tags, random, now) : null,
    activity: random.weighted(['today', 'this_week', null] as const, (a) =>
      a === 'today' ? 4 : a === 'this_week' ? 3.5 : 2.5,
    ),
    hiddenFromMap: random.chance(0.02),
    cells: { 6: '', 7: '', 8: '' },
  };
  placePerson(person, locality, random);
  return person;
}

/**
 * Places a person the way the server will: a private point near the locality, snapped to its H3 cell
 * (r8 ≈ 500m for neighbourhood, r10 ≈ 100m for exact) plus a small fixed jitter. Only the snapped point
 * is kept.
 */
function placePerson(person: MockPerson, locality: Locality, random: Random): void {
  const spreadM = locality.spreadKm * 1000;
  const raw = offsetMetres(locality.center, random.gaussian() * spreadM, random.gaussian() * spreadM);
  const resolution = person.mode === 'exact' ? 10 : 8;
  const [lat, lng] = cellToLatLng(latLngToCell(raw.lat, raw.lng, resolution));
  const jitterM = person.mode === 'exact' ? 25 : 150;
  person.locality = locality;
  person.point = offsetMetres(
    { lat, lng },
    (random.next() - 0.5) * 2 * jitterM,
    (random.next() - 0.5) * 2 * jitterM,
  );
  person.cells = {
    6: latLngToCell(person.point.lat, person.point.lng, 6),
    7: latLngToCell(person.point.lat, person.point.lng, 7),
    8: latLngToCell(person.point.lat, person.point.lng, 8),
  };
}

function sentenceFor(tags: MockTag[], random: Random): string {
  const words = (tag: MockTag) => tag.display.replaceAll('-', ' ');
  const doing = tags
    .filter((t) => t.level === 'doing')
    .slice(0, 3)
    .map(words);
  const learning = tags.find((t) => t.level === 'learning');
  const teaching = tags.find((t) => t.level === 'teaching');
  const parts = [doing.length > 0 ? `I am into ${doing.join(', ')}` : 'I like meeting people'];
  if (learning) parts.push(`${random.pick(learningCues)} ${words(learning)}`);
  if (teaching) parts.push(`${random.pick(teachingCues)} ${words(teaching)}`);
  return `${parts.join(', ')}.`;
}

function liveTagFor(tags: MockTag[], random: Random, now: number): LiveTag {
  const tag = random.pick(tags);
  const totalMs = random.pick([1, 3, 6, 24]) * 3_600_000;
  const elapsedMs = random.next() * totalMs * 0.9;
  return {
    id: uuidV7(random, now - elapsedMs),
    display: tagBySlug(tag.slug)?.slug ?? tag.slug,
    slug: tag.slug,
    startsAt: new Date(now - elapsedMs).toISOString(),
    expiresAt: new Date(now - elapsedMs + totalMs).toISOString(),
  };
}
