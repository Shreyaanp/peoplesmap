import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sign-in has no WCAG A/AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in as a test person' }).click();
    await expect(page.getByRole('list', { name: 'Test people' })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test(`home has no WCAG A/AA violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await signIn(page);
    expect(await violations(page)).toEqual([]);
  });
}
