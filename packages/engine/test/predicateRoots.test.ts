import { describe, expect, it } from 'vitest';
import { formatExpression } from '../src';
import type { ExpressionMode, ExpressionNode, FieldDefinition } from '../src';

const fields: FieldDefinition[] = [{ id: 'Title', label: 'Title', type: 'string', path: ['Title'] }];

const invalidRoots: Array<[string, ExpressionNode]> = [
  ['utcNow()', { kind: 'function', name: 'utcNow', args: [] }],
  ["triggerBody()?['Title']", { kind: 'field', fieldId: 'Title' }],
  ["'text'", { kind: 'literal', value: 'text', valueType: 'string' }],
  ['42', { kind: 'literal', value: 42, valueType: 'number' }],
];

describe('predicate root validation', () => {
  it.each<ExpressionMode>(['triggerCondition', 'filterArray'])(
    'reports INVALID_ROOT_TYPE for invalid roots in %s mode',
    (mode) => {
      for (const [, node] of invalidRoots) {
        const result = formatExpression(node, { mode, fields });

        expect(result.expression.startsWith('@')).toBe(true);
        expect(result.diagnostics.map((item) => item.code)).toContain('INVALID_ROOT_TYPE');
      }
    },
  );

  it.each<ExpressionMode>(['triggerCondition', 'filterArray'])('keeps rule roots valid in %s mode', (mode) => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'Title' },
        right: { kind: 'literal', value: 'text', valueType: 'string' },
      },
      { mode, fields },
    );

    expect(result.returnType).toBe('boolean');
    expect(result.diagnostics.map((item) => item.code)).not.toContain('INVALID_ROOT_TYPE');
  });
});
