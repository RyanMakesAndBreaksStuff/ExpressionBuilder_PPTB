import { describe, expect, it } from 'vitest';
import { formatExpression } from './formatter';
import type { ExpressionNode, FieldDefinition } from './types';

const choiceField: FieldDefinition = {
  id: 'statuscode',
  label: 'Status',
  type: 'choice',
  path: ['statuscode'],
  options: [{ label: 'Active', value: 1 }],
  choices: ['Active'],
};

function group(children: ExpressionNode[]): ExpressionNode {
  return { kind: 'group', conjunction: 'and', children };
}

describe('formatExpression — numeric choice', () => {
  it('emits a bare numeric literal and raises no type mismatch', () => {
    const ast = group([
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'statuscode' },
        right: { kind: 'literal', value: 1, valueType: 'number' },
      },
    ]);

    const result = formatExpression(ast, { mode: 'triggerCondition', fields: [choiceField] });

    expect(result.expression).toContain('equals');
    expect(result.expression).toContain(', 1)');
    expect(result.diagnostics.find((d) => d.code === 'TYPE_MISMATCH')).toBeUndefined();
  });
});

describe('formatExpression — no legacy caseInsensitive', () => {
  it('does not auto-wrap string comparisons unless wrapped explicitly', () => {
    const nameField: FieldDefinition = { id: 'name', label: 'Name', type: 'string', path: ['name'] };
    const ast = group([
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'name' },
        right: { kind: 'literal', value: 'bob', valueType: 'string' },
      },
    ]);

    const result = formatExpression(ast, { mode: 'triggerCondition', fields: [nameField] });

    expect(result.expression).not.toContain('toLower');
  });
});
