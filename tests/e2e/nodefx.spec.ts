import { expect, test } from '@playwright/test';

/** Reference-style node interactions: hover tooltip, glow, max flash. */

const MAGE = '/mage/';

test.beforeEach(async ({ page }) => {
  await page.goto(MAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('points-remaining')).toBeVisible();
});

test('hovering a node shows a floating game tooltip, no selection rim needed', async ({
  page,
}) => {
  const node = page.getByRole('button', { name: /^Wand Specialization, rank/ });
  await node.hover();
  const tip = page.getByTestId('node-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Wand Specialization');
  await expect(tip).toContainText('Rank 0/2');
  await expect(tip).toContainText('Increases your damage with Wands');

  // Moving away hides the tooltip.
  await page.getByTestId('points-remaining').hover();
  await expect(tip).toBeHidden();
});

test('learnable node shows green rim, maxed node shows gold rim and flash on final point', async ({
  page,
}) => {
  const node = page.getByRole('button', { name: /^Wand Specialization, rank/ });

  // Available: green rim.
  await expect(node).toHaveCSS('box-shadow', /79, 191, 58/); // rgb(79,191,58) = #4fbf3a

  await node.click();
  await node.click();
  // Maxed: gold rim #ffd100 = rgb(255, 209, 0), and the flash class fires.
  await expect(node).toHaveClass(/flashing/);
  await expect(node).toHaveCSS('box-shadow', /255, 209, 0/);

  // Flash clears after the animation window; move away so the hover rim
  // (white, per reference behavior) doesn't mask the maxed gold rim.
  await expect(node).not.toHaveClass(/flashing/, { timeout: 3000 });
  await page.getByTestId('points-remaining').hover();
  await expect(node).toHaveCSS('box-shadow', /255, 209, 0/);
});
