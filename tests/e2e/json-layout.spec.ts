import { expect, test, type Page } from 'playwright/test';

async function openJson(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name: 'JSON reference', exact: true }).click();
}

// Baseline before this change: 200×82px.
test('payload cards are compact and keep readable text', async ({ page }) => {
  await openJson(page);
  const box = (await page.locator('.eb-payload-tab').first().boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(168);
  expect(box.height).toBeLessThanOrEqual(64);
  const sizes = await page.locator('.eb-payload-tab').first().evaluate((tab) =>
    ['.eb-payload-name', '.eb-payload-root', '.eb-payload-state-text']
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
