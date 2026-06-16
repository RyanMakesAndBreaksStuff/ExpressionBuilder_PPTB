import { describe, expect, it } from 'vitest';
import { formatExpression, OPERATORS_BY_FIELD_TYPE } from '../src';
import type { FieldDefinition, FieldType, FormatterOptions } from '../src';

const fields: FieldDefinition[] = [
  { id: 'Text', label: 'Text', type: 'string', path: ['Text'] },
  { id: 'Choice', label: 'Choice', type: 'choice', path: ['Choice'] },
  { id: 'Number', label: 'Number', type: 'number', path: ['Number'] },
  { id: 'Flag', label: 'Flag', type: 'boolean', path: ['Flag'] },
  { id: 'When', label: 'When', type: 'dateTime', path: ['When'] },
];

const options: FormatterOptions = { mode: 'triggerCondition', fields };

const expectedOperators: Record<FieldType, readonly string[]> = {
  string: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
  choice: ['equals', 'notEquals', 'empty', 'notEmpty'],
  number: ['equals', 'notEquals', 'greater', 'less', 'greaterOrEquals', 'lessOrEquals'],
  boolean: ['equals', 'notEquals'],
  dateTime: ['equals', 'notEquals', 'greater', 'less', 'greaterOrEquals', 'lessOrEquals'],
};

describe('operator type gates', () => {
  it('exposes the supported operator matrix by field type', () => {
    expect(OPERATORS_BY_FIELD_TYPE).toEqual(expectedOperators);
  });

  it.each([
    ['Text', 'empty'],
    ['Choice', 'notEmpty'],
    ['Number', 'greater'],
    ['Flag', 'equals'],
    ['When', 'lessOrEquals'],
  ])('allows %s with %s', (fieldId, operator) => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator,
        left: { kind: 'field', fieldId },
        right: operator === 'empty' || operator === 'notEmpty' ? undefined : literalFor(fieldId),
      },
      options,
    );

    expect(result.diagnostics).toEqual([]);
  });

  it.each(['Number', 'Flag'])('reports TYPE_MISMATCH for empty checks on %s', (fieldId) => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'empty',
        left: { kind: 'field', fieldId },
      },
      options,
    );

    expect(result.diagnostics.map((item) => item.code)).toContain('TYPE_MISMATCH');
  });

  it('reports UNSUPPORTED_OPERATOR for operators outside the field matrix', () => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'contains',
        left: { kind: 'field', fieldId: 'Number' },
        right: { kind: 'literal', value: 42, valueType: 'number' },
      },
      options,
    );

    expect(result.diagnostics.map((item) => item.code)).toContain('UNSUPPORTED_OPERATOR');
  });
});

function literalFor(fieldId: string) {
  switch (fieldId) {
    case 'Number':
      return { kind: 'literal' as const, value: 1, valueType: 'number' as const };
    case 'Flag':
      return { kind: 'literal' as const, value: true, valueType: 'boolean' as const };
    case 'When':
      return { kind: 'literal' as const, value: '2026-01-01T00:00:00Z', valueType: 'dateTime' as const };
    default:
      return { kind: 'literal' as const, value: 'A', valueType: 'string' as const };
  }
}
