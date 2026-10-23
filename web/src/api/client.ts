import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';

/** Base path of the API. In development MSW answers it; later Vite proxies it to Spring Boot. */
export const apiBase = '/api/v1';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

/** Spring Security's cookie CSRF: echo the XSRF-TOKEN cookie as a header on unsafe methods. */
const csrf: Middleware = {
  onRequest({ request }) {
    if (!unsafeMethods.has(request.method)) return request;
    const token = readCookie('XSRF-TOKEN');
    if (token) request.headers.set('X-XSRF-TOKEN', token);
    return request;
  },
};

/** The typed client. Every path, parameter and body comes from api/openapi.yaml. */
export const api = createClient<paths>({ baseUrl: apiBase, credentials: 'include' });
api.use(csrf);
