import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const workspaceSrc = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Resolve the workspace packages from source, as the app Vite configs do. Their
  // compiled dist has no CSS (only `npm run build` copies it) and can lag the source,
  // so a fresh checkout that only ran `tsc -b` would fail to import the shell.
  resolve: {
    alias: {
      '@ryanmakes/eb_engine': workspaceSrc('./packages/engine/src/index.ts'),
      '@ryanmakes/eb_platformadapter': workspaceSrc('./packages/platform/src/index.ts'),
      '@ryanmakes/eb_builder-ui': workspaceSrc('./packages/builder-ui/src/index.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-types/**', 'tests/e2e/**', '.claude/worktrees/**'],
    setupFiles: [fileURLToPath(new URL('./packages/builder-ui/test/setup.ts', import.meta.url))],
    // Heavy jsdom integration tests (full-shell render + drag/drop + Fluent portals)
    // run close to the 5s default in isolation and accumulate cost across a file.
    testTimeout: 20000,
  },
});
