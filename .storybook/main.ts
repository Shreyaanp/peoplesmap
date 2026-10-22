import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';

/** Storybook doubles as the motion lab: every component and hero animation in isolation. */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
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
