import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(fileURLToPath(new URL('../src/', import.meta.url)), 'theme/shell.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (match === null) throw new Error(`Missing rule: ${selector}`);
  return match[1];
}

describe('shell styles', () => {
  it('frames the app with the handoff padding, gap and glow (FR-1)', () => {
    const root = rule('.eb-root');
    expect(root).toMatch(/box-sizing:\s*border-box;/);
    expect(root).toMatch(/padding:\s*12px;/);
    expect(root).toMatch(/gap:\s*8px;/);
    expect(root).toMatch(/var\(--glow-1\)/);
    expect(root).toMatch(/var\(--glow-2\)/);
    expect(root).toMatch(/var\(--bg\)/);
  });

  it('shapes the 48px pill (FR-2)', () => {
    const header = rule('.eb-pill-header');
    expect(header).toMatch(/height:\s*48px;/);
    expect(header).toMatch(/padding:\s*0 18px;/);
    expect(header).toMatch(/border-radius:\s*24px;/);
    expect(header).toMatch(/gap:\s*12px;/);
    expect(header).toMatch(/background:\s*var\(--header-glass\);/);
    expect(rule('.eb-pill-title')).toMatch(/white-space:\s*nowrap;/);
    expect(rule('.eb-pill-title')).toMatch(/flex:\s*none;/);
  });

  it('shapes the mode chip (FR-3)', () => {
    const chipRule = rule('.eb-mode-chip');
    expect(chipRule).toMatch(/height:\s*30px;/);
    expect(chipRule).toMatch(/border-radius:\s*15px;/);
    expect(chipRule).toMatch(/background:\s*var\(--accent-soft\);/);
    expect(chipRule).toMatch(/color:\s*var\(--accent\);/);
  });

  it('rings every header control at 2px with a 2px offset (FR-6)', () => {
    const focus = rule('.eb-pill-header button:focus-visible');
    expect(focus).toMatch(/outline:\s*2px solid var\(--accent\);/);
    expect(focus).toMatch(/outline-offset:\s*2px;/);
  });

  it('keeps every color on a token (AC-1.1)', () => {
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(css).not.toMatch(/rgba?\(/i);
  });

  it('wraps instead of scrolling sideways at 900px and below (FR-26)', () => {
    const narrow = /@media \(max-width: 900px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(narrow).toMatch(/flex-wrap:\s*wrap;/);
    expect(narrow).toMatch(/height:\s*auto;/);
  });

  it('transitions in 120ms and stops under reduced motion (FR-24)', () => {
    expect(rule('.eb-mode-chip')).toMatch(/transition:\s*background-color 120ms ease;/);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(reduced?.[1]).toMatch(/transition:\s*none;/);
  });
});
