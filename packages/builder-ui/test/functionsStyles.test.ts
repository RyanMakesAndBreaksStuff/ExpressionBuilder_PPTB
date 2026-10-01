import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(fileURLToPath(new URL('../src/', import.meta.url)), 'theme/functions.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (match === null) throw new Error(`Missing rule: ${selector}`);
  return match[1];
}

describe('Functions screen styles', () => {
  it('lays out nav plus the content grid (FR-8)', () => {
    expect(rule('.eb-fn-workspace')).toMatch(/gap:\s*14px;/);
    expect(rule('.eb-fn-nav')).toMatch(/width:\s*250px;/);
    expect(rule('.eb-fn-grid')).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*3fr\)\s*minmax\(0,\s*2fr\);/,
    );
    expect(rule('.eb-fn-grid')).toMatch(
      /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)\s*210px;/,
    );
    expect(rule('.eb-fn-grid')).toMatch(/gap:\s*12px;/);
    expect(rule('.eb-fn-panel')).toMatch(/grid-area:\s*1\s*\/\s*1\s*\/\s*3\s*\/\s*2;/);
    expect(rule('.eb-fn-dock')).toMatch(/grid-area:\s*3\s*\/\s*1\s*\/\s*4\s*\/\s*3;/);
    expect(rule('.eb-fn-dock-side')).toMatch(/width:\s*280px;/);
  });

  it('keeps every color on a token (AC-1.1)', () => {
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(css).not.toMatch(/rgba?\(/i);
    expect(rule('.eb-fn-dock-code')).toMatch(/background:\s*var\(--code\);/);
    expect(rule('.eb-fn-panel')).toMatch(/background:\s*var\(--panel-glass\);/);
  });

  it('colors argument values by kind (FR-14)', () => {
    expect(rule('.eb-fn-input[data-kind="reference"]')).toMatch(/color:\s*var\(--warn\);/);
    expect(rule('.eb-fn-input[data-kind="literal"]')).toMatch(/color:\s*var\(--good\);/);
    expect(rule('.eb-fn-input::placeholder')).toMatch(/color:\s*var\(--text3\);/);
  });

  it('stacks into one scrolling column at 900px and below (FR-26, AC-26.2)', () => {
    const stacked = /@media \(max-width: 900px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(stacked).toMatch(/\.eb-fn-workspace\s*\{[^}]*flex-direction:\s*column;[^}]*overflow-y:\s*auto;/);
    expect(stacked).toMatch(/\.eb-fn-workspace > \*\s*\{[^}]*flex:\s*0 0 auto;/);
    expect(stacked).toMatch(/\.eb-fn-nav\s*\{[^}]*width:\s*auto;[^}]*max-height:\s*40vh;/);
    expect(stacked).toMatch(/\.eb-fn-grid\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
    expect(stacked).toMatch(/\.eb-fn-dock\s*\{[^}]*flex-direction:\s*column;/);
    expect(stacked).toMatch(/\.eb-fn-dock-side\s*\{[^}]*width:\s*auto;/);
  });

  it('transitions in 120ms and stops under reduced motion (FR-24)', () => {
    expect(rule('.eb-fn-row'))
      .toMatch(/transition:\s*background-color 120ms ease, border-color 120ms ease;/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(reduced?.[1]).toMatch(/transition:\s*none;/);
  });
});