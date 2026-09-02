// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { ConditionGroupCard } from '../src/workbench/ConditionGroupCard';
import type { QueryGroup } from '../src/composer/querySchema';

afterEach(() => cleanup());

const fields: FieldDefinition[] = [
  { id: 'Status', label: 'Status', type: 'string', path: ['Status'], source: 'sample' },
];

// Three levels deep: root -> group-a -> group-a-1, plus a sibling group-b at
// the second level, so multiple groups share the same nesting depth.
const nestedRoot: QueryGroup = {
  id: 'root',
  kind: 'group',
  conjunction: 'and',
  children: [
    {
      id: 'group-a',
      kind: 'group',
      conjunction: 'or',
      children: [
        {
          id: 'group-a-1',
          kind: 'group',
          conjunction: 'and',
          children: [
            {
              id: 'rule-deep',
              kind: 'rule',
              fieldId: 'Status',
              operator: 'equals',
              value: 'Approved',
            },
          ],
        },
      ],
    },
    {
      id: 'group-b',
      kind: 'group',
      conjunction: 'or',
      children: [],
    },
  ],
};

function renderTree(overrides: Partial<React.ComponentProps<typeof ConditionGroupCard>> = {}) {
  const props = {
    group: nestedRoot,
    fields,
    isRoot: true,
    onSelectRule: vi.fn(),
    onAddRule: vi.fn(),
    onAddGroup: vi.fn(),
    onFocusGroup: vi.fn(),
    onChangeGroupConjunction: vi.fn(),
    onUpdateRule: vi.fn(),
    onDuplicateRule: vi.fn(),
    onDeleteNode: vi.fn(),
    onReorderNode: vi.fn(),
    ...overrides,
  };

  return { ...props, ...render(<ConditionGroupCard {...props} />) };
}

describe('ConditionGroupCard accessibility', () => {
  it('gives every button in a nested group tree a unique accessible name', () => {
    renderTree();

    const buttons = screen.getAllByRole('button');
    const names = buttons.map(
      (button) => button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '',
    );

    expect(names.every((name) => name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('labels the toolbar and footer add-rule/add-group buttons distinctly per group', () => {
    const props = renderTree();

    expect(screen.getByRole('button', { name: 'Add rule to group root' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add rule at end of group root' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add group to group root' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add group at end of group root' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Add rule to group group-a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add rule at end of group group-a' })).toBeInTheDocument();

    screen.getByRole('button', { name: 'Add rule to group group-a-1' }).click();
    expect(props.onAddRule).toHaveBeenCalledWith('group-a-1');
  });
});
