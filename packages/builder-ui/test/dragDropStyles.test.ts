import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const css = readFileSync(resolve(sourceRoot, 'theme/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
const cssRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  ([, selectorList, declarations]) => ({
    selectors: selectorList.split(',').map((selector) => selector.trim()),
    declarations,
  }),
);

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), 'utf8');
}

function declarationBlock(selectorFragment: string): string {
  const rule = cssRules.find(({ selectors }) =>
    selectors.includes(selectorFragment),
  );
  if (!rule) throw new Error(`Missing CSS selector: ${selectorFragment}`);
  return rule.declarations;
}

describe('drag-and-drop visual contract', () => {
  it('keeps drag activation on dedicated handles and exposes source state hooks', () => {
    const toolboxFieldRow = readSource('workbench/ToolboxFieldRow.tsx');
    const conditionDragHandle = readSource(
      'workbench/ConditionDragHandle.tsx',
    );
    const conditionGroupCard = readSource(
      'workbench/ConditionGroupCard.tsx',
    );
    const ruleRowEditor = readSource('workbench/RuleRowEditor.tsx');

    for (const source of [toolboxFieldRow, conditionDragHandle]) {
      expect(source).toMatch(/ref=\{handleRef\}/);
      expect(source).toMatch(/className="eb-drag-handle"/);
      expect(source).toMatch(/aria-label=/);
    }

    expect(toolboxFieldRow).toMatch(/ref=\{ref\}/);
    expect(toolboxFieldRow).toContain(
      "isDragging ? ' is-dragging' : ''",
    );
    expect(conditionDragHandle).toMatch(/sourceRef:\s*ref/);
    expect(conditionGroupCard).toContain(
      "isDragging ? 'is-dragging' : ''",
    );
    expect(ruleRowEditor).toContain(
      "isDragging ? ' is-dragging' : ''",
    );
  });

  it('styles handles for pointer, touch, and keyboard interaction', () => {
    const handle = declarationBlock('.eb-root .eb-drag-handle');
    const activeHandle = declarationBlock(
      '.eb-root .eb-drag-handle:active',
    );
    const focusVisible = declarationBlock(
      '.eb-root .eb-drag-handle:focus-visible',
    );

    expect(handle).toMatch(/\bcursor:\s*grab\s*;/);
    expect(handle).toMatch(/\btouch-action:\s*none\s*;/);
    expect(activeHandle).toMatch(/\bcursor:\s*grabbing\s*;/);
    expect(focusVisible).toMatch(
      /\bbox-shadow:\s*var\(--focus-ring\)\s*;/,
    );

    for (const sourceSelector of [
      '.eb-field-row',
      '.eb-rule-row-editor',
      '.eb-group-card',
    ]) {
      expect(declarationBlock(sourceSelector)).not.toMatch(
        /\btouch-action\s*:/,
      );
    }
  });

  it('keeps dragged sources visible and gives targets non-color state cues', () => {
    for (const sourceSelector of [
      '.eb-field-row.is-dragging',
      '.eb-rule-row-editor.is-dragging',
      '.eb-group-card.is-dragging',
    ]) {
      const sourceState = declarationBlock(sourceSelector);
      expect(sourceState).toMatch(
        /\bopacity:\s*(?:0?\.\d+|var\(--[\w-]+\))\s*;/,
      );
      expect(sourceState).not.toMatch(
        /\b(?:display:\s*none|visibility:\s*hidden|opacity:\s*0(?:\.0+)?)\s*;/,
      );
    }

    const positionTarget = readSource(
      'workbench/ConditionPositionTarget.tsx',
    );
    expect(positionTarget).toContain('role="separator"');
    expect(positionTarget).toContain(
      '<span aria-hidden="true">Drop here</span>',
    );

    const stateSelectors = [
      ['is-active', '.eb-condition-drop-target.is-active'],
      [
        'is-valid-drop',
        '.eb-condition-drop-target.is-active.is-valid-drop',
      ],
      [
        'is-invalid-drop',
        '.eb-condition-drop-target.is-active.is-invalid-drop',
      ],
      ['is-drop-target', '.eb-condition-drop-target.is-drop-target'],
      [
        'is-ineligible',
        '.eb-condition-drop-target.is-active.is-ineligible',
      ],
    ] as const;
    for (const [stateHook, stateSelector] of stateSelectors) {
      expect(positionTarget).toContain(`'${stateHook}'`);
      expect(declarationBlock(stateSelector).trim()).not.toBe('');
    }

    expect(
      declarationBlock('.eb-condition-drop-target::before'),
    ).toMatch(/\bborder-top:\s*[^;]+var\(--[\w-]+\)\s*;/);
    expect(
      declarationBlock(
        '.eb-condition-drop-target.is-active.is-valid-drop > span::before',
      ),
    ).toMatch(/\bcontent:\s*"[^"]+"\s*;/);
    expect(
      declarationBlock(
        '.eb-condition-drop-target.is-active.is-invalid-drop > span::before',
      ),
    ).toMatch(/\bcontent:\s*"[^"]+"\s*;/);
    expect(
      declarationBlock('.eb-condition-drop-target > span'),
    ).not.toMatch(/\bdisplay:\s*none\s*;/);
    expect(css).toMatch(
      /\.eb-condition-drop-target(?:\s*>\s*|\s+)span[^{]*\{/,
    );

    const dragStateCss = [
      declarationBlock('.eb-root .eb-drag-handle'),
      declarationBlock('.eb-field-row.is-dragging'),
      declarationBlock('.eb-condition-drop-target'),
      declarationBlock('.eb-condition-drop-target.is-active'),
      declarationBlock(
        '.eb-condition-drop-target.is-active.is-valid-drop',
      ),
      declarationBlock(
        '.eb-condition-drop-target.is-active.is-invalid-drop',
      ),
      declarationBlock('.eb-condition-drop-target.is-drop-target'),
      declarationBlock(
        '.eb-condition-drop-target.is-active.is-ineligible',
      ),
    ].join('\n');
    expect(dragStateCss).toMatch(/var\(--[\w-]+\)/);
    expect(dragStateCss).not.toMatch(
      /#[\da-f]{3,8}\b|rgba?\(|\b(?:white|black)\b/i,
    );
  });

  it('disables drag/drop motion when reduced motion is requested', () => {
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.eb-root\s*,\s*\.eb-root\s+\*\s*\{[\s\S]*?transition-duration:\s*1ms\s*!important\s*;/,
    );
  });

  it('preserves the existing scroll ownership and responsive rule-row layout', () => {
    expect(declarationBlock('.eb-pane-body')).toMatch(
      /\boverflow:\s*auto\s*;/,
    );
    expect(declarationBlock('.eb-toolbox-scroll')).toMatch(
      /\boverflow-y:\s*auto\s*;/,
    );
    expect(declarationBlock('.eb-group-children')).toMatch(
      /\boverflow:\s*auto\s*;/,
    );

    expect(css).toMatch(
      /@media\s*\(max-width:\s*1100px\)\s*\{[\s\S]*?\.eb-rule-row-editor\s*\{[\s\S]*?grid-template-columns\s*:/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.eb-workspace\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*;/,
    );
  });
});
