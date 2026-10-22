import type { CSSProperties } from 'react';

/** Typeface candidates → the CSS variable Storybook defines for each (see .storybook/specimen-fonts.css). */
export const typefaces = {
  'General Sans': '--font-candidate-general-sans',
  Satoshi: '--font-candidate-satoshi',
  'Plus Jakarta Sans': '--font-candidate-plus-jakarta-sans',
  Geist: '--font-candidate-geist',
} as const;

export type Typeface = keyof typeof typefaces;

export const fontStyle = (typeface: Typeface) =>
  ({ '--font-sans': `var(${typefaces[typeface]})` }) as CSSProperties;
