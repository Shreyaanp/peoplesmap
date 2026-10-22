import { expect, test } from '@playwright/test';

const MIN = 44; // px, Fitts's Law; matches --size-touch

test('every interactive element is at least 44×44px', async ({ page }) => {
  await page.goto('/');
  // Reveal conditional controls (the clear button) before measuring.
  await page.getByRole('searchbox').fill('#badminton');

  const tooSmall = await page
    .locator('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex="0"]')
    .evaluateAll(
      (els, min) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el: el.outerHTML.slice(0, 80), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter(({ w, h }) => w < min || h < min),
      MIN,
    );

  expect(tooSmall).toEqual([]);
});
