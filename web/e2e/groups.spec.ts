import { expect, test } from '@playwright/test';
import { signIn } from './session';

test('tapping a group glides in and its people spring out from it', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);

  // Count spring-outs as they start (the attribute is removed again when each one ends).
  await page.evaluate(() => {
    const w = window as unknown as { springOuts: number };
    w.springOuts = 0;
    document.addEventListener('animationstart', (event) => {
      if (event.animationName.includes('spring-out')) w.springOuts++;
    });
  });

  await expect(page.getByRole('button', { name: /people here/ }).first()).toBeAttached({ timeout: 20_000 });

  // The biggest group comfortably inside the map, and not under the search bar or the sheet (the
  // side panel on desktop): a tap there must reach the group itself.
  const target = await page.evaluate(() => {
    let best: { x: number; y: number; count: number } | undefined;
    for (const button of document.querySelectorAll('button[aria-label*="people here"]')) {
      const { x, y } = button.getBoundingClientRect();
      const count = Number.parseInt(button.getAttribute('aria-label') ?? '', 10);
      const inside =
        x > 60 &&
        x < innerWidth - 60 &&
        y > 220 &&
        y < innerHeight * 0.6 &&
        button.contains(document.elementFromPoint(x, y));
      if (inside && count >= 3 && count > (best?.count ?? 0)) best = { x, y, count };
    }
    return best;
  });
  expect(target, 'a group of 3+ people in view').toBeDefined();

  // The button is a zero-size anchor; its 44px hit area is centred on that point.
  await page.mouse.click(target?.x ?? 0, target?.y ?? 0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { springOuts: number }).springOuts), {
      timeout: 15_000,
    })
    .toBeGreaterThan(1);
});
