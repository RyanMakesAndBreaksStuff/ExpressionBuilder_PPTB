import { expect, test, type Page } from 'playwright/test';

declare global {
  interface Window {
    toolboxAPI?: unknown;
    __fireHostTheme?: (theme: string) => void;
  }
}

async function expectGraphiteTheme(page: Page, mode: 'light' | 'dark'): Promise<void> {
  const expected =
    mode === 'light'
      ? { accent: '#155EEF', surface: '#FDFEFF', ink: '#F7FAFF' }
      : { accent: '#77A7FF', surface: '#1B2228', ink: '#0C1A34' };
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

test('web follows system preference until manually overridden', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:5173/');

  await expectGraphiteTheme(page, 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

  // Firing the host theme change flips the palette.
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectGraphiteTheme(page, 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('PPTB host follows the host theme (no toggle)', async ({ page }) => {
  await page.addInitScript(() => {
    const handlers: Array<(details: unknown, payload: unknown) => void> = [];
    window.__fireHostTheme = (theme: string) => {
      handlers.forEach((handler) =>
        handler(undefined, { event: 'settings:updated', data: { theme } }),
      );
    };
    window.toolboxAPI = {
      utils: {
        copyToClipboard: async () => undefined,
        showNotification: async () => undefined,
        getCurrentTheme: async () => 'dark',
      },
      settings: {
        get: async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : undefined),
        set: async () => undefined,
        setAll: async () => undefined,
        getAll: async () => ({}),
      },
      events: {
        on: (handler: (details: unknown, payload: unknown) => void) => {
          handlers.push(handler);
        },
        off: () => undefined,
        getHistory: async () => [],
      },
    };
  });
  await page.goto('http://127.0.0.1:5174/');

  // Initial render mirrors the host theme.
  await expectGraphiteTheme(page, 'dark');
  await expect(page.getByRole('button', { name: /Switch to .* theme/ })).toHaveCount(0);

  // Firing the host theme change flips the palette.
  await page.evaluate(() => window.__fireHostTheme?.('light'));
  await expectGraphiteTheme(page, 'light');
});

test('web header switches theme across screens and persists the choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://127.0.0.1:5173/');
  const header = page.locator('.eb-pill-header');
  await header.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expectGraphiteTheme(page, 'dark');
  await expect(header.getByRole('button', { name: 'Export', exact: true })).toBeVisible();

  for (const name of ['JSON reference', 'Functions']) {
    await page.getByRole('button', { name: /^Screen:/ }).click();
    await page.getByRole('menuitemradio', { name, exact: true }).click();
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
