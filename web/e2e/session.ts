import { expect, type Page } from '@playwright/test';

/** Signs in through the sign-in screen (the e2e build's stand-in Google button) and waits for the map shell. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('searchbox')).toBeVisible();
}
