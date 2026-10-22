import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';

// Fontshare specimen fonts are downloaded by `npm run fonts:specimen` (never committed; see .gitignore).
const specimenFonts = resolve(import.meta.dirname, 'specimen-fonts');

/** Storybook doubles as the motion lab: every component and hero animation in isolation. */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  staticDirs: existsSync(specimenFonts) ? [{ from: './specimen-fonts', to: '/specimen-fonts' }] : [],
  // The app's PWA service worker has no place in Storybook.
  viteFinal: (vite) => ({
    ...vite,
    plugins: (vite.plugins ?? []).flat().filter((p: PluginOption) => {
      const name = p && typeof p === 'object' && 'name' in p ? p.name : '';
      return !name.startsWith('vite-plugin-pwa');
    }),
  }),
};

export default config;
