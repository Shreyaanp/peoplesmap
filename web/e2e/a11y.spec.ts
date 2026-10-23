import { expect, test } from '@playwright/test';
import { axeViolations, signIn } from './session';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sign-in has no WCAG A/AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in as a test person' }).click();
    await expect(page.getByRole('list', { name: 'Test people' })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test(`home has no WCAG A/AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await signIn(page);
    expect(await axeViolations(page)).toEqual([]);
  });
}
