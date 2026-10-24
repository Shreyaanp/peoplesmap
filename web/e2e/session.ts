import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Signs in as a seeded person who already has a profile, and waits for the map shell. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in as a test person' }).click();
  await page.getByRole('list', { name: 'Test people' }).getByRole('button').first().click();
  await expect(page.getByRole('combobox')).toBeVisible();
}

/** Signs in as a brand-new person (the e2e build's stand-in Google button): onboarding comes first. */
export async function signInAsNewPerson(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Describe yourself' })).toBeVisible();
}

/**
 * Waits for running one-shot animations (a dropdown falling in, a sheet settling) to finish, so
 * measurements see the final layout and colours. Endless ones (breathing glows) are ignored.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/** Accessibility violations once the page has settled (mid-fade colours fail contrast). */
export async function axeViolations(page: Page) {
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations;
}
