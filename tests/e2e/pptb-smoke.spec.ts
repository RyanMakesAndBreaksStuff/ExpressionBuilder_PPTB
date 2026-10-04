import { expect, test } from 'playwright/test';

declare global {
  interface Window {
    __pptbCopiedText?: string;
    toolboxAPI?: unknown;
  }
}

test('PPTB host wires toolboxAPI into the shared shell', async ({ page }) => {
  await page.addInitScript(() => {
    window.toolboxAPI = {
      utils: {
        copyToClipboard: async (text: string) => {
          window.__pptbCopiedText = text;
        },
        showNotification: async () => undefined,
        getCurrentTheme: async () => 'dark',
      },
      settings: {
        get: async () => undefined,
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

  await expect(page.getByRole('heading', { name: /condition builder/i })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('region', { name: 'Expression Preview' }).getByRole('button', { name: 'Copy', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__pptbCopiedText ?? '')).toContain('@');
});
