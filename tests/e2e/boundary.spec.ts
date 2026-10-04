import { expect, test } from 'playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = process.cwd();

test('platform and dependency boundaries stay isolated', () => {
  const files = collectFiles(root, ['.ts', '.tsx']);

  expect(findForbidden(files, 'window.toolboxAPI', ['packages/platform/src/pptbAdapter.ts', 'apps/pptb/src/main.tsx', 'tests/e2e'])).toEqual([]);
  expect(findForbidden(files, 'navigator.clipboard', ['packages/platform/src/webAdapter.ts', 'tests/e2e'])).toEqual([]);
  expect(findForbidden(files, 'localStorage', ['packages/platform/src/webAdapter.ts', 'packages/platform/test', 'tests/e2e'])).toEqual([]);
  const engineFiles = files.filter((file) => relative(root, file).replaceAll('\\', '/').startsWith('packages/engine/'));
  expect(findForbidden(engineFiles, "from 'react'", [])).toEqual([]);
  expect(findForbidden(engineFiles, 'from "react"', [])).toEqual([]);
  expect(findForbidden(files, "from '@fluentui/react'", [])).toEqual([]);
  expect(findForbidden(files, 'from "@fluentui/react"', [])).toEqual([]);
  expect(findForbidden(files, '@react-awesome-query-builder/fluent', [])).toEqual([]);
});

test('boundary scanning ignores documentation and preserves executable APIs', () => {
  const documentation = withoutComments('// navigator.clipboard\n/* localStorage */\nconst value = 1;');
  expect(documentation).not.toContain('navigator.clipboard');
  expect(documentation).not.toContain('localStorage');
  expect(withoutComments('const read = () => navigator./* purpose */clipboard.readText();'))
    .toContain('navigator.clipboard');
  expect(withoutComments("const value = localStorage.getItem('key'); // documentation"))
    .toContain('localStorage');
  expect(withoutComments("const pattern = /[/*]/;\nlocalStorage.getItem('key');"))
    .toContain('localStorage');
  expect(withoutComments("const url = 'https://example.test';")).toContain('https://example.test');
});

function collectFiles(directory: string, extensions: string[]): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (['node_modules', '.git', 'dist', 'dist-types', '.claude'].includes(entry)) {
      return [];
    }

    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return collectFiles(path, extensions);
    }

    if (!extensions.some((extension) => path.endsWith(extension))) {
      return [];
    }

    return path.endsWith('boundary.spec.ts') ? [] : [path];
  });
}

function findForbidden(files: string[], needle: string, allowedPrefixes: string[]): string[] {
  return files
    .filter((file) => withoutComments(readFileSync(file, 'utf8'), file).includes(needle))
    .map((file) => relative(root, file).replaceAll('\\', '/'))
    .filter((file) => !allowedPrefixes.some((prefix) => file.startsWith(prefix)));
}

function withoutComments(source: string, fileName = 'boundary.ts'): string {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest);
  return ts.createPrinter({ removeComments: true }).printFile(sourceFile);
}
