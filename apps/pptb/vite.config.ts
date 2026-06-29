import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the internal workspace packages from their TypeScript source rather
// than their compiled dist. Vite bundles fresh .ts + tokens.css on every build,
// so source edits (incl. CSS) land in a single build — no dist-copy step or
// workspace build-order dependency. Everything is inlined into the published
// pre-built bundle, so the composite packages never need to be published.
const workspaceSrc = {
  '@ryanmakes/eb_engine': resolve(import.meta.dirname, '../../packages/engine/src/index.ts'),
  '@ryanmakes/eb_platformadapter': resolve(import.meta.dirname, '../../packages/platform/src/index.ts'),
  '@ryanmakes/eb_builder-ui': resolve(import.meta.dirname, '../../packages/builder-ui/src/index.ts'),
};

// Strips type="module" and crossorigin; moves scripts before </body>.
// Required: PPTB loads tools via iframe srcdoc — no ES module support.
//
// Gated to `apply: 'build'` so the rewrite never runs during `vite dev`/test,
// keeping the dev server (and Vitest's index transform) working unchanged.
function fixHtmlForPPTB(): Plugin {
  return {
    name: 'fix-html-for-pptb',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        const scriptTagRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
        const scripts: string[] = [];
        // Callback always returns '' so every match is removed from html.
        let cleaned = html.replace(scriptTagRegex, (match) => {
          scripts.push(match);
          return '';
        });
        const fixedScripts = scripts.map((script) =>
          script.replace(/\s*type="module"/g, '').replace(/\s*crossorigin/g, ''),
        );
        cleaned = cleaned.replace('</body>', `${fixedScripts.join('\n')}\n</body>`);
        return cleaned;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), fixHtmlForPPTB()],
  resolve: { alias: workspaceSrc },
  base: './',
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
