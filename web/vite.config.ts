import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
