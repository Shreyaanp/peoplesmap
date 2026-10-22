/**
 * TypeScript mirror of tokens.css. Use the raw values only where CSS variables cannot reach
 * (MapLibre style JSON, canvas/WebGL); everywhere else use `cssVar`.
 * tokens.test.ts fails if this file and tokens.css drift apart.
 */

export const amber = {
  50: '#fff6e6',
  100: '#ffe9c2',
  200: '#ffd88f',
  300: '#ffc15a',
  400: '#f8a73a',
  500: '#ec8b1e',
  600: '#cc6e12',
  700: '#a3530e',
  800: '#7a3d0c',
  900: '#522808',
} as const;

export const glow = {
  core: '#fff4dc',
  honey: '#ffc35c',
  burnt: '#d9700f',
  edge: 'rgb(217 112 15 / 0%)',
} as const;

export const themes = {
  light: {
    map: '#e9e5df',
    bg: '#efebe6',
    surface: '#f7f4f0',
    'surface-raised': '#fbf9f6',
    border: '#d8d1c8',
    ink: '#1f1b17',
    'ink-secondary': '#5a5249',
    'ink-muted': '#6f665c',
  },
  dark: {
    map: '#1c1916',
    bg: '#201c19',
    surface: '#2a2521',
    'surface-raised': '#332d28',
    border: '#463e37',
    ink: '#f3eee7',
    'ink-secondary': '#cbc1b5',
    'ink-muted': '#a59a8e',
  },
} as const;

export type ThemeName = keyof typeof themes;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;
export const size = { touch: 44, search: 56 } as const;
export const z = { map: 0, glows: 10, pins: 20, chrome: 30, sheet: 40, overlay: 50, toast: 60 } as const;

export const cssVar = {
  map: 'var(--color-map)',
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceRaised: 'var(--color-surface-raised)',
  glass: 'var(--color-glass)',
  border: 'var(--color-border)',
  ink: 'var(--color-ink)',
  inkSecondary: 'var(--color-ink-secondary)',
  inkMuted: 'var(--color-ink-muted)',
  accent: 'var(--color-accent)',
  accentInk: 'var(--color-accent-ink)',
  focus: 'var(--color-focus)',
  glowGradient: 'var(--glow-gradient)',
} as const;
