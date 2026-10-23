import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import type { Problem } from '../api/types';
import { parseBbox } from './data/geo';
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
  }
  return world;
}

/** Test hook: rebuild the world with a given size. */
export function resetMockWorld(next?: MockWorld): void {
  world = next;
  signedInId = undefined;
  signedOut = false;
  connections.clear();
}

// The dev session lives in memory (and survives reloads through localStorage when it is available).
const sessionKey = 'peoplemap.mock.session';
let signedInId: string | undefined;
/** People the dev user connects to (in memory; a reload starts fresh). */
const connections = new Set<string>();
let signedOut = false;
try {
  const saved = globalThis.localStorage?.getItem(sessionKey);
  if (saved === 'out') signedOut = true;
  else if (saved) signedInId = saved;
} catch {
  // Storage blocked: the session just resets on reload.
}
function saveSession(value: string): void {
  try {
    globalThis.localStorage?.setItem(sessionKey, value);
  } catch {
    // Ignore.
  }
}

function currentUser() {
  if (signedOut) return undefined;
  const w = getWorld();
  return (signedInId && w.byId.get(signedInId)) || w.me;
}

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

const unauthorized = () => problem(401, 'unauthorized', 'Sign in to continue');

export const handlers: RequestHandler[] = [
  // ── auth ──
  http.post(`${base}/auth/google`, async () => {
    signedOut = false;
    signedInId = getWorld().me.id;
    saveSession(signedInId);
    return HttpResponse.json(toMe(getWorld().me));
  }),

  http.post(`${base}/auth/dev`, async ({ request }) => {
    const { personId } = (await request.json()) as { personId: string };
    const person = getWorld().byId.get(personId);
    if (!person) return problem(404, 'not-found', 'No such seeded person');
    signedOut = false;
    signedInId = person.id;
    saveSession(person.id);
    return HttpResponse.json(toMe(person));
  }),

  http.post(`${base}/auth/logout`, () => {
    signedOut = true;
    signedInId = undefined;
    saveSession('out');
    return new HttpResponse(null, { status: 204 });
  }),

  // ── me ──
  http.get(`${base}/me`, async () => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    return me ? HttpResponse.json(toMe(me)) : unauthorized();
  }),

  // ── tags ──
  http.get(`${base}/tags/suggest`, async ({ request }) => {
    const failure = await devSwitches();
    if (failure) return failure;
    const me = currentUser();
    if (!me) return unauthorized();
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
