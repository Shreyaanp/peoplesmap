import { expect, test } from '@playwright/test';
import { axeViolations, signIn } from './session';

test('a hashtag search filters the same map, lists people, and back clears it', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  const searchbox = page.getByRole('combobox', { name: 'Search people by interest' });

  await searchbox.fill('#badminton');
  await searchbox.press('Enter');

  await expect(page).toHaveURL(/[?&]q=%23badminton/);
  await expect(page.getByRole('heading', { name: '#badminton' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /people|person/ })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'People matching your search' }).getByRole('button').first(),
  ).toBeVisible();

  // The pins on the map are now only people into badminton, each leading with it.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const labels = [...document.querySelectorAll('button[aria-label^="Person into"]')].map(
            (b) => b.getAttribute('aria-label') ?? '',
          );
          return labels.length > 0 && labels.every((label) => label.startsWith('Person into badminton'));
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  expect(await axeViolations(page)).toEqual([]);

  // Back undoes the search, like Google Maps.
  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(page.getByRole('heading', { name: 'Around you' })).toBeVisible();
  await expect(searchbox).toHaveValue('');
});

test('a related tag runs as the next search', async ({ page }) => {
  await signIn(page);
  const searchbox = page.getByRole('combobox', { name: 'Search people by interest' });
  await searchbox.fill('#badminton');
  await searchbox.press('Enter');

  const next = page.getByRole('button', { name: /^#/ }).first();
  const tag = (await next.textContent()) ?? '';
  await next.click();

  await expect(page.getByRole('heading', { name: tag })).toBeVisible();
  await expect(searchbox).toHaveValue(tag);
});

test('typing a tag suggests it with a local count, and picking one searches it', async ({ page }) => {
  await signIn(page);
  const searchbox = page.getByRole('combobox', { name: 'Search people by interest' });
  await searchbox.fill('#badm');

  const option = page.getByRole('option', { name: /^#badminton/ });
  await expect(option).toContainText(/\d+ near /);
  expect(await axeViolations(page)).toEqual([]);

  await searchbox.press('ArrowDown');
  await searchbox.press('Enter');
  await expect(page).toHaveURL(/[?&]q=%23badminton/);
  await expect(page.getByRole('heading', { name: '#badminton' })).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
