import { describe, expect, it } from 'vitest';
import { formatExpression } from '../src';
import type { ExpressionNode, FieldDefinition, FormatterOptions } from '../src';

const fields: FieldDefinition[] = [
  { id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['Approved', 'Rejected'] },
  { id: 'Region', label: 'Region', type: 'choice', path: ['Region'], choices: ['EMEA', 'APAC'] },
  { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
  { id: 'DueDate', label: 'Due date', type: 'dateTime', path: ['DueDate'] },
  { id: 'Title', label: 'Title', type: 'string', path: ['Title'], nullable: true },
  {
    id: 'DeploymentStageName',
    label: 'Deployment stage',
    type: 'string',
    path: ['body', 'OutputParameters', 'DeploymentStageName'],
  },
];

const triggerOptions: FormatterOptions = { mode: 'triggerCondition', fields };

const statusApprovedAst: ExpressionNode = {
  kind: 'rule',
  operator: 'equals',
  left: { kind: 'field', fieldId: 'Status' },
  right: { kind: 'literal', value: 'Approved', valueType: 'string' },
};

describe('trigger condition formatter', () => {
  it('formats simple triggerBody field equality', () => {
    expect(formatExpression(statusApprovedAst, triggerOptions).expression).toBe(
      "@equals(triggerBody()?['Status'], 'Approved')",
    );
  });

  it('formats the nested Final Option 1 predicate exactly', () => {
    const ast: ExpressionNode = {
      kind: 'group',
      conjunction: 'and',
      children: [
        statusApprovedAst,
        {
          kind: 'group',
          conjunction: 'or',
          children: [
            {
              kind: 'rule',
              operator: 'equals',
              left: { kind: 'field', fieldId: 'Region' },
              right: { kind: 'literal', value: 'EMEA', valueType: 'string' },
            },
            {
              kind: 'rule',
              operator: 'equals',
              left: { kind: 'field', fieldId: 'Region' },
              right: { kind: 'literal', value: 'APAC', valueType: 'string' },
            },
          ],
        },
        {
          kind: 'rule',
          operator: 'greater',
          left: { kind: 'field', fieldId: 'Amount' },
          right: { kind: 'literal', value: 5000, valueType: 'number' },
        },
        {
          kind: 'rule',
          operator: 'less',
          left: { kind: 'field', fieldId: 'DueDate' },
          right: {
            kind: 'function',
            name: 'addDays',
            args: [
              { kind: 'function', name: 'utcNow', args: [] },
              { kind: 'literal', value: 7, valueType: 'number' },
            ],
          },
        },
      ],
    };

    const result = formatExpression(ast, triggerOptions);

    expect(result.expression).toBe(
      "@and(equals(triggerBody()?['Status'], 'Approved'), or(equals(triggerBody()?['Region'], 'EMEA'), equals(triggerBody()?['Region'], 'APAC')), greater(triggerBody()?['Amount'], 5000), less(ticks(triggerBody()?['DueDate']), ticks(addDays(utcNow(), 7))))",
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('formats nested triggerBody paths with safe navigation', () => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'equals',
        left: { kind: 'field', fieldId: 'DeploymentStageName' },
        right: { kind: 'literal', value: 'Prod', valueType: 'string' },
      },
      triggerOptions,
    );

    expect(result.expression).toBe(
      "@equals(triggerBody()?['body']?['OutputParameters']?['DeploymentStageName'], 'Prod')",
    );
  });

  it('does not auto-wrap string comparisons with toLower', () => {
    const result = formatExpression(
      {
        kind: 'rule',
        operator: 'contains',
        left: { kind: 'field', fieldId: 'Title' },
        right: { kind: 'literal', value: 'urgent', valueType: 'string' },
      },
      triggerOptions,
    );

    expect(result.expression).toBe(
      "@contains(triggerBody()?['Title'], 'urgent')",
    );
  });
});
