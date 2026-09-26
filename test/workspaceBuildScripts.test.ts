import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type PackageManifest = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  displayName?: string;
  keywords?: string[];
  cspExceptions?: unknown;
  features?: { minAPI?: string };
};

function readManifest(relativePath: string): PackageManifest {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8')) as PackageManifest;
}

describe('workspace build scripts', () => {
  it('aliases builder-ui to its TypeScript source so app builds bundle fresh CSS in a single pass', () => {
    // Apps resolve the workspace packages from src (via Vite resolve.alias), so a
    // CSS/component edit in builder-ui is bundled without a prior builder-ui build.
    // This replaced the fragile "build builder-ui first to copy tokens.css into dist"
    // step, which lagged one build behind. Guard the alias, not the old prebuild.
    const webVite = readFileSync(resolve(process.cwd(), 'apps/web/vite.config.ts'), 'utf8');
    const pptbVite = readFileSync(resolve(process.cwd(), 'apps/pptb/vite.config.ts'), 'utf8');
    const aliasTarget = 'packages/builder-ui/src/index.ts';

    for (const config of [webVite, pptbVite]) {
      expect(config).toContain('@ryanmakes/eb_builder-ui');
      expect(config).toContain(aliasTarget);
    }
  });

  it('rebuilds the web host before serving preview output', () => {
    const rootManifest = readManifest('package.json');

    expect(rootManifest.scripts?.['preview:web']).toContain('npm run build:web');
  });

  it('uses the PPTB validator binary exposed by @pptb/types', () => {
    const pptbManifest = readManifest('apps/pptb/package.json');

    expect(pptbManifest.scripts?.validate).toBe('pptb-validate');
  });

  it('keeps the PPTB HTML rewrite build-only so Vite dev remains testable', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'apps/pptb/vite.config.ts'), 'utf8');

    expect(viteConfig).toContain("apply: 'build'");
  });

  it('references tsconfig files explicitly so Playwright can load the e2e specs', () => {
    for (const config of ['tsconfig.json', 'packages/builder-ui/tsconfig.json', 'apps/web/tsconfig.json', 'apps/pptb/tsconfig.json']) {
      const { references = [] } = JSON.parse(readFileSync(resolve(process.cwd(), config), 'utf8')) as {
        references?: Array<{ path: string }>;
      };
      for (const reference of references) {
        expect(reference.path, config).toMatch(/\/tsconfig\.json$/);
      }
    }
  });

  it('keeps the PPTB bundle one self-contained classic script for srcdoc loading (FR-074)', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'apps/pptb/vite.config.ts'), 'utf8');

    expect(viteConfig).toContain("format: 'iife'");
    expect(viteConfig).toContain('inlineDynamicImports: true');
  });

  it('keeps the PPTB manifest free of CSP exceptions, at minAPI 1.0.17 (FR-063, FR-075)', () => {
    const pptbManifest = readManifest('apps/pptb/package.json');

    expect(pptbManifest.cspExceptions).toBeUndefined();
    expect(pptbManifest.features?.minAPI).toBe('1.0.17');
  });

  it('adds no runtime dependency; the accessibility scanner is dev-only (CON-001)', () => {
    const rootManifest = readManifest('package.json');
    const builderUi = readManifest('packages/builder-ui/package.json');

    expect(Object.keys(rootManifest.dependencies ?? {})).toEqual(['@fluentui/react-components', 'react', 'react-dom']);
    expect(Object.keys(builderUi.dependencies ?? {}).sort()).toEqual([
      '@dnd-kit/collision',
      '@dnd-kit/dom',
      '@dnd-kit/react',
      '@fluentui/react-components',
      '@fluentui/react-icons',
      '@ryanmakes/eb_engine',
      '@ryanmakes/eb_platformadapter',
      'react',
      'react-dom',
    ]);
    expect(rootManifest.devDependencies).toHaveProperty('@axe-core/playwright');
  });

  it('commits the JSON reference e2e spec despite the tests/e2e ignore rule (D-2)', () => {
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8');

    expect(gitignore).toContain('!/tests/e2e/json-references.spec.ts');
  });

  it('keeps PPTB HTML free of remote font URLs so CSP font-src self is respected', () => {
    const html = readFileSync(resolve(process.cwd(), 'apps/pptb/index.html'), 'utf8');

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });
});
