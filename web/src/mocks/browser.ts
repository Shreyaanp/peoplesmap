import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export { devLoginChoices } from './handlers';

/**
 * The mock API's browser entry, imported as `@mocks`. Development and the e2e build resolve `@mocks`
 * here; a production build resolves it to `off.ts`, so none of the mock world ships (vite.config.ts).
 */
export async function startMockApi(): Promise<void> {
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
}
