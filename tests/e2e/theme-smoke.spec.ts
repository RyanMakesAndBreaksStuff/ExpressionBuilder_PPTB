import { expect, test, type Page } from 'playwright/test';

declare global {
  interface Window {
    toolboxAPI?: unknown;
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

test('web host renders and toggles the Graphite palette', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
    localStorage.setItem('eb.workbench.palette', 'graphiteLight');
  });
  await page.goto('http://127.0.0.1:5173/');

  await expectGraphiteTheme(page, 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expectGraphiteTheme(page, 'dark');
});

test('PPTB host renders and toggles the Graphite palette', async ({ page }) => {
  await page.addInitScript(() => {
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
        on: () => undefined,
        off: () => undefined,
        getHistory: async () => [],
      },
    };
  });
  await page.goto('http://127.0.0.1:5174/');

  await expectGraphiteTheme(page, 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expectGraphiteTheme(page, 'light');
});
