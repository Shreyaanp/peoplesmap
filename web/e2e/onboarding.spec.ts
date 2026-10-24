import { expect, test } from '@playwright/test';
import { axeViolations, signInAsNewPerson } from './session';

test('a new person describes themselves, edits their tags, picks an area and lands on the map', async ({
  page,
}) => {
  // The whole journey, with the map rendering on the CPU at the end: give it room.
  test.setTimeout(90_000);
  await signInAsNewPerson(page);
  expect(await axeViolations(page)).toEqual([]);

  await page
    .getByRole('textbox', { name: 'Describe yourself' })
    .fill('I play badminton most evenings and I am learning photography.');
  await page.getByRole('button', { name: 'Make my tags' }).click();

  // Tag Birth: the words become chips, with levels read from the sentence.
  const tags = page.getByRole('list', { name: 'Your tags' });
  await expect(tags.getByRole('button', { name: '#badminton, Doing. Change level' })).toBeVisible();
  await expect(tags.getByRole('button', { name: '#photography, Learning. Change level' })).toBeVisible();

  // Tap cycles the level; × removes; typed tags are added with Enter.
  await tags.getByRole('button', { name: '#badminton, Doing. Change level' }).click();
  await expect(tags.getByRole('button', { name: '#badminton, Teaching. Change level' })).toBeVisible();
  await tags.getByRole('button', { name: 'Remove #photography' }).click();
  const add = page.getByRole('combobox', { name: 'Add a tag' });
  await add.fill('#origami');
  await add.press('Enter');
  await expect(tags.getByRole('button', { name: '#origami, Doing. Change level' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Looks like me' }).click();
  await expect(page.getByRole('heading', { name: 'Put yourself on the map' })).toBeVisible();
  await page.getByLabel('Your name').fill('Test P.');
  await page.getByLabel('or pick a neighbourhood').selectOption('Kondapur');
  await expect(page.getByRole('status').filter({ hasText: 'around Kondapur' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Put me on the map' }).click();
  await expect(page.getByRole('combobox')).toBeVisible();
  await expect(page.getByText('Kondapur · people into different things')).toBeVisible();

  // The profile is saved: a reload stays on the map.
  await page.reload();
  await expect(page.getByRole('combobox')).toBeVisible();
});

test('onboarding: every interactive element is at least 44×44px', async ({ page }) => {
  await signInAsNewPerson(page);
  await page.getByRole('textbox', { name: 'Describe yourself' }).fill('Badminton and board games.');
  await page.getByRole('button', { name: 'Make my tags' }).click();
  await page.getByRole('combobox', { name: 'Add a tag' }).fill('bo');
  await expect(page.getByRole('listbox')).toBeVisible();
  const tooSmall = await page.locator('button, input, select, textarea, [role="option"]').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ el: el.outerHTML.slice(0, 80), ...el.getBoundingClientRect().toJSON() }))
      .filter(({ width, height }) => width < 44 || height < 44),
  );
  expect(tooSmall).toEqual([]);
});
