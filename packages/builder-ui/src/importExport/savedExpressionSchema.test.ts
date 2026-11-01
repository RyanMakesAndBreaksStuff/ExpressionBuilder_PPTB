import { describe, expect, it } from 'vitest';
import { parseSavedExpression, serializeSavedExpression } from './savedExpressionSchema';

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

  it('rejects malformed wrappers', () => {
    const json = JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields: [{ id: 'name', label: 'Name', type: 'string', path: ['name'] }],
      root: {
        id: 'root',
        kind: 'group',
        conjunction: 'and',
        children: [{ id: 'rule-1', kind: 'rule', fieldId: 'name', operator: 'equals', value: 'x', wrappers: [123] }],
      },
    });

    const result = parseSavedExpression(json);
    expect(result.ok).toBe(false);
  });
});

describe('savedExpressionSchema — root and finite numbers', () => {
  const fields = [{ id: 'n', label: 'N', type: 'number', path: ['n'] }];

  function saved(version: 1 | 2, root: unknown, fieldList: unknown[] = fields) {
    return JSON.stringify({
      version,
      mode: 'triggerCondition',
      fields: fieldList,
      root,
    });
  }

  it('rejects a rule document root in versions 1 and 2', () => {
    const rule = { id: 'rule-1', kind: 'rule', fieldId: 'n', operator: 'equals', value: 1 };

    for (const version of [1, 2] as const) {
      const result = parseSavedExpression(saved(version, rule));
      expect(result).toEqual({ ok: false, errors: ['Import failed: root must be a group.'] });
    }
  });

  it('round-trips nested rules inside a group, including unset and unary values', () => {
    const document = {
      version: 2 as const,
      mode: 'triggerCondition' as const,
      fields: [
        { id: 'n', label: 'N', type: 'number' as const, path: ['n'] },
        { id: 'name', label: 'Name', type: 'string' as const, path: ['name'] },
        { id: 'submitted', label: 'Submitted', type: 'boolean' as const, path: ['submitted'] },
        {
          id: 'statuscode',
          label: 'Status',
          type: 'choice' as const,
          path: ['statuscode'],
          options: [
            { label: 'None', value: 0 },
            { label: 'Active', value: -2.5 },
          ],
        },
      ],
      root: {
        id: 'root',
        kind: 'group' as const,
        conjunction: 'and' as const,
        children: [
          { id: 'rule-finite', kind: 'rule' as const, fieldId: 'n', operator: 'equals', value: 1.5 },
          { id: 'rule-text', kind: 'rule' as const, fieldId: 'name', operator: 'equals', value: '1e309' },
          { id: 'rule-bool', kind: 'rule' as const, fieldId: 'submitted', operator: 'equals', value: false },
          { id: 'rule-cleared', kind: 'rule' as const, fieldId: 'n', operator: 'equals', value: null },
          { id: 'rule-unary', kind: 'rule' as const, fieldId: 'name', operator: 'empty' },
          {
            id: 'nested',
            kind: 'group' as const,
            conjunction: 'or' as const,
            children: [
              { id: 'rule-nested', kind: 'rule' as const, fieldId: 'statuscode', operator: 'equals', value: 0 },
            ],
          },
        ],
      },
    };

    const parsed = parseSavedExpression(JSON.stringify(document));
    expect(parsed).toEqual({ ok: true, document });
    if (!parsed.ok) return;

    expect(parseSavedExpression(serializeSavedExpression(parsed.document))).toEqual({
      ok: true,
      document,
    });
  });

  it('rejects non-finite rule values from JSON overflow', () => {
    for (const literal of ['1e309', '-1e309']) {
      const json = `{
        "version": 1,
        "mode": "triggerCondition",
        "fields": [{ "id": "n", "label": "N", "type": "number", "path": ["n"] }],
        "root": {
          "id": "root",
          "kind": "group",
          "conjunction": "and",
          "children": [
            { "id": "rule-1", "kind": "rule", "fieldId": "n", "operator": "equals", "value": ${literal} }
          ]
        }
      }`;
      const result = parseSavedExpression(json);
      expect(result).toEqual({
        ok: false,
        errors: ['Import failed: root.children[0].value must be a finite number.'],
      });
    }
  });

  it('rejects non-finite option values from JSON overflow', () => {
    for (const literal of ['1e309', '-1e309']) {
      const json = `{
        "version": 2,
        "mode": "triggerCondition",
        "fields": [{
          "id": "statuscode",
          "label": "Status",
          "type": "choice",
          "path": ["statuscode"],
          "options": [{ "label": "Overflow", "value": ${literal} }]
        }],
        "root": { "id": "root", "kind": "group", "conjunction": "and", "children": [] }
      }`;
      const result = parseSavedExpression(json);
      expect(result).toEqual({
        ok: false,
        errors: ['Import failed: fields[0].options values must be finite numbers.'],
      });
    }
  });
});

describe('savedExpressionSchema — ids and values', () => {
  const field = { id: 'n', label: 'N', type: 'number', path: ['n'] };
  const rule = (id: string, extra: object = {}) => ({ id, kind: 'rule', fieldId: 'n', operator: 'equals', value: 1, ...extra });
  const doc = (children: unknown[], extra: object = {}, fields: unknown[] = [field]) =>
    JSON.stringify({
      version: 2,
      mode: 'triggerCondition',
      fields,
      root: { id: 'root', kind: 'group', conjunction: 'and', children },
      ...extra,
    });

  it('rejects duplicate field ids', () => {
    expect(parseSavedExpression(doc([], {}, [field, field]))).toEqual({
      ok: false,
      errors: ['Import failed: fields[1].id "n" is duplicated.'],
    });
  });

  it('rejects duplicate node ids across groups and rules', () => {
    const nested = { id: 'dup', kind: 'group', conjunction: 'or', children: [] };
    expect(parseSavedExpression(doc([rule('dup'), nested]))).toEqual({
      ok: false,
      errors: ['Import failed: root.children[1].id "dup" is duplicated.'],
    });
  });

  it('rejects object and array rule values', () => {
    for (const value of [{ a: 1 }, [1]]) {
      expect(parseSavedExpression(doc([rule('r1', { value })]))).toEqual({
        ok: false,
        errors: ['Import failed: root.children[0].value must be a string, number, boolean or null.'],
      });
    }
  });

  it('drops stale selectedRuleId and activeGroupId but keeps valid ones', () => {
    const stale = parseSavedExpression(doc([rule('r1')], { selectedRuleId: 'gone', activeGroupId: 'gone' }));
    expect(stale.ok).toBe(true);
    if (stale.ok) {
      expect(stale.document).not.toHaveProperty('selectedRuleId');
      expect(stale.document).not.toHaveProperty('activeGroupId');
    }

    const kept = parseSavedExpression(doc([rule('r1')], { selectedRuleId: 'r1', activeGroupId: 'root' }));
    expect(kept.ok && kept.document.selectedRuleId).toBe('r1');
    expect(kept.ok && kept.document.activeGroupId).toBe('root');

    // a group id is not a rule id, and vice versa
    const swapped = parseSavedExpression(doc([rule('r1')], { selectedRuleId: 'root', activeGroupId: 'r1' }));
    expect(swapped.ok && swapped.document.selectedRuleId).toBeUndefined();
    expect(swapped.ok && swapped.document.activeGroupId).toBeUndefined();
  });
});
