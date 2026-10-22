import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { amber, font, glow, themes } from './index';
import { crisp, cubicBezier, liquid, liquidEasing } from '../motion/tokens';

const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');
const motionCss = readFileSync(resolve(import.meta.dirname, 'motion.css'), 'utf8');

/** Value of `--name` within the given CSS text (first occurrence). */
function cssValue(text: string, name: string): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(text)?.[1]?.trim();
}

/** The CSS block for a theme: light = the :root block, dark = the [data-theme='dark'] block. */
function themeBlock(theme: 'light' | 'dark'): string {
  if (theme === 'light') return css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)'));
  return css.slice(css.indexOf(":root[data-theme='dark']"));
}

describe('tokens.css and index.ts stay in sync', () => {
  it('amber scale', () => {
    for (const [step, hex] of Object.entries(amber)) expect(cssValue(css, `amber-${step}`)).toBe(hex);
  });

  it('glow stops', () => {
    for (const [stop, value] of Object.entries(glow)) expect(cssValue(css, `glow-${stop}`)).toBe(value);
  });

  it.each(['light', 'dark'] as const)('%s theme colours', (theme) => {
    const block = themeBlock(theme);
    for (const [name, hex] of Object.entries(themes[theme]))
      expect(cssValue(block, `color-${name}`)).toBe(hex);
  });

  it('the dark media-query block matches the [data-theme=dark] block', () => {
    const media = css.slice(
      css.indexOf('@media (prefers-color-scheme: dark)'),
      css.indexOf(":root[data-theme='dark']"),
    );
    for (const [name, hex] of Object.entries(themes.dark)) expect(cssValue(media, `color-${name}`)).toBe(hex);
  });

  it('typeface: font token, @font-face file and index.html preload agree', () => {
    expect(cssValue(css, 'font-sans')?.replace(/\s+/g, ' ')).toBe(font.sans);
    const fontsCss = readFileSync(resolve(import.meta.dirname, 'fonts.css'), 'utf8');
    const html = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8');
    expect(fontsCss).toContain(`url('${font.file}')`);
    expect(html).toMatch(new RegExp(`rel="preload"\\s+href="${font.file}"`));
    expect(existsSync(resolve(import.meta.dirname, '../../public', font.file.slice(1)))).toBe(true);
  });

  it('never uses pure black or white', () => {
    expect(css).not.toMatch(/#(?:000|fff)(?:000|fff)?\b/i);
  });
});

describe('motion tokens', () => {
  it('CSS easings match TS easings', () => {
    expect(cssValue(motionCss, 'ease-liquid')).toBe(`cubic-bezier(${liquid.ease.join(', ')})`);
    expect(cssValue(motionCss, 'ease-crisp')).toBe(`cubic-bezier(${crisp.ease.join(', ')})`);
  });

  it('CSS durations match TS durations', () => {
    expect(cssValue(motionCss, 'duration-liquid')).toBe(`${liquid.duration.base * 1000}ms`);
    expect(cssValue(motionCss, 'duration-crisp')).toBe(`${crisp.duration.base * 1000}ms`);
  });

  it('liquid stays in 0.6–1.2s and crisp in 0.15–0.3s', () => {
    for (const d of Object.values(liquid.duration)) {
      expect(d).toBeGreaterThanOrEqual(0.6);
      expect(d).toBeLessThanOrEqual(1.2);
    }
    for (const d of Object.values(crisp.duration)) {
      expect(d).toBeGreaterThanOrEqual(0.15);
      expect(d).toBeLessThanOrEqual(0.3);
    }
  });

  it('liquid easing starts slow and ends at 1', () => {
    expect(liquidEasing(0)).toBeCloseTo(0);
    expect(liquidEasing(1)).toBeCloseTo(1);
    expect(liquidEasing(0.2)).toBeLessThan(0.2);
    expect(cubicBezier([0, 0, 1, 1], 0.5)).toBeCloseTo(0.5);
  });
});
