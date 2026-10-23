import type { Problem } from './types';

/** Shared by every API hook: query keys, the error type and response unwrapping. */

export const queryKeys = {
  me: ['me'] as const,
  cityGlow: ['city-glow'] as const,
  discover: ['discover'] as const,
  person: (id: string) => ['person', id] as const,
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
