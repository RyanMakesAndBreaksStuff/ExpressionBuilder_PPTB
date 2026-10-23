import { expect, test } from 'playwright/test';

// Baseline at 1440×900 before this change: dock 158px, panel 568px, card 278px.
test('Functions gives the dock at least 10% more height and takes it from the panel and cards', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Functions', exact: true }).click();

  const height = async (selector: string) => (await page.locator(selector).first().boundingBox())!.height;
  expect(await height('.eb-fn-dock')).toBeGreaterThanOrEqual(174);
  expect(await height('.eb-fn-panel')).toBeLessThan(568);
  expect(await height('.eb-fn-card')).toBeLessThan(278);
});
