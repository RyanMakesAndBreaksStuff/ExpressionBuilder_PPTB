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

  it('keeps the type badge compact and softly squared', () => {
    const badge = declarations('.eb-field-type-badge');

    // Small enough that an average field name + type ("Amount · number")
    // doesn't ellipsize just to make room for the badge next to it.
    expect(badge).toMatch(/padding:\s*1px 4px\s*;/);
    expect(badge).toMatch(/border-radius:\s*4px\s*;/);
    expect(badge).toMatch(/font-size:\s*8px\s*;/);
    expect(badge).toMatch(/letter-spacing:\s*0\.01em\s*;/);
    expect(badge).toMatch(/white-space:\s*nowrap\s*;/);
  });

  it.each([
    ['choice', '--accent'],
    ['string', '--accent-2'],
    ['number', '--warn'],
    ['dateTime', '--danger'],
    ['boolean', '--info'],
  ])('uses the former %s glyph color for its badge', (type, token) => {
    expect(declarations(`.eb-field-type-badge.${type}`)).toContain(
      `background: var(${token});`,
    );
  });
});
