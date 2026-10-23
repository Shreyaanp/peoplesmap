import type * as mocks from './browser';

/** What `@mocks` resolves to in a production build: the same exports, doing nothing. */
export const startMockApi: typeof mocks.startMockApi = async () => {};
export const devLoginChoices: typeof mocks.devLoginChoices = () => [];
