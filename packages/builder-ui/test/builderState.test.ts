import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { deriveBuilderState, findParentGroupId, getDefaultValue } from '../src/app/builderState';
import type { QueryDocument, QueryNode } from '../src/composer/querySchema';

const nameField: FieldDefinition = { id: 'name', label: 'Name', type: 'string', path: ['name'] };
const choiceField: FieldDefinition = {
  id: 'statuscode',
  label: 'Status',
  type: 'choice',
  path: ['statuscode'],
  options: [{ label: 'Active', value: 1 }],
  choices: ['Active'],
};

function doc(child: QueryNode, fields: FieldDefinition[]): QueryDocument {
  return {
    version: 2,
    mode: 'triggerCondition',
    fields,
    root: { id: 'root', kind: 'group', conjunction: 'and', children: [child] },
  };
}

describe('findParentGroupId', () => {
  it('returns the id of the group that holds the rule', () => {
    const root: QueryNode = {
      id: 'root',
      kind: 'group',
      conjunction: 'and',
      children: [
        { id: 'g1', kind: 'group', conjunction: 'and', children: [{ id: 'rule-2', kind: 'rule', fieldId: 'name', operator: 'equals' }] },
      ],
    };
    expect(findParentGroupId(root, 'rule-2')).toBe('g1');
    expect(findParentGroupId(root, 'missing')).toBeUndefined();
    expect(findParentGroupId(root, undefined)).toBeUndefined();
  });
});

describe('getDefaultValue', () => {
  it('uses the first numeric option value for a choice field', () => {
    expect(getDefaultValue(choiceField)).toBe(1);
  });
});

describe('deriveBuilderState — wrappers', () => {
  it('wraps both operands in nested functions in order', () => {
    const document = doc(
      { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob', wrappers: ['trim', 'toLower'] },
      [nameField],
    );
    const { expression } = deriveBuilderState(document);
    expect(expression).toContain("toLower(trim(triggerBody()?['name']))");
    expect(expression).toContain("toLower(trim('Bob'))");
  });

  it('emits coalesce in binary form', () => {
    const document = doc(
      { id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'Bob', wrappers: ['coalesce'] },
      [nameField],
    );
    const { expression } = deriveBuilderState(document);
    expect(expression).toContain("coalesce(triggerBody()?['name'], '')");
  });
});
