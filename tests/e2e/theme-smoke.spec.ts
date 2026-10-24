import { expect, test, type Page } from 'playwright/test';

async function expectGraphiteTheme(page: Page, mode: 'light' | 'dark'): Promise<void> {
  const expected =
    mode === 'light'
      ? { accent: '#111111', surface: '#ffffff', ink: '#ffffff' }
      : { accent: '#f2f2f2', surface: '#0f0f0f', ink: '#0a0a0a' };
  const root = page.locator('.eb-root');

  await expect(root).toHaveAttribute('data-theme', mode);
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          accent: styles.getPropertyValue('--accent').trim(),
          surface: styles.getPropertyValue('--surface').trim(),
          ink: styles.getPropertyValue('--accent-ink').trim(),
        };
      }),
    )
    .toEqual(expected);
}

for (const initial of ['light', 'dark'] as const) {
  test(`web follows a ${initial} system preference until manually overridden`, async ({ page }) => {
    const other = initial === 'light' ? 'dark' : 'light';
    await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
    await page.emulateMedia({ colorScheme: initial });
    await page.goto('http://127.0.0.1:5173/');

    await expectGraphiteTheme(page, initial);
    await expect(page.getByRole('button', { name: `Switch to ${other} theme` })).toBeVisible();

    await page.emulateMedia({ colorScheme: other });
    await expectGraphiteTheme(page, other);
    await expect(page.getByRole('button', { name: `Switch to ${initial} theme` })).toBeVisible();
  });
}

test('web header switches theme across screens and persists the choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:5173/');
  const header = page.locator('.eb-pill-header');
  await header.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expectGraphiteTheme(page, 'dark');
  await expect(header.getByRole('button', { name: 'Export', exact: true })).toBeVisible();

  for (const name of ['JSON reference', 'Functions', 'Trigger / Filter']) {
    await page.getByRole('button', { name: /^Screen:/ }).click();
    await page.getByRole('menuitemradio', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: `Screen: ${name}` })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  }
  await expect.poll(() => page.evaluate(() => localStorage.getItem('eb.web.theme.override.v1')))
    .toBe('dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expectGraphiteTheme(page, 'dark');
  await page.reload();
  await expectGraphiteTheme(page, 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expectGraphiteTheme(page, 'light');
  const size = await page.evaluate(() => ({
    width: innerWidth, documentWidth: document.documentElement.scrollWidth,
  }));
  expect(size.documentWidth).toBeLessThanOrEqual(size.width);
});

test('web reports a refused theme write without claiming persistence', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'eb.web.theme.override.v1') {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    };
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:5173/');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.getByRole('alert')).toHaveText('Theme preference could not be saved.');
  await expectGraphiteTheme(page, 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('eb.web.theme.override.v1'))).toBeNull();
});
