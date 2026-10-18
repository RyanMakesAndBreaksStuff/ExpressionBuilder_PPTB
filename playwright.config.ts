import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // The Vite dev server slows past the 30s timeout with 8 browsers on one machine; 2 is stable.
  workers: process.env.CI ? undefined : 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
