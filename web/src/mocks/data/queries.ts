import { cellToLatLng, cellToParent } from 'h3-js';
import type {
  GlowCell,
  GlowTile,
  LatLng,
  Me,
  ParsedQuery,
  PeopleTile,
  PersonCard,
  PersonCardPage,
  PersonPin,
  Profile,
  ProfileTag,
  RelatedTag,
  SearchResult,
  TagLevel,
  TagSuggestion,
} from '../../api/types';
import { contains, haversineKm, roundDistance, tileBounds, type Bounds } from './geo';
import { launchBounds, localities, nearestLocality } from './hyderabad';
import { relatedTags, resolveTag, vocabulary } from './vocabulary';
import type { MockPerson, MockWorld } from './world';

/**
 * The mock server's logic, written against the contract types. Simple stand-ins for the real
 * search engine and aggregation jobs, but with the same privacy rules.
 */

/** Below this, a glow cell merges into its parent (privacy). */
export const minGlowCount = 5;

/** Below this zoom the map shows glows only; people tiles are refused. */
export const minPeopleZoom = 13;

export function glowResolution(z: number): 6 | 7 | 8 {
  if (z <= 9) return 6;
  if (z <= 11) return 7;
  return 8;
}

/** True when either of the two has blocked the other. */
export function blockedBetween(world: MockWorld, a: string, b: string): boolean {
  return !!world.blocks.get(a)?.has(b) || !!world.blocks.get(b)?.has(a);
}

function visible(world: MockWorld, me: MockPerson | undefined): MockPerson[] {
  return world.people.filter(
    (p) => p === me || (!p.hiddenFromMap && !(me && blockedBetween(world, me.id, p.id))),
  );
}

function matcher(tags: readonly string[]) {
  const wanted = new Set(tags);
  const related = new Set(tags.flatMap((slug) => relatedTags(slug).map((t) => t.slug)));
  for (const slug of wanted) related.delete(slug);
  return {
    matched: (p: MockPerson) => wanted.size === 0 || p.tags.some((t) => wanted.has(t.slug)),
    relatedOnly: (p: MockPerson) =>
      wanted.size > 0 && !p.tags.some((t) => wanted.has(t.slug)) && p.tags.some((t) => related.has(t.slug)),
    matchedSlugs: (p: MockPerson) => p.tags.filter((t) => wanted.has(t.slug)).map((t) => t.slug),
  };
}

function aggregate(people: MockPerson[], resolution: 6 | 7 | 8, tags: readonly string[], bounds: Bounds) {
  const match = matcher(tags);
  const counts = new Map<string, { count: number; related: number }>();
  for (const person of people) {
    const isMatch = match.matched(person);
    const isRelated = !isMatch && match.relatedOnly(person);
    if (!isMatch && !isRelated) continue;
    const cell = person.cells[resolution];
    const entry = counts.get(cell) ?? { count: 0, related: 0 };
    if (isMatch) entry.count++;
    else entry.related++;
    counts.set(cell, entry);
  }

  // Small cells merge into their parent; parents still too small are dropped.
  const merged = new Map<string, { count: number; related: number }>();
  for (const [cell, entry] of counts) {
    const key = entry.count + entry.related >= minGlowCount ? cell : cellToParent(cell, resolution - 1);
    const target = merged.get(key) ?? { count: 0, related: 0 };
    target.count += entry.count;
    target.related += entry.related;
    merged.set(key, target);
  }

  const cells: GlowCell[] = [];
  for (const [cell, entry] of merged) {
    if (entry.count + entry.related < minGlowCount) continue;
    const [lat, lng] = cellToLatLng(cell);
    const center = { lat, lng };
    // A cell belongs to the tile that holds its centre, so neighbouring tiles never repeat it.
    if (!contains(bounds, center)) continue;
    cells.push({
      cell,
      center,
      count: entry.count,
      ...(tags.length > 0 ? { relatedCount: entry.related } : {}),
    });
  }
  return cells;
}

export function glowTile(
  world: MockWorld,
  z: number,
  x: number,
  y: number,
  tags: readonly string[],
): GlowTile {
  const resolution = glowResolution(z);
  const bounds = tileBounds(z, x, y);
  // Look a little past the tile edge: a cell centred inside may hold people just outside.
  const pad = 0.05;
  const near = visible(world, undefined).filter((p) =>
    contains(
      {
        west: bounds.west - pad,
        east: bounds.east + pad,
        south: bounds.south - pad,
        north: bounds.north + pad,
      },
      p.point,
    ),
  );
  return { resolution, cells: aggregate(near, resolution, tags, bounds) };
}

/** The sign-in screen's glow: the whole metro at r6, no tags. */
export function cityGlow(world: MockWorld): GlowTile {
  return { resolution: 6, cells: aggregate(visible(world, undefined), 6, [], launchBounds) };
}

function activeLiveTag(person: MockPerson, now: number) {
  return person.liveTag && Date.parse(person.liveTag.expiresAt) > now ? person.liveTag : null;
}

export function peopleTile(
  world: MockWorld,
  me: MockPerson,
  z: number,
  x: number,
  y: number,
  tags: readonly string[],
  now = Date.now(),
): PeopleTile {
  const bounds = tileBounds(z, x, y);
  const match = matcher(tags);
  const people: PersonPin[] = visible(world, me)
    .filter((p) => contains(bounds, p.point) && match.matched(p))
    .map((p) => ({
      id: p.id,
      point: p.point,
      topTags: p.tags.slice(0, 3).map(({ slug, display }) => ({ slug, display })),
      ...(tags.length > 0 ? { matched: match.matchedSlugs(p) } : {}),
      photo: null,
      liveTag: activeLiveTag(p, now),
    }));
  return { people };
}

function profileTags(person: MockPerson, me: MockPerson): ProfileTag[] {
  const mine = new Set(me.tags.map((t) => t.slug));
  return person.tags.map(({ slug, display, level }) => ({ slug, display, level, shared: mine.has(slug) }));
}

export function toCard(
  person: MockPerson,
  me: MockPerson,
  from: LatLng = me.point,
  now = Date.now(),
): PersonCard {
  return {
    id: person.id,
    displayName: person.displayName,
    photo: null,
    locality: person.locality.name,
    point: person.point,
    topTags: profileTags(person, me).slice(0, 3),
    liveTag: activeLiveTag(person, now),
    distance: roundDistance(haversineKm(from, person.point)),
    activity: person.activity,
  };
}

function page<T>(items: T[], cursor: string | undefined, limit: number) {
  const start = cursor ? Number(cursor) || 0 : 0;
  const end = start + limit;
  return { items: items.slice(start, end), nextCursor: end < items.length ? String(end) : null };
}

/** The default peek: nearby first, but never two neighbours in the list leading with the same tag. */
export function discover(
  world: MockWorld,
  me: MockPerson,
  cursor: string | undefined,
  limit: number,
): PersonCardPage {
  const pool = visible(world, me)
    .filter((p) => p !== me)
    .map((p) => ({ p, km: haversineKm(me.point, p.point) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 400)
    .map(({ p }) => p);

  const ordered: MockPerson[] = [];
  const recentLeads: string[] = [];
  while (pool.length > 0) {
    const index = Math.max(
      0,
      pool.findIndex((p) => !recentLeads.includes(p.tags[0]?.slug ?? '')),
    );
    const [next] = pool.splice(index, 1);
    if (!next) break;
    ordered.push(next);
    recentLeads.push(next.tags[0]?.slug ?? '');
    if (recentLeads.length > 3) recentLeads.shift();
  }
  return page(
    ordered.map((p) => toCard(p, me)),
    cursor,
    limit,
  );
}

const stopWords = new Set([
  'someone',
  'somebody',
  'people',
  'person',
  'to',
  'with',
  'for',
  'a',
  'an',
  'the',
  'and',
  'or',
  'near',
  'in',
  'at',
  'around',
  'who',
  'can',
  'me',
  'i',
  'want',
  'looking',
  'this',
  'next',
  'weekend',
  'today',
  'tonight',
  'tomorrow',
  'learn',
  'learning',
  'teach',
  'teaching',
  'play',
  'partner',
  'buddy',
  'friends',
  'go',
  'do',
  'some',
  'any',
  'like',
  'into',
  'of',
]);

/** A rough stand-in for the real query understanding (locality list, Duckling, embeddings). */
export function parseQuery(q: string, now = new Date()): ParsedQuery {
  const text = q.toLowerCase().trim();

  const area = localities.find((l) => text.includes(l.name.toLowerCase())) ?? null;
  const rest = area ? text.replace(area.name.toLowerCase(), ' ') : text;

  let level: TagLevel | null = null;
  if (/\b(teach me|learn|learning|beginner)\b/.test(rest)) level = 'teaching';
  else if (/\b(teach|coach|mentor)\b/.test(rest)) level = 'learning';

  const timeWindow = parseTimeWindow(rest, now);

  const tokens = rest
    .replace(/[^a-z0-9#\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w !== '' && !stopWords.has(w));
  const found = new Map<string, string>();
  for (let i = 0; i < tokens.length; i++) {
    const pair = tokens[i + 1] ? `${tokens[i]}-${tokens[i + 1]}` : undefined;
    const tag = (pair && resolveTag(pair)) || resolveTag(tokens[i] ?? '');
    if (tag) found.set(tag.slug, tag.slug);
  }
  if (found.size === 0) {
    // Typo-ish fallback: prefix match on any spelling.
    for (const token of tokens.filter((w) => w.replace('#', '').length >= 3)) {
      const word = token.replace('#', '');
      const tag = vocabulary.find((v) => v.spellings.some((s) => s.startsWith(word)));
      if (tag) found.set(tag.slug, tag.slug);
    }
  }

  const tags = [...found.keys()].map((slug) => ({ slug, display: slug }));
  const related = tags
    .flatMap((t) => relatedTags(t.slug, 4))
    .filter((r, i, all) => !found.has(r.slug) && all.findIndex((o) => o.slug === r.slug) === i)
    .slice(0, 6)
    .map((r) => ({ slug: r.slug, display: r.slug }));

  return {
    tags,
    related,
    level,
    area: area ? { name: area.name, center: area.center } : null,
    timeWindow,
  };
}

function parseTimeWindow(text: string, now: Date): NonNullable<ParsedQuery['timeWindow']> | null {
  const day = (offset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  if (text.includes('tonight')) return { from: now.toISOString(), to: day(1, 2), label: 'tonight' };
  if (text.includes('today')) return { from: now.toISOString(), to: day(1, 0), label: 'today' };
  if (text.includes('tomorrow')) return { from: day(1, 0), to: day(2, 0), label: 'tomorrow' };
  if (text.includes('weekend')) {
    const toSaturday = (6 - now.getDay() + 7) % 7;
    return { from: day(toSaturday, 0), to: day(toSaturday + 2, 0), label: 'this weekend' };
  }
  return null;
}

export function search(
  world: MockWorld,
  me: MockPerson,
  q: string,
  bbox: Bounds | undefined,
  cursor: string | undefined,
  limit: number,
  now = Date.now(),
): SearchResult {
  const query = parseQuery(q, new Date(now));
  const slugs = query.tags.map((t) => t.slug);
  const center = query.area?.center ?? me.point;
  const match = matcher(slugs);

  const scored =
    slugs.length === 0
      ? []
      : visible(world, me)
          .filter((p) => p !== me && match.matched(p) && (!bbox || contains(bbox, p.point)))
          .map((p) => {
            const km = haversineKm(center, p.point);
            const matchedTags = p.tags.filter((t) => slugs.includes(t.slug));
            const levelFit = query.level && matchedTags.some((t) => t.level === query.level) ? 3 : 0;
            const live = query.timeWindow && activeLiveTag(p, now) ? 4 : 0;
            const recent = p.activity === 'today' ? 1 : 0;
            return { p, km, score: matchedTags.length * 10 + levelFit + live + recent - km * 1.5 };
          })
          .sort((a, b) => b.score - a.score);

  const nearby = scored.filter((s) => s.km <= 5);
  let nearest: SearchResult['nearest'] = null;
  if (!bbox && nearby.length < 3 && scored.length > 0) {
    const closest = scored.reduce((best, s) => (s.km < best.km ? s : best));
    const locality = nearestLocality(closest.p.point);
    nearest = {
      center: locality.center,
      count: scored.filter((s) => s.p.locality === locality).length,
      locality: locality.name,
    };
  }

  return {
    query,
    ...page(
      scored.map((s) => toCard(s.p, me, center, now)),
      cursor,
      limit,
    ),
    nearest,
  };
}

export function profile(person: MockPerson, me: MockPerson, now = Date.now()): Profile {
  const live = activeLiveTag(person, now);
  return {
    id: person.id,
    displayName: person.displayName,
    photo: null,
    locality: person.locality.name,
    point: person.point,
    sentence: person.sentence,
    tags: profileTags(person, me),
    liveTags: live ? [live] : [],
    distance: roundDistance(haversineKm(me.point, person.point)),
    activity: person.activity,
    connection: { iConnect: false, connectsToMe: false },
    threadId: null,
  };
}

/** Similar people: the most shared canonical tags, then nearness. */
export function similar(
  world: MockWorld,
  person: MockPerson,
  me: MockPerson,
  cursor: string | undefined,
  limit: number,
): PersonCardPage {
  const theirs = new Set(person.tags.map((t) => t.slug));
  const ranked = visible(world, me)
    .filter((p) => p !== person && p !== me)
    .map((p) => ({
      p,
      shared: p.tags.filter((t) => theirs.has(t.slug)).length,
      km: haversineKm(person.point, p.point),
    }))
    .filter((s) => s.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.km - b.km);
  return page(
    ranked.map((s) => toCard(s.p, me)),
    cursor,
    limit,
  );
}

export function suggestTags(world: MockWorld, q: string, near: LatLng, limit: number): TagSuggestion[] {
  const word = q.replace(/^#/, '').trim().toLowerCase();
  const matches = vocabulary.filter((v) => v.spellings.some((s) => s.startsWith(word)));
  const around = visible(world, undefined).filter((p) => haversineKm(near, p.point) <= 3);
  const nearLabel = nearestLocality(near).name;
  return matches
    .map((tag) => ({
      slug: tag.slug,
      display: tag.spellings.find((s) => s.startsWith(word)) ?? tag.slug,
      countNearby: around.filter((p) => p.tags.some((t) => t.slug === tag.slug)).length,
      nearLabel,
    }))
    .sort((a, b) => b.countNearby - a.countNearby)
    .slice(0, limit);
}

export function related(slug: string): RelatedTag[] {
  return relatedTags(slug, 10).map((tag, i) => ({
    slug: tag.slug,
    display: tag.slug,
    strength: Math.round((0.9 - i * 0.06) * 100) / 100,
  }));
}

export function toMe(person: MockPerson): Me {
  return {
    id: person.id,
    status: 'active',
    email: 'dev@peoplemap.local',
    displayName: person.displayName,
    sentence: person.sentence,
    photo: null,
    tags: person.tags.map(({ slug, display, level }) => ({ slug, display, level })),
    liveTags: person.liveTag ? [person.liveTag] : [],
    location: { mode: person.mode, publicPoint: person.point, locality: person.locality.name },
    settings: { hiddenFromMap: person.hiddenFromMap, notifyChats: true, notifyGlows: true },
  };
}
