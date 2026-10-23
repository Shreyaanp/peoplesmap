/**
 * Build-time switches, read once. Everything else about the environment comes from the API.
 *
 * - The mock API answers /api/v1 in development (unless `VITE_API_MOCKS=off`) and in the e2e build
 *   (`VITE_API_MOCKS=on`). `__API_MOCKS__` is replaced at build time (vite.config.ts), so a
 *   production build never contains the mocks.
 * - Google sign-in needs `VITE_GOOGLE_CLIENT_ID` (web/.env.local). Without it, the mock API accepts
 *   a stand-in Google button so the flow still works locally.
 */
export const mocksEnabled: boolean = __API_MOCKS__;

export const googleClientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;
