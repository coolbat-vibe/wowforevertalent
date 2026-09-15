import { expect, test, type Page } from '@playwright/test';

/**
 * Key browser flows from PRD §15.2 (desktop project).
 * All state assertions use auto-retrying locators.
 */

const MAGE = '/mage/';

function nodeButton(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`^${name}, rank`) });
}

function expectRemaining(page: Page, remaining: number, budget = 51) {
  return expect(page.getByTestId('points-remaining')).toHaveText(
    new RegExp(`^\\s*${remaining}\\s*\\/\\s*${budget}\\s*$`),
  );
}

async function shareUrlFrom(page: Page): Promise<string> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId('btn-share').click();
  const linkOutput = page.getByTestId('link-output');
  await page.waitForTimeout(300);
  if (await linkOutput.isVisible().catch(() => false)) {
    return linkOutput.inputValue();
  }
  return page.evaluate(() => navigator.clipboard.readText());
}

test.beforeEach(async ({ page }) => {
  await page.goto(MAGE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('points-remaining')).toBeVisible();
});

test('add point → undo → redo → refresh → state persists', async ({ page }) => {
  await expectRemaining(page, 51);

  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 50);

  await page.getByTestId('btn-undo').click();
  await expectRemaining(page, 51);

  await page.getByTestId('btn-redo').click();
  await expectRemaining(page, 50);

  await page.waitForTimeout(400); // draft save debounce
  await page.reload();
  await expect(page.getByTestId('points-remaining')).toBeVisible();
  await expectRemaining(page, 50);
  await expect(nodeButton(page, 'Wand Specialization')).toHaveAccessibleName(/rank 1 of 2/);
});

test('tree reset keeps other trees; undo restores precisely', async ({ page }) => {
  await nodeButton(page, 'Wand Specialization').click();
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);

  await page.getByTestId('btn-reset-tree').first().click();
  await expectRemaining(page, 51);

  await page.getByTestId('btn-undo').click();
  await expectRemaining(page, 49);
  await expect(nodeButton(page, 'Wand Specialization')).toHaveAccessibleName(/rank 2 of 2/);
});

test('save named build → modify draft → reopen named build → no cross-overwrite', async ({
  page,
  context,
}) => {
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 50);
  await page.getByTestId('save-build-name').fill('Raid Frost');
  await page.getByTestId('btn-save-build').click();
  await page.waitForTimeout(200);

  // Modify the draft afterwards.
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);
  await page.waitForTimeout(400);

  const builds = await page.evaluate(() => {
    const raw = localStorage.getItem('wftc:builds');
    return raw ? JSON.parse(raw) : [];
  });
  expect(builds).toHaveLength(1);
  const stored = builds[0];
  expect(stored.name).toBe('Raid Frost');
  const storedSpent = Object.values(stored.allocation as Record<string, number>).reduce(
    (a, b) => a + b,
    0,
  );
  expect(storedSpent).toBe(1); // named build keeps its original allocation

  // Open the named build from /my-builds/ in the same context.
  const page2 = await context.newPage();
  await page2.goto('/my-builds/');
  await expect(page2.getByText('Raid Frost')).toBeVisible();
  await page2.getByRole('button', { name: 'Open' }).first().click();
  await page2.waitForURL(/\/mage\/#b=/);
  await expect(page2.getByTestId('external-banner')).toBeVisible();
  await expectRemaining(page2, 50); // 1 point spent in the saved build
  await page2.close();
});

test('share link restores exactly in a fresh browser context', async ({ page, browser }) => {
  await nodeButton(page, 'Wand Specialization').click();
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);

  const shareUrl = await shareUrlFrom(page);
  expect(shareUrl).toContain('/mage/#b=');

  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  await page2.goto(shareUrl);
  await expect(page2.getByTestId('external-banner')).toBeVisible();
  await expectRemaining(page2, 49);
  await expect(nodeButton(page2, 'Wand Specialization')).toHaveAccessibleName(/rank 2 of 2/);
  await fresh.close();
});

test('external link does not overwrite the local draft until edit-copy', async ({ page }) => {
  // Local draft: 1 point.
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 50);
  await page.waitForTimeout(400);

  // Share a 2-point build URL, then reopen it in the same context.
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);
  await page.waitForTimeout(400);
  const shareUrl = await shareUrlFrom(page);

  const page2 = await page.context().newPage();
  await page2.goto(shareUrl);
  await expect(page2.getByTestId('external-banner')).toBeVisible();
  await expectRemaining(page2, 49); // external build: 2 spent

  await page2.getByTestId('btn-edit-copy').click();
  await expect(page2.getByTestId('external-banner')).toBeHidden();
  await expectRemaining(page2, 49);
  await page2.close();
});

test('tampered payload shows a recoverable error and never wipes the draft', async ({ page }) => {
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 50);
  await page.waitForTimeout(400);

  // Full navigation so the island re-initializes and parses the hash.
  await page.goto('/');
  await page.goto(`${MAGE}#b=AAAAAAAAAAAAAAAAAAAAAAA`);
  await expect(page.getByTestId('error-panel')).toBeVisible();

  // The pre-existing draft survives (reload without hash).
  await page.goto(MAGE);
  await expect(page.getByTestId('points-remaining')).toBeVisible();
  await expectRemaining(page, 50);
  await expect(nodeButton(page, 'Wand Specialization')).toHaveAccessibleName(/rank 1 of 2/);
});

test('storage failure: calculator keeps working and warns honestly', async ({ context }) => {
  const page = await context.newPage();
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      if (String(args[0]).startsWith('wftc:')) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.goto(MAGE);
  await page.evaluate(() => localStorage.clear());
  await expect(page.getByTestId('points-remaining')).toBeVisible();
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 50);
  await expect(page.getByTestId('storage-warning')).toBeVisible();
  await page.close();
});

test('level reduction that would exceed the budget is rejected with explanation', async ({
  page,
}) => {
  // Spend 2 points (requires at least level 11).
  await nodeButton(page, 'Wand Specialization').click();
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);

  // Set level to 10 (budget 1 < 2 spent) → rejected, level stays 60.
  const levelInput = page.getByTestId('level-input');
  await levelInput.fill('10');
  await levelInput.press('Tab'); // commit + blur
  await expect(levelInput).toHaveValue('60');
  await expectRemaining(page, 49);
});

test('compare two saved builds shows the diff list', async ({ page }) => {
  // Build A: 2 points in Wand Specialization.
  await nodeButton(page, 'Wand Specialization').click();
  await nodeButton(page, 'Wand Specialization').click();
  await expectRemaining(page, 49);
  await page.getByTestId('save-build-name').fill('Build A');
  await page.getByTestId('btn-save-build').click();
  await page.waitForTimeout(200);

  // Build B: reset, then 1 point in a different row-0 talent.
  await page.getByTestId('btn-reset-all').click();
  await expectRemaining(page, 51);
  await nodeButton(page, 'Arcane Focus').click();
  await expectRemaining(page, 50);
  await page.getByTestId('save-build-name').fill('Build B');
  await page.getByTestId('btn-save-build').click();
  await page.waitForTimeout(200);

  await page.goto('/compare/');
  // Option index 0 is the placeholder; builds sorted by updatedAt desc:
  // Build B (saved last) at index 1, Build A at index 2.
  await page.getByTestId('compare-select-a').selectOption({ index: 2 });
  await page.getByTestId('compare-select-b').selectOption({ index: 1 });
  await page.getByTestId('btn-compare').click();
  await expect(page.getByTestId('compare-result')).toBeVisible();
  await expect(page.getByTestId('compare-diff-list')).toContainText('Wand Specialization');
});
