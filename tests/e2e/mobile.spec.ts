import { expect, test } from '@playwright/test';

/** PRD §15.2 flow 5: mobile tree tabs, tap-to-view, explicit −/+. */

const MAGE = '/mage/';

test.beforeEach(async ({ page }) => {
  await page.goto(MAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('points-remaining')).toBeVisible();
});

test('mobile: tap only views; +/− buttons modify one rank at a time', async ({ page }) => {
  const node = page.getByRole('button', { name: /^Wand Specialization, rank/ });

  // Tap once: selects and shows details, does NOT add a point.
  await node.tap();
  const text = await page.getByTestId('points-remaining').innerText();
  expect(text).toContain('51');

  await expect(page.getByTestId('panel-detail')).toBeVisible();
  await expect(page.getByTestId('panel-detail')).toContainText('Wand Specialization');

  await page.getByTestId('btn-add-point').tap();
  await expect(node).toHaveAccessibleName(/rank 1 of 2/);

  await page.getByTestId('btn-add-point').tap();
  await expect(node).toHaveAccessibleName(/rank 2 of 2/);

  await page.getByTestId('btn-remove-point').tap();
  await expect(node).toHaveAccessibleName(/rank 1 of 2/);
});

test('mobile: switching tree tabs keeps points consistent', async ({ page }) => {
  const node = page.getByRole('button', { name: /^Wand Specialization, rank/ });
  await node.tap();
  await page.getByTestId('btn-add-point').tap();

  // Arcane tab shows 1 point; switch to Fire and back.
  const arcaneTab = page.getByTestId('tree-tab-mage:arcane');
  await expect(arcaneTab).toContainText('1');

  await page.getByTestId('tree-tab-mage:fire').tap();
  await expect(page.getByTestId('tree-tab-mage:fire')).toContainText('0');

  await page.getByTestId('tree-tab-mage:arcane').tap();
  await expect(node).toHaveAccessibleName(/rank 1 of 2/);

  const text = await page.getByTestId('points-remaining').innerText();
  expect(text).toContain('50');
});
