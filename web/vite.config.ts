import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { msw } from 'msw/vite';

export default defineConfig(({ mode }) => {
  // The e2e build (`--mode e2e`) carries the mock API; a real production build never does.
  const e2e = mode === 'e2e';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const mocks = mode === 'development' ? env.VITE_API_MOCKS !== 'off' : env.VITE_API_MOCKS === 'on';
  return {
    plugins: [
      react(),
      // Serves the mock API's service worker in development and emits it only into the e2e build.
      { ...msw({ mode: 'worker-only' }), apply: (_, env) => env.command === 'serve' || e2e },
      VitePWA({
        // One service worker per scope: in the e2e build the mock API's worker owns it.
        disable: e2e,
        registerType: 'autoUpdate',
        // Precache the self-hosted typeface too, so repeat visits never wait for it.
        workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
        manifest: {
          name: 'peoplemap',
          short_name: 'peoplemap',
          description: 'Find your people.',
          theme_color: '#2a2622',
          background_color: '#2a2622',
          display: 'standalone',
          start_url: '/',
          icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        },
      }),
    ],
    // A compile-time constant plus a stub for @mocks, so a production build drops the mock API entirely.
    define: { __API_MOCKS__: JSON.stringify(mocks) },
    resolve: {
      alias: {
        '@mocks': fileURLToPath(
          new URL(mocks ? './src/mocks/browser.ts' : './src/mocks/off.ts', import.meta.url),
        ),
      },
    },
    css: {
      modules: { localsConvention: 'camelCaseOnly' },
    },
    build: {
      rolldownOptions: {
        // Generated icons only define components, so importing the icon index never pulls in
        // icons nobody uses. Every other module keeps the default side-effect detection.
        treeshake: {
          moduleSideEffects: [{ test: /[\\/]ui[\\/]icons[\\/]generated[\\/]/, sideEffects: false }],
        },
      },
    },
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});
