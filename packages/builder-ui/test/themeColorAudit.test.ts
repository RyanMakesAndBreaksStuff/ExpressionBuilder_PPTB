import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(process.cwd(), 'packages/builder-ui/src');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('theme color ownership', () => {
  it('keeps raw theme colors outside the centralized Graphite token source', () => {
    const offenders = sourceFiles(sourceRoot)
      .filter((path) => !path.endsWith('workbenchTokens.ts'))
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return (
          /#[\da-f]{3,8}\b|rgba?\(/i.test(source) ||
          /(?:color|background(?:-color)?|border(?:-color)?|box-shadow|outline|stroke|fill)\s*(?::|=)\s*["']?(?:white|black)\b/i.test(
            source,
          )
        );
      })
      .map((path) => path.slice(sourceRoot.length + 1));

    expect(offenders).toEqual([]);
  });
});
