import { expect, test, type Page } from 'playwright/test';

declare global {
  interface Window {
    __pptbCopiedText?: string;
    __fireHostTheme?: (theme: string) => void;
    toolboxAPI?: unknown;
  }
}

// PPTB owns the theme: install a toolboxAPI whose host theme can be fired from the test.
async function installToolbox(page: Page, onboardingSeen: boolean): Promise<void> {
  await page.addInitScript((seen) => {
    const handlers: Array<(details: unknown, payload: unknown) => void> = [];
    window.__fireHostTheme = (theme: string) => {
      handlers.forEach((handler) =>
        handler(undefined, { event: 'settings:updated', data: { theme } }),
      );
    };
    window.toolboxAPI = {
      utils: {
        copyToClipboard: async (text: string) => {
          window.__pptbCopiedText = text;
        },
        showNotification: async () => undefined,
        getCurrentTheme: async () => 'dark',
      },
      settings: {
        get: async (key: string) => (seen && key === 'eb.onboarding.seen.v1' ? '1' : undefined),
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
  }, onboardingSeen);
}

test('PPTB host wires toolboxAPI into the shared shell', async ({ page }) => {
  await installToolbox(page, false);
  await page.goto('http://127.0.0.1:5174/');

  await expect(page.getByRole('region', { name: 'Condition Builder' })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.__pptbCopiedText ?? '')).toContain('@');
});

test('PPTB host follows the host theme (no toggle)', async ({ page }) => {
  await installToolbox(page, true);
  await page.goto('http://127.0.0.1:5174/');
  const root = page.locator('.eb-root');

  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: /Switch to .* theme/ })).toHaveCount(0);

  await page.evaluate(() => window.__fireHostTheme?.('light'));
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /Switch to .* theme/ })).toHaveCount(0);
});
