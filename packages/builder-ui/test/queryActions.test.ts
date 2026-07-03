import { describe, expect, it } from 'vitest';
import {
  addGroup,
  addRule,
  changeGroupConjunction,
  deleteNode,
  duplicateRule,
  focusGroup,
  moveNode,
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

describe('queryActions', () => {
  it('adds a rule to a group, selects it, and focuses its parent group', () => {
    const result = addRule(sampleDocument, 'root');

    expect(result).not.toBe(sampleDocument);
    expect(result).toHaveProperty('root.children.length', 2);
    expect(result.selectedRuleId).toBe('rule-1');
    expect(result.activeGroupId).toBe('root');
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
});
