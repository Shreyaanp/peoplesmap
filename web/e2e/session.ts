import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Signs in as a seeded person who already has a profile, and waits for the map shell. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in as a test person' }).click();
  await page.getByRole('list', { name: 'Test people' }).getByRole('button').first().click();
  await expect(page.getByRole('searchbox')).toBeVisible();
}

/** Signs in as a brand-new person (the e2e build's stand-in Google button): onboarding comes first. */
export async function signInAsNewPerson(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Describe yourself' })).toBeVisible();
}

export async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations;
}
