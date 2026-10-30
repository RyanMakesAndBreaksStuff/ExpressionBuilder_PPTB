import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  fileURLToPath(new URL('../src/theme/tokens.css', import.meta.url)),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');
const cssRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  ([, selectorList, ruleDeclarations]) => ({
    selectors: selectorList.split(',').map((selector) => selector.trim()),
    declarations: ruleDeclarations,
  }),
);

function declarations(selector: string): string {
  const rule = cssRules.find(({ selectors }) => selectors.includes(selector));
  if (!rule) throw new Error(`Missing CSS selector: ${selector}`);
  return rule.declarations;
}

describe('toolbox field row styles', () => {
  it('allocates the insertion action to the field text and type badge', () => {
    expect(declarations('.eb-field-insert-action')).toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\) auto\s*;/,
    );
  });

  it('uses the requested compact display-name size', () => {
    expect(declarations('.eb-field-row .eb-field-title')).toMatch(
      /font-size:\s*12\.5px\s*;/,
    );
  });

  it('keeps the type badge a compact, outlined pill', () => {
    const badge = declarations('.eb-field-type-badge');

    // Small enough that an average field name + type ("Amount · number")
    // doesn't ellipsize just to make room for the badge next to it.
    expect(badge).toMatch(/padding:\s*1px 6px\s*;/);
    expect(badge).toMatch(/border-radius:\s*999px\s*;/);
    expect(badge).toMatch(/border:\s*1px solid color-mix\(in srgb, var\(--badge\) 60%, transparent\)\s*;/);
    expect(badge).toMatch(/background:\s*color-mix\(in srgb, var\(--badge\) 18%, transparent\)\s*;/);
    expect(badge).toMatch(/color:\s*var\(--badge\)\s*;/);
    expect(badge).toMatch(/font-size:\s*8px\s*;/);
    expect(badge).toMatch(/white-space:\s*nowrap\s*;/);
  });

  it.each([
    ['choice', 'var(--accent-soft)', 'var(--accent)'],
    ['object', 'color-mix(in srgb, var(--accent-2) 14%, transparent)', 'var(--code-fn)'],
    ['array', 'color-mix(in srgb, var(--accent-2) 14%, transparent)', 'var(--code-fn)'],
    ['string', 'var(--good-soft)', 'var(--good)'],
    ['number', 'var(--warn-soft)', 'var(--warn)'],
    ['dateTime', 'var(--danger-soft)', 'var(--danger)'],
    ['boolean', 'var(--info-soft)', 'var(--info)'],
  ])('tints the %s badge from its own hue', (type, background, color) => {
    const rule = declarations(`.eb-field-type-badge.${type}`);
    expect(rule).toContain(`background: ${background};`);
    expect(rule).toContain(`color: ${color};`);
  });
});
