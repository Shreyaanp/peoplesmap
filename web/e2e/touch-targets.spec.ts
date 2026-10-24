import { expect, test, type Page } from '@playwright/test';
import { settle, signIn } from './session';

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
            // A checkbox or radio inside a label is tapped through the whole label.
            const label = el instanceof HTMLInputElement ? el.closest('label') : null;
            // Map pins are zero-size anchors; their hit area is the largest box inside, centred on the point.
            const own = (label ?? el).getBoundingClientRect();
            const r =
              own.width === 0 && own.height === 0
                ? [...el.querySelectorAll('*')]
                    .map((child) => child.getBoundingClientRect())
                    .reduce((big, box) => (box.width * box.height > big.width * big.height ? box : big), own)
                : own;
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
  // Reveal conditional controls (the clear button, the suggestions) before measuring.
  await page.getByRole('combobox').fill('#badm');
  await expect(page.getByRole('option').first()).toBeVisible();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);
});

test('inbox: every interactive element is at least 44×44px', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: /^Messages/ }).click();
  await page.getByRole('tab', { name: /Glows/ }).click();
  await expect(page.getByRole('list', { name: 'Glows' })).toBeVisible();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);

  await page
    .getByRole('list', { name: 'Glows' })
    .getByRole('listitem')
    .first()
    .getByRole('button')
    .first()
    .click();
  await expect(page.getByRole('log')).toBeVisible();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);
});

test('safety: the More menu, the report dialog and the account panel', async ({ page }) => {
  await signIn(page);
  const id = await page.locator('[data-person-id]').first().getAttribute('data-person-id');
  await page.goto(`/?person=${id}`);
  await page.getByRole('button', { name: /^More options for / }).click();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);

  await page.getByRole('button', { name: /^Report / }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Your account/ }).click();
  await page.getByRole('button', { name: 'Blocked people' }).click();
  await settle(page);
  expect(await tooSmall(page)).toEqual([]);
});
