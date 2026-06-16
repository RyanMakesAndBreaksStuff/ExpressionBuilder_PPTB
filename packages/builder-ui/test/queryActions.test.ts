import { describe, expect, it } from 'vitest';
import {
  addGroup,
  addRule,
  changeGroupConjunction,
  deleteNode,
  duplicateRule,
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
  it('adds a rule to a group and selects it', () => {
    const result = addRule(sampleDocument, 'root');

    expect(result).not.toBe(sampleDocument);
    expect(result).toHaveProperty('root.children.length', 2);
    expect(result.selectedRuleId).toBe('rule-1');
  });

  it('adds a nested group without changing the selected rule', () => {
    const result = addGroup(sampleDocument, 'root', { id: 'group-region', conjunction: 'or' });

    expect(result.root.children).toHaveLength(2);
    expect(result.root.children[1]).toMatchObject({ id: 'group-region', kind: 'group' });
    expect(result.selectedRuleId).toBe('rule-status');
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

  it('selects an existing rule and ignores missing rules', () => {
    const cleared = selectRule(sampleDocument, undefined);
    const selected = selectRule(cleared, 'rule-status');

    expect(cleared.selectedRuleId).toBeUndefined();
    expect(selected.selectedRuleId).toBe('rule-status');
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
