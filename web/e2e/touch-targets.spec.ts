import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

const MIN = 44; // px, Fitts's Law; matches --size-touch

async function tooSmall(page: Page) {
  return page
    .locator('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex="0"]')
    .evaluateAll(
      (els, min) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          // The map's licence credit is inline text; WCAG 2.5.8 exempts inline links.
          .filter((el) => !el.closest('.maplibregl-ctrl-attrib-inner'))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el: el.outerHTML.slice(0, 80), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter(({ w, h }) => w < min || h < min),
      MIN,
    );
}

test('sign-in: every interactive element is at least 44×44px', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in as a test person' }).click();
  await expect(page.getByRole('list', { name: 'Test people' })).toBeVisible();
  expect(await tooSmall(page)).toEqual([]);
});

test('home: every interactive element is at least 44×44px', async ({ page }) => {
  await signIn(page);
  // Reveal conditional controls (the clear button) before measuring.
  await page.getByRole('searchbox').fill('#badminton');
  expect(await tooSmall(page)).toEqual([]);
});
