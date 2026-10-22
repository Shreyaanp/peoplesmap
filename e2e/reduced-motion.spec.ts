import { expect, test } from '@playwright/test';

test.describe('reduce-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('continuous animations stop and the motion scale is zero', async ({ page }) => {
    await page.goto('/');
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === 'running' &&
            (a.effect as KeyframeEffect | null)?.getTiming().iterations === Infinity,
        )
        .map((a) => (a as CSSAnimation).animationName ?? 'unknown'),
    );
    expect(running).toEqual([]);

    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim(),
    );
    expect(scale).toBe('0');
  });
});

test('with motion allowed, the glow breathes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('glow')).toHaveCSS('animation-name', /breathe/);
});
