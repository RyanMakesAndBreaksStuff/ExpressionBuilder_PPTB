import { describe, expect, it } from 'vitest';
import { formatExpression, formatLiteral } from '../src';
import type { ExpressionNode, FieldDefinition, FormatterOptions } from '../src';

const nameField: FieldDefinition = { id: 'name', label: 'Name', type: 'string', path: ['name'] };
const nullableName: FieldDefinition = { ...nameField, nullable: true };

function run(node: ExpressionNode, over: Partial<FormatterOptions> = {}) {
  return formatExpression(node, { mode: 'triggerCondition', fields: [nameField], ...over });
}

function codes(node: ExpressionNode, over?: Partial<FormatterOptions>) {
  return run(node, over).diagnostics.map((d) => d.code);
}

describe('formatter diagnostics coverage', () => {
  it('EMPTY_GROUP when a group has no children', () => {
    expect(codes({ kind: 'group', conjunction: 'and', children: [] })).toContain('EMPTY_GROUP');
  });

  it('MISSING_OPERAND when a binary operator has no right operand', () => {
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [{ kind: 'rule', operator: 'equals', left: { kind: 'field', fieldId: 'name' } }],
    };
    expect(codes(node)).toContain('MISSING_OPERAND');
  });

  it('UNKNOWN_FIELD when a rule references an unregistered field', () => {
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [
        {
          kind: 'rule',
          operator: 'equals',
          left: { kind: 'field', fieldId: 'ghost' },
          right: { kind: 'literal', value: 'x', valueType: 'string' },
        },
      ],
    };
    expect(codes(node)).toContain('UNKNOWN_FIELD');
  });

  it('reports one UNKNOWN_FIELD at $.left for a bare orphan field', () => {
    const node: ExpressionNode = {
      kind: 'rule',
      operator: 'empty',
      left: { kind: 'field', fieldId: 'ghost' },
    };
    expect(run(node).diagnostics.filter((d) => d.code === 'UNKNOWN_FIELD')).toEqual([
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.left',
      },
    ]);
  });

  it('keeps a single UNKNOWN_FIELD at the field path when a wrapper rechecks a missing field', () => {
    const node: ExpressionNode = {
      kind: 'rule',
      operator: 'equals',
      left: { kind: 'function', name: 'toLower', args: [{ kind: 'field', fieldId: 'ghost' }] },
      right: { kind: 'literal', value: 'x', valueType: 'string' },
    };
    const result = run(node);
    expect(result.diagnostics.filter((d) => d.code === 'UNKNOWN_FIELD')).toEqual([
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.left.args[0]',
      },
    ]);
    expect(result.diagnostics.some((d) => d.code === 'UNSAFE_NULL_STRING_WRAPPER')).toBe(false);
  });

  it('reports UNKNOWN_FIELD once for each distinct missing-field occurrence', () => {
    const node: ExpressionNode = {
      kind: 'rule',
      operator: 'equals',
      left: { kind: 'field', fieldId: 'ghost' },
      right: { kind: 'field', fieldId: 'ghost' },
    };
    expect(run(node).diagnostics.filter((d) => d.code === 'UNKNOWN_FIELD')).toEqual([
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.left',
      },
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.right',
      },
    ]);
  });

  it('MAX_DEPTH when nesting exceeds the configured limit', () => {
    // Root group is depth 0; its child is depth 1, which exceeds maxDepth: 0.
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [
        {
          kind: 'rule',
          operator: 'equals',
          left: { kind: 'field', fieldId: 'name' },
          right: { kind: 'literal', value: 'x', valueType: 'string' },
        },
      ],
    };
    expect(codes(node, { maxDepth: 0 })).toContain('MAX_DEPTH');
  });

  it('UNSAFE_NULL_STRING_WRAPPER (warning) when wrapping a nullable field in toLower', () => {
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [
        {
          kind: 'rule',
          operator: 'equals',
          left: { kind: 'function', name: 'toLower', args: [{ kind: 'field', fieldId: 'name' }] },
          right: { kind: 'literal', value: 'x', valueType: 'string' },
        },
      ],
    };
    const result = formatExpression(node, { mode: 'triggerCondition', fields: [nullableName] });
    const warning = result.diagnostics.find((d) => d.code === 'UNSAFE_NULL_STRING_WRAPPER');
    expect(warning?.severity).toBe('warning');
  });

  it('INVALID_LITERAL at a nested rule operand when the number is not finite', () => {
    const node: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [
        {
          kind: 'rule',
          operator: 'equals',
          left: { kind: 'field', fieldId: 'name' },
          right: { kind: 'literal', value: Infinity, valueType: 'number' },
        },
      ],
    };
    const result = run(node);
    const invalid = result.diagnostics.find((d) => d.code === 'INVALID_LITERAL');
    expect(invalid).toEqual({
      code: 'INVALID_LITERAL',
      message: 'Numeric literals must be finite.',
      severity: 'error',
      path: '$.children[0].right',
    });
    expect(result.expression).toBe("@and(equals(triggerBody()?['name'], null))");
    expect(result.diagnostics.map((d) => d.code)).toEqual(['INVALID_LITERAL']);
  });
});

describe('formatLiteral', () => {
  it('escapes single quotes by doubling them', () => {
    expect(formatLiteral({ kind: 'literal', value: "O'Brien", valueType: 'string' })).toBe("'O''Brien'");
  });

  it('renders null, numbers, and booleans without quotes', () => {
    expect(formatLiteral({ kind: 'literal', value: null, valueType: 'null' })).toBe('null');
    expect(formatLiteral({ kind: 'literal', value: 42, valueType: 'number' })).toBe('42');
    expect(formatLiteral({ kind: 'literal', value: true, valueType: 'boolean' })).toBe('true');
  });
});
