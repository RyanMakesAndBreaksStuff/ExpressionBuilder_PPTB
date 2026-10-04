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
  it('fills the available shell height while preserving hidden state', () => {
    const activePanel = rule('.eb-functions-panel:not([hidden])');
    expect(activePanel).toMatch(/display:\s*flex;/);
    expect(activePanel).toMatch(/flex:\s*1;/);
    expect(activePanel).toMatch(/min-height:\s*0;/);
    expect(activePanel).toMatch(/flex-direction:\s*column;/);
    expect(css).not.toMatch(/\.eb-functions-panel\s*\{[^}]*display:\s*flex;/);
  });

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

  it('keeps the function editor typography and spacing from the handoff', () => {
    expect(rule('.eb-fn-panel h2')).toMatch(/font-size:\s*26px;/);
    expect(rule('.eb-fn-panel h2')).toMatch(/font-weight:\s*600;/);
    expect(rule('.eb-fn-panel h2')).toMatch(/line-height:\s*1;/);
    expect(rule('.eb-fn-panel h2 span')).toMatch(/font-family:\s*var\(--eb-mono\);/);
    expect(rule('.eb-fn-panel h2 span')).toMatch(/font-size:\s*15px;/);
    expect(rule('.eb-fn-panel h2 span')).toMatch(/color:\s*var\(--accent\);/);
    expect(rule('.eb-fn-arg + .eb-fn-arg')).toMatch(/margin-top:\s*14px;/);
    const secondaryCopy = rule('.eb-fn-dock-side > button:last-child');
    expect(secondaryCopy).toMatch(/background:\s*transparent;/);
    expect(secondaryCopy).toMatch(/border:\s*0;/);
    expect(secondaryCopy).toMatch(/color:\s*var\(--text2\);/);
    expect(secondaryCopy).toMatch(/font-size:\s*12px;/);
  });

  it('styles status cards with token-based label and caption text', () => {
    expect(rule('.eb-fn-card strong')).toMatch(/font-size:\s*30px;/);
    expect(rule('.eb-fn-card strong')).toMatch(/font-weight:\s*600;/);
    expect(rule('.eb-fn-card strong')).toMatch(/display:\s*block;/);
    expect(rule('.eb-fn-card > span:first-child')).toMatch(/font-size:\s*13px;/);
    expect(rule('.eb-fn-card > span:first-child')).toMatch(/color:\s*var\(--text2\);/);
    expect(rule('.eb-fn-card > span:last-child')).toMatch(/font-size:\s*12px;/);
    expect(rule('.eb-fn-card > span:last-child')).toMatch(/color:\s*var\(--text3\);/);
    expect(rule('.eb-fn-card[data-tone] > span:last-child')).toMatch(/color:\s*var\(--text2\);/);
  });

  it('keeps argument and optional labels at the approved size', () => {
    expect(rule('.eb-fn-arg label')).toMatch(/font-size:\s*14px;/);
    expect(rule('.eb-fn-arg label > span')).toMatch(/font-size:\s*14px;/);
  });

  it('keeps the expression preview and format selector in the functions code theme', () => {
    const code = rule('.eb-fn-dock-code');
    expect(code).toMatch(/color:\s*var\(--text\);/);
    const preview = rule('.eb-fn-dock-code .eb-preview');
    expect(preview).toMatch(/background:\s*transparent;/);
    expect(preview).toMatch(/border:\s*0;/);
    expect(preview).toMatch(/box-shadow:\s*none;/);
    expect(preview).toMatch(/padding:\s*0;/);
    expect(preview).toMatch(/font-family:\s*var\(--eb-mono\);/);
    expect(preview).toMatch(/font-size:\s*16px;/);
    expect(rule('.eb-fn-dock .eb-choice-segmented')).toMatch(/background:\s*var\(--code-seg-track\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented')).toMatch(/padding:\s*2px;/);
    expect(rule('.eb-fn-dock .eb-choice-segmented')).toMatch(/margin-left:\s*auto;/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button')).toMatch(/font-size:\s*12px;/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button')).toMatch(/color:\s*var\(--code-text3\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button[aria-checked="true"]'))
      .toMatch(/background:\s*var\(--code-seg-selected\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button[aria-checked="true"]'))
      .toMatch(/font-weight:\s*600;/);
    expect(rule('.eb-fn-dock-header > span:first-child')).toMatch(/color:\s*var\(--code-text3\);/);
    expect(rule('.eb-fn-dock-header > span:first-child')).toMatch(/font-size:\s*12px;/);
  });

  it('binds the code well to its dark-surface foreground tokens in both palettes', () => {
    expect(rule('.eb-fn-search')).toMatch(/color:\s*var\(--text\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/color:\s*var\(--text\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--text:\s*var\(--code-text\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--text2:\s*var\(--code-text2\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--text3:\s*var\(--code-text3\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--accent:\s*var\(--code-accent\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--good:\s*var\(--code-good\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--warn:\s*var\(--code-warn\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--danger:\s*var\(--code-danger\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--code-fn:\s*var\(--code-accent\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--seg-track:\s*var\(--code-seg-track\);/);
    expect(rule('.eb-fn-dock-code')).toMatch(/--seg-selected:\s*var\(--code-seg-selected\);/);
    expect(rule('.eb-fn-dock-header > span:first-child')).toMatch(/color:\s*var\(--code-text3\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented')).toMatch(/background:\s*var\(--code-seg-track\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button')).toMatch(/color:\s*var\(--code-text3\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button[aria-checked="true"]'))
      .toMatch(/background:\s*var\(--code-seg-selected\);/);
    expect(rule('.eb-fn-dock .eb-choice-segmented button[aria-checked="true"]'))
      .toMatch(/color:\s*var\(--code-text\);/);
    expect(rule('.eb-fn-dock-code .eb-preview')).toMatch(/color:\s*var\(--code-text2\);/);
    expect(rule('.eb-fn-dock-code .str')).toMatch(/color:\s*var\(--code-good\);/);
    expect(rule('.eb-fn-dock-code .num')).toMatch(/color:\s*var\(--code-good\);/);
    expect(rule('.eb-fn-dock-code .sym')).toMatch(/color:\s*var\(--code-text\);/);
    expect(rule('.eb-fn-crumb[data-tone="fn"]')).toMatch(/color:\s*var\(--accent\);/);
    expect(rule('.eb-fn-crumb[data-tone="ref"]')).toMatch(/color:\s*var\(--warn\);/);
    expect(rule('.eb-fn-crumb[data-tone="value"]')).toMatch(/color:\s*var\(--good\);/);
    expect(rule('.eb-fn-crumb[data-tone="error"]')).toMatch(/color:\s*var\(--danger\);/);
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
    expect(rule('.eb-fn-nav')).toMatch(/overflow-y:\s*auto;/);
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
