import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the internal workspace packages from their TypeScript source rather
// than their compiled dist. Vite then bundles fresh .ts + tokens.css on every
// build, so source edits (incl. CSS) land in a single build with no dist-copy
// step or workspace build-order dependency.
const workspaceSrc = {
  '@ryanmakes/eb_engine': resolve(import.meta.dirname, '../../packages/engine/src/index.ts'),
  '@ryanmakes/eb_platformadapter': resolve(import.meta.dirname, '../../packages/platform/src/index.ts'),
  '@ryanmakes/eb_builder-ui': resolve(import.meta.dirname, '../../packages/builder-ui/src/index.ts'),
};

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ExpressionBuilder_PPTB/' : '/',
  plugins: [react()],
  resolve: { alias: workspaceSrc },
});
