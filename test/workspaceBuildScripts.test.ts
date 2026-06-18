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
});
