import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-types/**', 'tests/e2e/**', '.claude/worktrees/**'],
    setupFiles: [fileURLToPath(new URL('./packages/builder-ui/test/setup.ts', import.meta.url))],
  },
});
