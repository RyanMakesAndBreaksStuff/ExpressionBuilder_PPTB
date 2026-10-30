import { describe, expect, it } from 'vitest';
import { formatExpression, formatLiteral } from '../src';
import type { ExpressionNode, FieldDefinition } from '../src';

const amount: FieldDefinition = { id: 'amount', label: 'Amount', type: 'number', path: ['amount'] };
const nonFinite = [Infinity, -Infinity, Number.NaN];

describe('formatLiteral', () => {
  it('keeps finite numbers, escaped strings, booleans, and null', () => {
    expect(formatLiteral({ kind: 'literal', value: "O'Brien", valueType: 'string' })).toBe("'O''Brien'");
    expect(formatLiteral({ kind: 'literal', value: null, valueType: 'null' })).toBe('null');
    expect(formatLiteral({ kind: 'literal', value: 42, valueType: 'number' })).toBe('42');
    expect(formatLiteral({ kind: 'literal', value: -1.5, valueType: 'number' })).toBe('-1.5');
    expect(formatLiteral({ kind: 'literal', value: true, valueType: 'boolean' })).toBe('true');
    expect(formatLiteral({ kind: 'literal', value: false, valueType: 'boolean' })).toBe('false');
  });

  it('rejects Infinity, -Infinity, and NaN', () => {
    for (const value of nonFinite) {
      expect(() => formatLiteral({ kind: 'literal', value, valueType: 'number' })).toThrow(
        new Error('Numeric literals must be finite.'),
      );
    }
  });
});

describe('formatExpression non-finite literals', () => {
  it('substitutes null and reports the nested operand without throwing', () => {
    for (const value of nonFinite) {
      const node: ExpressionNode = {
        kind: 'group',
        conjunction: 'and',
        children: [
          {
            kind: 'rule',
            operator: 'greater',
            left: { kind: 'field', fieldId: 'amount' },
            right: { kind: 'literal', value, valueType: 'number' },
          },
        ],
      };

      const result = formatExpression(node, { mode: 'triggerCondition', fields: [amount] });
      expect(result.expression).toBe("@and(greater(triggerBody()?['amount'], null))");
      expect(result.diagnostics).toEqual([
        {
          code: 'INVALID_LITERAL',
          message: 'Numeric literals must be finite.',
          severity: 'error',
          path: '$.children[0].right',
        },
      ]);
    }
  });

  it('reports a non-finite literal that is itself a group child', () => {
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'or',
      children: [{ kind: 'literal', value: -Infinity, valueType: 'number' }],
    };

    const result = formatExpression(node, { mode: 'filterArray', fields: [amount] });
    expect(result.expression).toBe('@or(null)');
    expect(result.diagnostics).toEqual([
      {
        code: 'INVALID_LITERAL',
        message: 'Numeric literals must be finite.',
        severity: 'error',
        path: '$.children[0]',
      },
    ]);
  });
});
