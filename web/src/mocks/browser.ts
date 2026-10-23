import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Starts the mock API in the browser. Development only; main.tsx imports this lazily. */
export async function startMockApi(): Promise<void> {
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
}
