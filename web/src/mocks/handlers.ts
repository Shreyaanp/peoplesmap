import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import type { LatLng, LocationMode, Problem, TagInput } from '../api/types';
import { parseBbox } from './data/geo';
import {
  addToWorld,
  createNewcomer,
  extractTags,
  newcomerToMe,
  placeNewcomer,
  toMockTags,
  type Newcomer,
} from './data/onboarding';
import {
  cityGlow,
  discover,
  glowTile,
  minPeopleZoom,
  peopleTile,
  profile,
  related,
  search,
  similar,
  suggestTags,
  toMe,
} from './data/queries';
import { resolveTag, tagBySlug } from './data/vocabulary';
import { createWorld, type MockWorld } from './data/world';

/**
 * Mock API handlers, shaped exactly like api/openapi.yaml.
 *
 * Dev switches in the page URL:
 * - `?people=50000` builds the stress world (default 2,000 people)
 * - `?latency=3g` (600ms), `?latency=slow` (1500ms) or `?latency=250` (ms) delays every response
 * - `?fail=0.1` fails 10% of requests with a 503 problem
 *
 * Sign-in: the Google button signs in "you", a newcomer who goes through onboarding (credential
 * `mock-new-person` starts a fresh one); the test-person picker signs in as any seeded person.
 */

const base = '*/api/v1';

function pageParams(): URLSearchParams {
  return new URLSearchParams(globalThis.location?.search ?? '');
}

let world: MockWorld | undefined;
function getWorld(): MockWorld {
  if (!world) {
    const count = Number(pageParams().get('people')) || 2000;
    world = createWorld(Math.min(Math.max(count, 1), 100_000));
    if (newcomer) addToWorld(world, newcomer);
  }
  return world;
}

/** Test hook: rebuild the world with a given size. */
export function resetMockWorld(next?: MockWorld): void {
  world = next;
  signedInId = undefined;
  newcomer = undefined;
  connections.clear();
}

// Everyone starts signed out, like the real app. The dev session lives in memory and survives
// reloads through localStorage when it is available.
const sessionKey = 'peoplemap.mock.session';
const newcomerKey = 'peoplemap.mock.newcomer';
let signedInId: string | undefined;
let newcomer: Newcomer | undefined;
/** People the dev user connects to (in memory; a reload starts fresh). */
const connections = new Set<string>();
try {
  signedInId = globalThis.localStorage?.getItem(sessionKey) ?? undefined;
  const saved = globalThis.localStorage?.getItem(newcomerKey);
  newcomer = saved ? (JSON.parse(saved) as Newcomer) : undefined;
} catch {
  // Storage blocked: the session just resets on reload.
}
function saveSession(value: string | undefined): void {
  try {
    if (value) globalThis.localStorage?.setItem(sessionKey, value);
    else globalThis.localStorage?.removeItem(sessionKey);
  } catch {
    // Ignore.
  }
}

function saveNewcomer(next: Newcomer): void {
  newcomer = next;
  if (world) addToWorld(world, next);
  try {
    globalThis.localStorage?.setItem(newcomerKey, JSON.stringify(next));
  } catch {
    // Ignore.
  }
}

/** The signed-in person on the map. A newcomer still onboarding is not one yet. */
function currentUser() {
  return signedInId ? getWorld().byId.get(signedInId) : undefined;
}

/** The newcomer, when they are the one signed in (onboarding or not). */
function signedInNewcomer(): Newcomer | undefined {
  return newcomer && signedInId === newcomer.id ? newcomer : undefined;
}

function isLatLng(value: unknown): value is LatLng {
  const v = value as Partial<LatLng> | null;
  return typeof v?.lat === 'number' && typeof v.lng === 'number';
}

/** Seeded people's profiles are fixed in the mock. */
const readOnly = () => problem(400, 'bad-request', 'Mock: seeded people are read-only');

function problem(status: number, code: Problem['code'], title: string, detail?: string) {
  const body: Problem = {
    type: `/problems/${code}`,
    title,
    status,
    ...(code ? { code } : {}),
    ...(detail ? { detail } : {}),
  };
  return HttpResponse.json(body, { status, headers: { 'Content-Type': 'application/problem+json' } });
}

/** Applies the latency and failure switches. Returns a failure response when one is due. */
async function devSwitches() {
  const params = pageParams();
  const latency = params.get('latency');
  if (latency) {
    const ms = latency === '3g' ? 600 : latency === 'slow' ? 1500 : Number(latency) || 0;
    await delay(ms);
  }
  const fail = Number(params.get('fail'));
  if (fail > 0 && Math.random() < fail) {
    return problem(503, 'internal', 'Mock failure', 'Injected by ?fail=');
  }
  return undefined;
}

function tagsParam(url: URL): string[] {
  return (url.searchParams.get('tags') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function limitParam(url: URL): number {
  const limit = Number(url.searchParams.get('limit'));
  return limit >= 1 && limit <= 50 ? limit : 20;
}

function tileParams(params: Record<string, string | readonly string[] | undefined>) {
  const [z, x, y] = [params.z, params.x, params.y].map(Number);
  if (z === undefined || x === undefined || y === undefined || [z, x, y].some((n) => !Number.isInteger(n))) {
    return undefined;
  }
  return { z, x, y };
}

/** 401 when signed out; 403 profile-required while the signed-in newcomer is still onboarding. */
const unauthorized = () =>
  signedInNewcomer()?.status === 'onboarding'
    ? problem(403, 'profile-required', 'Finish your profile first')
    : problem(401, 'unauthorized', 'Sign in to continue');

export const handlers: RequestHandler[] = [
  // ── auth ──
  // Any credential is accepted: it signs in as "you", created on first sign-in in `onboarding`.
  http.post(`${base}/auth/google`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const { credential } = (await request.json()) as { credential: string };
    const you = newcomer && credential !== 'mock-new-person' ? newcomer : createNewcomer(crypto.randomUUID());
    saveNewcomer(you);
    signedInId = you.id;
    saveSession(you.id);
    return HttpResponse.json(newcomerToMe(you));
  }),

  http.post(`${base}/auth/dev`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const { personId } = (await request.json()) as { personId: string };
    const person = getWorld().byId.get(personId);
    if (!person) return problem(404, 'not-found', 'No such seeded person');
    signedInId = person.id;
    saveSession(person.id);
    return HttpResponse.json(toMe(person));
  }),

  http.post(`${base}/auth/logout`, () => {
    if (!signedInId) return unauthorized();
    signedInId = undefined;
    saveSession(undefined);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── me ──
  http.get(`${base}/me`, async () => {
    const failure = await devSwitches();
    if (failure) return failure;
    const you = signedInNewcomer();
    if (you) return HttpResponse.json(newcomerToMe(you));
    const me = currentUser();
    return me ? HttpResponse.json(toMe(me)) : unauthorized();
  }),

  // Onboarding: location first, then the profile that puts you on the map.
  // Only the newcomer can change these in the mock; seeded people are read-only.
  http.put(`${base}/me/location`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const you = signedInNewcomer();
    if (!you) return currentUser() ? readOnly() : unauthorized();
    const body = (await request.json()) as { point?: unknown; mode?: LocationMode };
    if (!isLatLng(body.point) || (body.mode !== 'exact' && body.mode !== 'neighbourhood')) {
      return problem(422, 'validation-failed', 'Point and mode are required');
    }
    const placed = placeNewcomer(you.id, body.point, body.mode);
    if (!placed) return problem(422, 'outside-launch-area', 'peoplemap is only in Hyderabad for now');
    saveNewcomer({
      ...you,
      location: { mode: placed.mode, point: placed.publicPoint, locality: placed.locality },
    });
    return HttpResponse.json(placed);
  }),

  http.put(`${base}/me/profile`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const you = signedInNewcomer();
    if (!you) return currentUser() ? readOnly() : unauthorized();
    if (!you.location) return problem(409, 'location-required', 'Set your location first');
    const body = (await request.json()) as { displayName?: string; sentence?: string; tags?: TagInput[] };
    const displayName = body.displayName?.trim() ?? '';
    const tags = toMockTags(body.tags ?? []);
    if (displayName === '' || displayName.length > 40 || tags.length === 0) {
      return problem(422, 'validation-failed', 'A name and at least one tag are needed');
    }
    const saved: Newcomer = { ...you, status: 'active', displayName, sentence: body.sentence ?? null, tags };
    saveNewcomer(saved);
    return HttpResponse.json(newcomerToMe(saved));
  }),

  // ── tags ── (open during onboarding too)
  http.post(`${base}/tags/extract`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!signedInId) return unauthorized();
    const { sentence } = (await request.json()) as { sentence?: string };
    if (typeof sentence !== 'string' || sentence.trim().length < 3 || sentence.length > 280) {
      return problem(422, 'validation-failed', 'Write between 3 and 280 characters');
    }
    return HttpResponse.json({ tags: extractTags(sentence) });
  }),

  http.get(`${base}/tags/suggest`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!signedInId) return unauthorized();
    // A newcomer has no location yet: suggestions count around the city's busiest area.
    const me = currentUser() ?? getWorld().me;
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const [lat, lng] = (url.searchParams.get('near') ?? '').split(',').map(Number);
    const near =
      lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)
        ? { lat, lng }
        : me.point;
    return HttpResponse.json({ suggestions: suggestTags(getWorld(), q, near, limitParam(url)) });
  }),

  http.get(`${base}/tags/:slug/related`, async ({ params }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!currentUser()) return unauthorized();
    const slug = String(params.slug);
    const tag = tagBySlug(slug) ?? resolveTag(slug);
    if (!tag) return problem(404, 'not-found', 'Unknown tag');
    return HttpResponse.json({ related: related(tag.slug) });
  }),

  // ── map ──
  http.get(`${base}/public/city-glow`, async () => {
    const failure = await devSwitches();
    if (failure) return failure;
    return HttpResponse.json(cityGlow(getWorld()), { headers: { 'Cache-Control': 'public, max-age=600' } });
  }),

  http.get(`${base}/glows/:z/:x/:y`, async ({ params, request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!currentUser()) return unauthorized();
    const tile = tileParams(params);
    if (!tile) return problem(400, 'bad-request', 'Bad tile');
    return HttpResponse.json(glowTile(getWorld(), tile.z, tile.x, tile.y, tagsParam(new URL(request.url))));
  }),

  http.get(`${base}/people/tiles/:z/:x/:y`, async ({ params, request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
    const tile = tileParams(params);
    if (!tile) return problem(400, 'bad-request', 'Bad tile');
    if (tile.z < minPeopleZoom) {
      return problem(400, 'bad-request', 'Zoom in further', `People tiles start at z${minPeopleZoom}.`);
    }
    return HttpResponse.json(
      peopleTile(getWorld(), me, tile.z, tile.x, tile.y, tagsParam(new URL(request.url))),
    );
  }),

  // ── discover & search ──
  http.get(`${base}/discover`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
    const url = new URL(request.url);
    return HttpResponse.json(
      discover(getWorld(), me, url.searchParams.get('cursor') ?? undefined, limitParam(url)),
    );
  }),

  http.get(`${base}/search`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    if (!q) return problem(400, 'bad-request', 'Empty search');
    const bboxParam = url.searchParams.get('bbox');
    const bbox = bboxParam ? parseBbox(bboxParam) : undefined;
    if (bboxParam && !bbox) return problem(400, 'bad-request', 'Bad bbox');
    return HttpResponse.json(
      search(getWorld(), me, q, bbox, url.searchParams.get('cursor') ?? undefined, limitParam(url)),
    );
  }),

  // ── people ──
  http.get(`${base}/people/:personId/similar`, async ({ params, request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
    const person = getWorld().byId.get(String(params.personId));
    if (!person) return problem(404, 'not-found', 'Person not found');
    const url = new URL(request.url);
    return HttpResponse.json(
      similar(getWorld(), person, me, url.searchParams.get('cursor') ?? undefined, limitParam(url)),
    );
  }),

  http.get(`${base}/people/:personId`, async ({ params }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
    const person = getWorld().byId.get(String(params.personId));
    if (!person || (person.hiddenFromMap && person !== me))
      return problem(404, 'not-found', 'Person not found');
    const card = profile(person, me);
    return HttpResponse.json({
      ...card,
      connection: { ...card.connection, iConnect: connections.has(person.id) },
    });
  }),

  // ── connections ──
  http.put(`${base}/connections/:personId`, async ({ params }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!currentUser()) return unauthorized();
    const id = String(params.personId);
    if (!getWorld().byId.has(id)) return problem(404, 'not-found', 'Person not found');
    connections.add(id);
    return HttpResponse.json({ iConnect: true, connectsToMe: false });
  }),

  http.delete(`${base}/connections/:personId`, async ({ params }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    if (!currentUser()) return unauthorized();
    connections.delete(String(params.personId));
    return HttpResponse.json({ iConnect: false, connectsToMe: false });
  }),
];

/** Seeded people for the dev login picker: a spread of localities. */
export function devLoginChoices(limit = 12) {
  const seen = new Set<string>();
  return getWorld()
    .people.filter((p) => {
      const area = p.locality.name;
      if (seen.has(area)) return false;
      seen.add(area);
      return true;
    })
    .slice(0, limit)
    .map((p) => ({ id: p.id, displayName: p.displayName, locality: p.locality.name }));
}
