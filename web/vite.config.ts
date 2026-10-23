import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { msw } from 'msw/vite';

export default defineConfig({
  plugins: [
    react(),
    // Serves the mock API's service worker in development only; nothing ships in the build.
    { ...msw({ mode: 'worker-only' }), apply: 'serve' },
    VitePWA({
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
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
