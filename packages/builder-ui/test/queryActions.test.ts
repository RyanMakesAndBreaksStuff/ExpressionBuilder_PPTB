import { describe, expect, it } from 'vitest';
import {
  addGroup,
  addRule,
  changeGroupConjunction,
  deleteNode,
  duplicateRule,
  focusGroup,
  moveNode,
  reorderNode,
  selectRule,
  updateRule,
} from '../src/composer/queryActions';
import type { QueryDocument } from '../src/composer/querySchema';

const sampleDocument: QueryDocument = {
  version: 1,
  mode: 'triggerCondition',
  fields: [
    {
      id: 'Status',
      label: 'Status',
      type: 'choice',
      path: ['Status'],
      choices: ['Approved', 'Rejected', 'Pending'],
    },
    {
      id: 'Region',
      label: 'Region',
      type: 'choice',
      path: ['Region'],
      choices: ['EMEA', 'APAC', 'AMER'],
    },
  ],
  selectedRuleId: 'rule-status',
  root: {
    id: 'root',
    kind: 'group',
    conjunction: 'and',
    children: [
      {
        id: 'rule-status',
        kind: 'rule',
        fieldId: 'Status',
        operator: 'equals',
        value: 'Approved',
      },
    ],
  },
};

const reorderDocument: QueryDocument = {
  ...sampleDocument,
  version: 2,
  activeGroupId: 'group-nested',
  root: {
    ...sampleDocument.root,
    children: [
      {
        id: 'rule-status',
        kind: 'rule',
        fieldId: 'Status',
        operator: 'equals',
        value: 'Approved',
        wrappers: ['toLower'],
      },
      {
        id: 'group-nested',
        kind: 'group',
        conjunction: 'or',
        children: [
          {
            id: 'rule-region',
            kind: 'rule',
            fieldId: 'Region',
            operator: 'equals',
            value: 'EMEA',
          },
        ],
      },
      {
        id: 'rule-pending',
        kind: 'rule',
        fieldId: 'Status',
        operator: 'equals',
        value: 'Pending',
      },
    ],
  },
};

describe('queryActions', () => {
  it('adds a rule to a group, selects it, and focuses its parent group', () => {
    const result = addRule(sampleDocument, 'root');

    expect(result).not.toBe(sampleDocument);
    expect(result).toHaveProperty('root.children.length', 2);
    expect(result.selectedRuleId).toBe('rule-1');
    expect(result.activeGroupId).toBe('root');
  });

  it.each([
    ['start', 0, ['rule-inserted', 'rule-status', 'group-nested', 'rule-pending']],
    ['middle', 1, ['rule-status', 'rule-inserted', 'group-nested', 'rule-pending']],
    ['end', 3, ['rule-status', 'group-nested', 'rule-pending', 'rule-inserted']],
  ])('adds a rule at the requested %s position', (_position, targetIndex, expectedIds) => {
    const result = addRule(
      reorderDocument,
      'root',
      {
        id: 'rule-inserted',
        fieldId: 'Region',
        operator: 'equals',
        value: 'APAC',
      },
      targetIndex,
    );

    expect(result.root.children.map((child) => child.id)).toEqual(expectedIds);
    expect(result.selectedRuleId).toBe('rule-inserted');
    expect(result.activeGroupId).toBe('root');
    expect(reorderDocument.root.children.map((child) => child.id)).toEqual([
      'rule-status',
      'group-nested',
      'rule-pending',
    ]);
  });

  it('inserts into a nested group and rejects a stale indexed target', () => {
    const result = addRule(
      reorderDocument,
      'group-nested',
      {
        id: 'rule-nested-first',
        fieldId: 'Status',
        operator: 'equals',
        value: 'Rejected',
      },
      0,
    );
    const nested = result.root.children.find((child) => child.id === 'group-nested');

    expect(nested?.kind === 'group' ? nested.children.map((child) => child.id) : []).toEqual([
      'rule-nested-first',
      'rule-region',
    ]);
    expect(addRule(reorderDocument, 'missing-group', {}, 0)).toBe(reorderDocument);
    expect(addRule(reorderDocument, 'group-nested', {}, 2)).toBe(reorderDocument);
  });

  it('adds a nested group, focuses it, and leaves the selected rule alone', () => {
    const result = addGroup(sampleDocument, 'root', { id: 'group-region', conjunction: 'or' });

    expect(result.root.children).toHaveLength(2);
    expect(result.root.children[1]).toMatchObject({ id: 'group-region', kind: 'group' });
    expect(result.selectedRuleId).toBe('rule-status');
    expect(result.activeGroupId).toBe('group-region');
  });

  it('focuses an existing group directly, e.g. an empty one with no rules to select', () => {
    const withGroup = addGroup(sampleDocument, 'root', { id: 'group-region' });
    const refocusedRoot = focusGroup(withGroup, 'root');

    expect(focusGroup(withGroup, 'group-region').activeGroupId).toBe('group-region');
    expect(refocusedRoot.activeGroupId).toBe('root');
    expect(focusGroup(withGroup, 'missing')).toBe(withGroup);
  });

  it('changes a group conjunction', () => {
    expect(changeGroupConjunction(sampleDocument, 'root', 'or').root.conjunction).toBe('or');
  });

  it('updates a rule and selects it', () => {
    expect(updateRule(sampleDocument, 'rule-status', { value: 'Rejected' })).toMatchObject({
      selectedRuleId: 'rule-status',
    });
  });

  it('deletes a selected node and clears selection', () => {
    expect(deleteNode(sampleDocument, 'rule-status').selectedRuleId).toBeUndefined();
  });

  it('deletes the focused group and falls back to root', () => {
    const withGroup = focusGroup(addGroup(sampleDocument, 'root', { id: 'group-region' }), 'group-region');

    expect(deleteNode(withGroup, 'group-region').activeGroupId).toBeUndefined();
  });

  it('selects an existing rule, focuses its parent group, and ignores missing rules', () => {
    const cleared = selectRule(sampleDocument, undefined);
    const selected = selectRule(cleared, 'rule-status');

    expect(cleared.selectedRuleId).toBeUndefined();
    expect(selected.selectedRuleId).toBe('rule-status');
    expect(selected.activeGroupId).toBe('root');
    expect(selectRule(selected, 'missing')).toBe(selected);
  });

  it('duplicates a rule next to the source and selects the copy', () => {
    const result = duplicateRule(sampleDocument, 'rule-status');

    expect(result.root.children).toHaveLength(2);
    expect(result.root.children[1]).toMatchObject({
      id: 'rule-status-copy-1',
      kind: 'rule',
      fieldId: 'Status',
      value: 'Approved',
    });
    expect(result.selectedRuleId).toBe('rule-status-copy-1');
  });

  it('moves a node into another group at the requested index', () => {
    const withGroup = addGroup(sampleDocument, 'root', { id: 'group-region' });
    const result = moveNode(withGroup, 'rule-status', 'group-region', 0);
    const group = result.root.children[0];

    expect(result.root.children).toHaveLength(1);
    expect(group).toMatchObject({ id: 'group-region', kind: 'group' });
    expect(group.kind === 'group' ? group.children[0]?.id : undefined).toBe('rule-status');
  });

  it.each([
    ['upward', 'rule-pending', 0, ['rule-pending', 'rule-status', 'group-nested']],
    ['downward', 'rule-status', 2, ['group-nested', 'rule-pending', 'rule-status']],
  ])(
    'reorders a sibling %s using its final post-removal index',
    (_direction, nodeId, finalIndex, expectedIds) => {
      const result = reorderNode(reorderDocument, nodeId, 'root', finalIndex);

      expect(result.root.children.map((child) => child.id)).toEqual(expectedIds);
      expect(result.version).toBe(2);
      expect(result.selectedRuleId).toBe('rule-status');
      expect(result.activeGroupId).toBe('group-nested');
      expect(result.root.children.find((child) => child.id === 'rule-status')).toMatchObject({
        value: 'Approved',
        wrappers: ['toLower'],
      });
      expect(reorderDocument.root.children.map((child) => child.id)).toEqual([
        'rule-status',
        'group-nested',
        'rule-pending',
      ]);
    },
  );

  it.each([
    ['same final index', 'rule-status', 'root', 0],
    ['missing node', 'missing', 'root', 0],
    ['wrong parent', 'rule-status', 'group-nested', 0],
    ['root source', 'root', 'root', 0],
    ['fractional final index', 'rule-status', 'root', 0.5],
    ['negative final index', 'rule-status', 'root', -1],
    ['stale final index', 'rule-status', 'root', 3],
  ])(
    'returns the original document for an invalid sibling reorder: %s',
    (_description, nodeId, parentGroupId, finalIndex) => {
      expect(reorderNode(reorderDocument, nodeId, parentGroupId, finalIndex)).toBe(
        reorderDocument,
      );
    },
  );

  it('rejects cross-parent reordering while retaining guarded cross-group moves', () => {
    expect(reorderNode(reorderDocument, 'rule-region', 'root', 0)).toBe(reorderDocument);

    const moved = moveNode(reorderDocument, 'rule-status', 'group-nested', 0);
    const nested = moved.root.children.find((child) => child.id === 'group-nested');
    expect(nested?.kind === 'group' ? nested.children.map((child) => child.id) : []).toEqual([
      'rule-status',
      'rule-region',
    ]);
  });

  it('reorders a non-root group as a sibling without recreating the moved node', () => {
    const nestedBefore = reorderDocument.root.children[1];
    const result = reorderNode(reorderDocument, 'group-nested', 'root', 0);

    expect(result.root.children.map((child) => child.id)).toEqual([
      'group-nested',
      'rule-status',
      'rule-pending',
    ]);
    expect(result.root.children[0]).toBe(nestedBefore);
    expect(result.fields).toBe(reorderDocument.fields);
  });

  it('retains moveNode guards for the root and moving a group into its descendant', () => {
    expect(moveNode(reorderDocument, 'root', 'group-nested')).toBe(reorderDocument);

    const withDescendant = addGroup(reorderDocument, 'group-nested', {
      id: 'group-descendant',
    });
    expect(moveNode(withDescendant, 'group-nested', 'group-descendant')).toBe(
      withDescendant,
    );
  });
});
