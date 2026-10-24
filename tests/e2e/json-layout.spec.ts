import { expect, test, type Page } from 'playwright/test';

async function openJson(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('tablist', { name: 'Screen' }).getByRole('tab', { name: 'JSON reference', exact: true }).click();
}

// Baseline before this change: 200×82px.
test('payload cards are compact and keep readable text', async ({ page }) => {
  await openJson(page);
  const box = (await page.locator('.eb-payload-tab').first().boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(168);
  // Two lines (name, root); the status is announced, not shown.
  expect(box.height).toBeLessThanOrEqual(52);
  const sizes = await page.locator('.eb-payload-tab').first().evaluate((tab) =>
    ['.eb-payload-name', '.eb-payload-root']
      .map((selector) => Number.parseFloat(getComputedStyle(tab.querySelector(selector)!).fontSize)));
  for (const size of sizes) expect(size).toBeGreaterThanOrEqual(11);
});

test('payload values sit at the right edge of their row, as in the mock', async ({ page }) => {
  await openJson(page);
  await page.getByLabel('Sample JSON').fill('{"statusCode":200}');
  const row = page.getByRole('treeitem', { name: /^statusCode, / });
  await expect(row).toBeVisible();
  const preview = row.locator('.eb-tree-preview');
  expect(await preview.evaluate((element) => getComputedStyle(element).textAlign)).toBe('right');
  const rowBox = (await row.boundingBox())!;
  const previewBox = (await preview.boundingBox())!;
  expect(rowBox.x + rowBox.width - (previewBox.x + previewBox.width)).toBeLessThanOrEqual(12);
});

test('the Payload toggle moves values next to their key, and a reload keeps it and the screen', async ({ page }) => {
  await openJson(page);
  await page.getByLabel('Sample JSON').fill('{"statusCode":200}');
  const row = page.getByRole('treeitem', { name: /^statusCode, / });
  await expect(row).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Value alignment' }).getByRole('radio', { name: 'Left' }).click();

  const preview = row.locator('.eb-tree-preview');
  expect(await preview.evaluate((element) => getComputedStyle(element).textAlign)).toBe('left');
  const badgeBox = (await row.locator('.eb-field-type-badge').boundingBox())!;
  const previewBox = (await preview.boundingBox())!;
  expect(previewBox.x - (badgeBox.x + badgeBox.width)).toBeLessThanOrEqual(12);

  await page.reload();
  // The app also reopens on the last screen used.
  await expect(page.getByRole('tablist', { name: 'Screen' }).getByRole('tab', { name: 'JSON reference', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Sample JSON').fill('{"statusCode":200}');
  await expect(page.getByRole('radiogroup', { name: 'Value alignment' }).getByRole('radio', { name: 'Left' }))
    .toHaveAttribute('aria-checked', 'true');
});
