import { expect, test } from 'playwright/test';

// Launch state must not already need a scrollbar in the short host frame:
// neither the workspace's own dead space (grid row floor) nor the center
// column (empty canvas + collapsed preview must fit the row).
test('launches without needing overflow scrollbars at 1280x420 (web)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
  });

  // Set the frame size BEFORE load so first paint computes short-host state.
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('.eb-workspace');

  const overflow = await page.evaluate(() => {
    const needsScroll = (el: Element) =>
      el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible';
    return {
      doc: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      workspace: needsScroll(document.querySelector('.eb-workspace')!),
      centerCol: needsScroll(document.querySelector('.eb-center-col')!),
      previewCollapsed: document
        .querySelector('.eb-preview-card')
        ?.classList.contains('eb-preview-collapsed'),
    };
  });
  expect(overflow.doc).toBe(false);
  expect(overflow.workspace).toBe(false);
  expect(overflow.centerCol).toBe(false);
  expect(overflow.previewCollapsed).toBe(true);
});

test('short viewport keeps rules visible at 1280x420', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
  });
  await page.goto('http://127.0.0.1:5173/');

  await page.getByRole('button', { name: 'Load sample fields' }).first().click();

  const addRule = page.getByRole('button', { name: 'Add rule to group root' });
  await addRule.click();
  await addRule.click();

  const ruleRows = page.locator('.eb-rule-row-editor');
  await expect(ruleRows).toHaveCount(2);

  await page.setViewportSize({ width: 1280, height: 420 });

  await expect(ruleRows.first()).toBeInViewport();

  const groupChildrenHeight = await page.locator('.eb-group-children').first().evaluate(
    (el) => (el as HTMLElement).clientHeight,
  );
  expect(groupChildrenHeight).toBeGreaterThanOrEqual(80);

  const canvasHeight = await page.locator('.eb-canvas-card').evaluate(
    (el) => (el as HTMLElement).clientHeight,
  );
  expect(canvasHeight).toBeGreaterThanOrEqual(220);

  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(overflow.sw).toBeLessThanOrEqual(overflow.cw);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(ruleRows.first()).toBeInViewport();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(ruleRows.first()).toBeInViewport();
  const overflow1440 = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(overflow1440.sw).toBeLessThanOrEqual(overflow1440.cw);

  const assertCanvasAboveToolbox = async () => {
    const order = await page.evaluate(() => {
      const canvas = document.querySelector('.eb-canvas-card');
      const toolbox = document.querySelector('.eb-dock-pane[data-side="left"]');
      if (!canvas || !toolbox) return null;
      return {
        canvasTop: canvas.getBoundingClientRect().top,
        toolboxTop: toolbox.getBoundingClientRect().top,
      };
    });
    expect(order).not.toBeNull();
    expect(order!.canvasTop).toBeLessThan(order!.toolboxTop);
  };

  await page.setViewportSize({ width: 900, height: 700 });
  await expect(ruleRows.first()).toBeInViewport();
  await assertCanvasAboveToolbox();

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(ruleRows.first()).toBeInViewport();
  await assertCanvasAboveToolbox();
});
