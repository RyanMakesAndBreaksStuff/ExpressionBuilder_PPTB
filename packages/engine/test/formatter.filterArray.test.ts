import { describe, expect, it } from 'vitest';
import { formatExpression } from '../src';
import type { ExpressionNode, FieldDefinition, FormatterOptions } from '../src';

const fields: FieldDefinition[] = [
  { id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['Approved', 'Rejected'] },
  { id: 'SubmittedOn', label: 'Submitted on', type: 'dateTime', path: ['SubmittedOn'] },
  { id: 'City', label: 'City', type: 'string', path: ['customer', 'address', 'city'] },
];

const filterOptions: FormatterOptions = { mode: 'filterArray', fields };

const statusApprovedAst: ExpressionNode = {
  kind: 'rule',
  operator: 'equals',
  left: { kind: 'field', fieldId: 'Status' },
  right: { kind: 'literal', value: 'Approved', valueType: 'string' },
};

describe('filter array formatter', () => {
  it('formats simple item field equality', () => {
    expect(formatExpression(statusApprovedAst, filterOptions).expression).toBe(
      "@equals(item()?['Status'], 'Approved')",
    );
  });

  it('formats nested item paths with safe navigation', () => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'City' },
        right: { kind: 'literal', value: 'Paris', valueType: 'string' },
      },
      filterOptions,
    );

    expect(result.expression).toBe("@equals(item()?['customer']?['address']?['city'], 'Paris')");
  });

  it('wraps date comparisons in ticks without double-wrapping an existing ticks call', () => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'greaterOrEquals',
        left: { kind: 'field', fieldId: 'SubmittedOn' },
        right: {
          kind: 'function',
          name: 'ticks',
          args: [{ kind: 'literal', value: '2026-01-01T00:00:00Z', valueType: 'dateTime' }],
        },
      },
      filterOptions,
    );

    expect(result.expression).toBe(
      "@greaterOrEquals(ticks(item()?['SubmittedOn']), ticks('2026-01-01T00:00:00Z'))",
    );
  });
});
