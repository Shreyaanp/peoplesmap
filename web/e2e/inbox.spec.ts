import { expect, test } from '@playwright/test';
import { axeViolations, signIn } from './session';

test('the inbox: Chats and Glows, a conversation, and back to the map', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);

  const button = page.getByRole('button', { name: /^Messages, \d+ unread$/ });
  await button.click();
  await expect(page).toHaveURL(/[?&]inbox=chats/);
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeFocused();
  await expect(page.getByRole('tab', { name: /Chats/ })).toHaveAttribute('aria-selected', 'true');
  expect(await axeViolations(page)).toEqual([]);

  // Open the first chat and write.
  await page.getByRole('list', { name: 'Chats' }).getByRole('button').first().click();
  await expect(page).toHaveURL(/[?&]thread=/);
  const log = page.getByRole('log');
  await expect(log.getByRole('listitem').first()).toBeVisible();
  await page.getByRole('textbox', { name: /^Message / }).fill('Court 3 at 7 again?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(log.getByRole('listitem').last()).toContainText('Court 3 at 7 again?');
  await expect(log.getByText('Sending…')).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);

  // Back returns to the list, back again to the map.
  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]thread=/);
  await expect(page.getByRole('list', { name: 'Chats' })).toBeVisible();
  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]inbox=/);
  await expect(button).toBeFocused();
});

test('a Glow can be ignored silently, undone, and accepted into Chats', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.getByRole('button', { name: /^Messages/ }).click();
  await page.getByRole('tab', { name: /Glows/ }).click();
  await expect(page).toHaveURL(/[?&]inbox=glows/);

  const glows = page.getByRole('list', { name: 'Glows' });
  const first = glows.getByRole('listitem').first();
  const name = (await first.getByRole('button').first().locator('[class*="name"]').textContent()) ?? '';
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: `Ignore ${name}` }).click();
  await expect(page.getByRole('status').filter({ hasText: `Ignored. ${name} won't be told.` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Ignore ${name}` })).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: `Accept ${name}` })).toBeVisible();

  await page.getByRole('button', { name: `Accept ${name}` }).click();
  await expect(page.getByRole('button', { name: `Accept ${name}` })).toHaveCount(0);
  await page.getByRole('tab', { name: /Chats/ }).click();
  await expect(page.getByRole('list', { name: 'Chats' }).getByText(name)).toBeVisible();
});

test("a profile's Chat starts a first message that becomes a conversation", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  // Open someone nearby from the discovery list (by link, so the sheet's peek height doesn't matter).
  const id = await page.locator('[data-person-id]').first().getAttribute('data-person-id');
  await page.goto(`/?person=${id}`);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page).toHaveURL(/[?&](with|thread)=/);

  const box = page.getByRole('textbox', { name: /^Message / });
  await box.fill('Hi! Saw you on the map');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/[?&]thread=/);
  await expect(page.getByRole('log').getByText('Hi! Saw you on the map')).toBeVisible();

  // Back returns to the profile it started from.
  await page.goBack();
  await expect(page).toHaveURL(/[?&]person=/);
  await expect(page).not.toHaveURL(/[?&](thread|with)=/);
});
