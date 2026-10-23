import { defineConfig, devices } from '@playwright/test';

/** E2E runs against a production build with the mock API (`--mode e2e`), on a phone and a desktop viewport. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Every test renders MapLibre on the CPU (no GPU in headless Chrome); more at once time out.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // The e2e build includes the mock API (see .env.e2e), in its own folder so dist stays production-only.
    command: 'npm run build:e2e && npm run preview -- --outDir dist-e2e',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
