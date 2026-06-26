import { describe, expect, it } from 'vitest';
import { parseSavedExpression } from './savedExpressionSchema';

describe('savedExpressionSchema', () => {
  it('parses a minimal valid saved expression', () => {
    const json = JSON.stringify({
      version: 1,
      mode: 'triggerCondition',
      fields: [{ id: 'name', label: 'Name', type: 'string', path: ['name'] }],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = parseSavedExpression('not json');
    expect(result.ok).toBe(false);
  });

  it('rejects missing fields', () => {
    const json = JSON.stringify({
      version: 1,
      mode: 'triggerCondition',
      fields: [],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(false);
  });
});

describe('savedExpressionSchema — new fields', () => {
  it('accepts options on a field and wrappers on a rule', () => {
    const json = JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields: [
        { id: 'statuscode', label: 'Status', type: 'choice', path: ['statuscode'], choices: ['Active'], options: [{ label: 'Active', value: 1 }] },
      ],
      root: {
        id: 'root',
        kind: 'group',
        conjunction: 'and',
        children: [{ id: 'rule-1', kind: 'rule', fieldId: 'statuscode', operator: 'equals', value: 1, wrappers: ['toLower'] }],
      },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(true);
  });

  it('rejects malformed options', () => {
    const json = JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields: [{ id: 'x', label: 'X', type: 'choice', path: ['x'], options: [{ label: 'A' }] }],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(false);
  });
});
