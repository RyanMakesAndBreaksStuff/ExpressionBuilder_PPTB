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
  it('builds builder-ui before bundling either app so the emitted CSS asset exists', () => {
    const webManifest = readManifest('apps/web/package.json');
    const pptbManifest = readManifest('apps/pptb/package.json');

    expect(webManifest.scripts?.build).toContain('npm run build -w @ryanmakes/eb_builder-ui');
    expect(pptbManifest.scripts?.build).toContain('npm run build -w @ryanmakes/eb_builder-ui');
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
