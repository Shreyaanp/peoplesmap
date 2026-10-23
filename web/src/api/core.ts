/** Shared by every API hook: query keys, the error type and response unwrapping. */

export const queryKeys = {
  me: ['me'] as const,
  cityGlow: ['city-glow'] as const,
  discover: ['discover'] as const,
  person: (id: string) => ['person', id] as const,
};

/** A failed API call, with the HTTP status so callers can tell "signed out" from "unreachable". */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: { title: string }; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error) throw new ApiError(error.title, response.status);
  if (data === undefined) throw new ApiError('Empty response', response.status);
  return data;
}
