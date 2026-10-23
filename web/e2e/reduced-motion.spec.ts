import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

async function infiniteAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (a) =>
          a.playState === 'running' &&
          (a.effect as KeyframeEffect | null)?.getTiming().iterations === Infinity,
      )
      .map((a) => (a as CSSAnimation).animationName ?? 'unknown'),
  );
}

test.describe('reduce-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('sign-in: continuous animations stop and the motion scale is zero', async ({ page }) => {
    await page.goto('/');
    expect(await infiniteAnimations(page)).toEqual([]);
    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim(),
    );
    expect(scale).toBe('0');
  });

  test('home: continuous animations stop', async ({ page }) => {
    await signIn(page);
    expect(await infiniteAnimations(page)).toEqual([]);
  });
});

test('with motion allowed, the glow breathes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('glow')).toHaveCSS('animation-name', /breathe/);
});
