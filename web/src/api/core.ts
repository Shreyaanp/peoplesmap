import type { Problem } from './types';

/** Shared by every API hook: query keys, the error type and response unwrapping. */

export const queryKeys = {
  me: ['me'] as const,
  cityGlow: ['city-glow'] as const,
  discover: ['discover'] as const,
  person: (id: string) => ['person', id] as const,
  search: (q: string) => ['search', q] as const,
  /** Everything under 'inbox' refreshes together when a message moves between folders. */
  inbox: ['inbox'] as const,
  inboxSummary: ['inbox', 'summary'] as const,
  threads: (folder: string) => ['inbox', 'threads', folder] as const,
  thread: (id: string) => ['inbox', 'thread', id] as const,
  messages: (threadId: string) => ['inbox', 'messages', threadId] as const,
};

/** A failed API call, with the HTTP status and problem code so callers can react to the cause. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: Problem['code'] | undefined;
  constructor(message: string, status: number, code?: Problem['code']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: { title: string; code?: Problem['code'] }; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error) throw new ApiError(error.title, response.status, error.code);
  if (data === undefined) throw new ApiError('Empty response', response.status);
  return data;
}

/** The problem code of a failed call, if the server sent one. */
export function problemCode(error: unknown): Problem['code'] | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

/** For calls answered with 204 No Content: resolves when they succeed, throws like `unwrap` when not. */
export async function noContent(
  promise: Promise<{ error?: { title: string; code?: Problem['code'] }; response: Response }>,
): Promise<void> {
  const { error, response } = await promise;
  if (error) throw new ApiError(error.title, response.status, error.code);
}
