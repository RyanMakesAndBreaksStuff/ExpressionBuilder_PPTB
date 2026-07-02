import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type PackageManifest = {
  scripts?: Record<string, string>;
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

  it('keeps PPTB HTML free of remote font URLs so CSP font-src self is respected', () => {
    const html = readFileSync(resolve(process.cwd(), 'apps/pptb/index.html'), 'utf8');

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });
});
