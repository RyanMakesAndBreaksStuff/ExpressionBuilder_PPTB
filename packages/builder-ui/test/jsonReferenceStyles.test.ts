import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// CI runs no browser, so these pin the layout rules the e2e spec verifies.
const css = readFileSync(
  resolve(fileURLToPath(new URL('../src/', import.meta.url)), 'theme/tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

/** Every block for one exact media query, joined. */
function mediaBlocks(query: string): string {
  const blocks: string[] = [];
  for (let start = css.indexOf(`@media (${query})`); start !== -1; start = css.indexOf(`@media (${query})`, start + 1)) {
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}' && --depth === 0) {
        blocks.push(css.slice(open + 1, index));
        break;
      }
    }
  }
  if (blocks.length === 0) throw new Error(`Missing media query: ${query}`);
  return blocks.join('\n');
}

function rule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`).exec(source);
  if (!match) throw new Error(`Missing rule: ${selector}`);
  return match[1];
}

describe('JSON reference styles', () => {
  it('hides the inactive builder panel even where a display rule applies (FR-005)', () => {
    expect(rule(css, '.eb-builder-panel[hidden]')).toMatch(/display:\s*none;/);
  });

  it('scrolls the tree inside its card on wide screens and the workspace as one when stacked (FR-092)', () => {
    expect(rule(css, '.eb-payload-tree')).toMatch(/overflow:\s*auto;/);
    expect(rule(css, '.eb-json-workspace')).toMatch(/overflow-y:\s*auto;/);
    const stacked = mediaBlocks('max-width: 600px');
    expect(rule(stacked, '.eb-json-workspace')).toMatch(/flex-direction:\s*column;/);
    expect(rule(stacked, '.eb-payload-tree')).toMatch(/overflow-y:\s*hidden;/);
  });

  it('caps the JSON cards to the host frame so the view never opens needing the workspace to scroll (FR-092)', () => {
    // 80px = 48px pill header + 8px root gap + 2×12px root padding; vh fallback line first,
    // dvh override second (the .eb-root pattern).
    expect(rule(css, '.eb-json-source')).toMatch(
      /min-height:\s*min\(560px,\s*calc\(100dvh - 80px\)\);/,
    );
    expect(rule(css, '.eb-json-payload')).toMatch(
      /min-height:\s*min\(320px,\s*calc\(100dvh - 80px\)\);/,
    );
    expect(rule(css, '.eb-json-reference')).toMatch(/max-height:\s*calc\(100dvh - 80px\);/);
    expect(rule(css, '.eb-json-reference .eb-json-card-body')).toMatch(/overflow-y:\s*auto;/);
  });

  it('meets text contrast for function names and payload roots in light mode (FR-085)', () => {
    expect(rule(css, '.fn')).toMatch(/color:\s*var\(--code-fn\);/);
    expect(rule(css, '.eb-root[data-theme="light"]')).toMatch(
      /--code-fn:\s*color-mix\(in srgb, var\(--accent-2\) 85%, var\(--text\)\);/,
    );
    expect(rule(css, '.eb-root[data-theme="dark"]')).toMatch(/--code-fn:\s*var\(--accent-2\);/);
  });

  it('shows a disabled Copy at 50% opacity (FR-052)', () => {
    expect(rule(css, '.eb-json-copy-row .eb-action-btn:disabled')).toMatch(/opacity:\s*0\.5;/);
  });

  it('animates only through the shared duration token, which reduced motion shortens (FR-093)', () => {
    expect(rule(css, '.eb-tree-chevron')).toMatch(/transition:\s*transform var\(--duration-fast\) ease;/);
  });

  it('bounds each non-stacked Reference body and keeps the stacked body content-sized', () => {
    const wide = mediaBlocks('min-width: 601px');
    expect(rule(wide, '.eb-json-reference > .eb-json-card-body')).toMatch(/overflow-y:\s*auto;/);
    expect(rule(wide, '.eb-json-reference > .eb-json-card-body')).toMatch(/flex:\s*1 1 auto;/);
    const stacked = mediaBlocks('max-width: 600px');
    expect(rule(stacked, '.eb-json-reference > .eb-json-card-body')).toMatch(/overflow:\s*visible;/);
  });
});
