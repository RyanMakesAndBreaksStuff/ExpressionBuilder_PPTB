import { expect, test } from 'playwright/test';

// Baseline at 1440×900 before this change: dock 159px, panel 649px, card 319px.
test('Functions gives the dock at least 10% more height and takes it from the panel and cards', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('tablist', { name: 'Screen' }).getByRole('tab', { name: 'Functions', exact: true }).click();

  const height = async (selector: string) => (await page.locator(selector).first().boundingBox())!.height;
  expect(await height('.eb-fn-dock')).toBeGreaterThanOrEqual(174);
  expect(await height('.eb-fn-panel')).toBeLessThan(649);
  expect(await height('.eb-fn-card')).toBeLessThan(319);
});
