import { expect, test } from '@playwright/test';

/** PRD §9.4: all nine classes must work as a full calculator. */

const CLASSES = [
  'warrior', 'paladin', 'hunter', 'rogue', 'priest',
  'shaman', 'mage', 'warlock', 'druid',
];

for (const classId of CLASSES) {
  test(`${classId}: allocate → undo → state consistent`, async ({ page }) => {
    await page.goto(`/${classId}/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const remaining = page.getByTestId('points-remaining');
    await expect(remaining).toHaveText(/^\s*51\s*\/\s*51\s*$/);

    // First available (non-disabled) row-0 talent button.
    const firstNode = page
      .getByRole('button', { name: /, rank 0 of \d, / })
      .and(page.locator(':not([disabled])'))
      .first();
    await firstNode.click();
    await expect(remaining).toHaveText(/^\s*50\s*\/\s*51\s*$/);

    await page.getByTestId('btn-undo').click();
    await expect(remaining).toHaveText(/^\s*51\s*\/\s*51\s*$/);
  });
}
