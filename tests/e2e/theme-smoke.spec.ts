import { expect, test, type Page } from 'playwright/test';

async function expectPorcelainTheme(page: Page, mode: 'light' | 'dark'): Promise<void> {
  const expected =
    mode === 'light'
      ? { accent: '#7458d8', surface: '#ffffff', ink: '#ffffff' }
      : { accent: '#9f8cff', surface: '#211b22', ink: '#161216' };
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

test('web host follows the host theme (no toggle)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:5173/');

  await expectPorcelainTheme(page, 'light');
  await expect(page.getByRole('button', { name: /Switch to .* theme/ })).toHaveCount(0);

  // Firing the host theme change flips the palette.
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectPorcelainTheme(page, 'dark');
});
