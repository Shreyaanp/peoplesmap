import { expect, test } from '@playwright/test';
import { axeViolations, signIn } from './session';

test('blocking from a profile closes it, offers Undo, and lists them under Blocked people', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signIn(page);
  const id = await page.locator('[data-person-id]').first().getAttribute('data-person-id');
  await page.goto(`/?person=${id}`);
  const name = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? '';
  const first = name.split(' ')[0] ?? name;

  await page.getByRole('button', { name: `More options for ${name}` }).click();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: `Block ${first}` }).click();
  await expect(page).not.toHaveURL(/[?&]person=/);
  const toast = page.getByRole('status').filter({ hasText: `Blocked ${first}. They won't be told.` });
  await expect(toast).toBeVisible();
  // Gone from the people around you.
  await expect(page.locator(`[data-person-id="${id}"]`)).toHaveCount(0);

  // Undo brings them back.
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator(`[data-person-id="${id}"]`).first()).toBeAttached();

  // Block again, then unblock from the account panel.
  await page.goto(`/?person=${id}`);
  await page.getByRole('button', { name: `More options for ${name}` }).click();
  await page.getByRole('button', { name: `Block ${first}` }).click();
  await expect(page).not.toHaveURL(/[?&]person=/);
  await page.getByRole('button', { name: /^Your account/ }).click();
  await page.getByRole('button', { name: 'Blocked people' }).click();
  const blocked = page.getByRole('list', { name: 'Blocked people' });
  await expect(blocked.getByText(name)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await blocked.getByRole('button', { name: `Unblock ${name}` }).click();
  await expect(page.getByText('No one. Blocking someone hides you from each other.')).toBeVisible();
});

test('reporting from a conversation asks why, blocks by default, and closes the conversation', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.getByRole('button', { name: /^Messages/ }).click();
  const chats = page.getByRole('list', { name: 'Chats' });
  const row = chats.getByRole('listitem').first();
  const name = (await row.getByRole('button').first().locator('[class*="name"]').textContent()) ?? '';
  const first = name.split(' ')[0] ?? name;
  await row.getByRole('button').first().click();
  await expect(page).toHaveURL(/[?&]thread=/);

  await page.getByRole('button', { name: `More options for ${name}` }).click();
  await page.getByRole('button', { name: `Report ${first}` }).click();
  const dialog = page.getByRole('dialog', { name: `Report ${first}` });
  await expect(dialog).toBeVisible();
  const send = dialog.getByRole('button', { name: 'Send report' });
  await expect(send).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: new RegExp(`Also block ${first}`) })).toBeChecked();
  expect(await axeViolations(page)).toEqual([]);

  await dialog.getByRole('radio', { name: 'Spam or selling something' }).check();
  await dialog.getByRole('textbox').fill('Keeps sending links');
  await send.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: `${first} is blocked` })).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]thread=/);
  await expect(chats.getByText(name)).toHaveCount(0);
});

test('Escape closes the report dialog without sending', async ({ page }) => {
  await signIn(page);
  const id = await page.locator('[data-person-id]').first().getAttribute('data-person-id');
  await page.goto(`/?person=${id}`);
  const name = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? '';
  const first = name.split(' ')[0] ?? name;
  const more = page.getByRole('button', { name: `More options for ${name}` });
  await more.click();
  await page.getByRole('button', { name: `Report ${first}` }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect(page).toHaveURL(/[?&]person=/);
});

test('hide me from the map: the switch saves and the aura shows it', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Your account' }).click();
  const hide = page.getByRole('switch', { name: /Hide me from the map/ });
  await expect(hide).not.toBeChecked();
  await hide.click();
  await expect(hide).toBeChecked();
  await expect(page.getByRole('button', { name: "Your account. You're hidden from the map" })).toBeAttached();

  // Saved: still on after a fresh read of /me.
  await page.reload();
  await page.getByRole('button', { name: /^Your account/ }).click();
  await expect(page.getByRole('switch', { name: /Hide me from the map/ })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Glows' })).toBeChecked();
});
