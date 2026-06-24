import { describe, expect, it } from 'vitest';
import { parseSavedExpression, serializeSavedExpression, upgradeDocument } from './savedExpressionSchema';
import type { QueryDocument } from '../composer/querySchema';

const v1Fixture = JSON.stringify({
  version: 1,
  mode: 'triggerCondition',
  fields: [{ id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['A', 'B'] }],
  root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
});

describe('saved expression v1 to v2 migration', () => {
  it('loads a v1 document and upgrades it to v2', () => {
    const result = parseSavedExpression(v1Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.version).toBe(2);
      expect(result.document.source).toEqual({ kind: 'unknown' });
    }
  });

  it('round-trips a v2 document unchanged', () => {
    const doc: QueryDocument = {
      version: 2,
      mode: 'filterArray',
      fields: [{ id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'], source: 'user' }],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
      source: { kind: 'import', label: 'Pasted JSON' },
    };
    const reparsed = parseSavedExpression(serializeSavedExpression(doc));
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.document).toEqual(doc);
    }
  });

  it('upgradeDocument is idempotent', () => {
    const doc = upgradeDocument({
      version: 1,
      mode: 'triggerCondition',
      fields: [],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });
    expect(upgradeDocument(doc)).toEqual(doc);
  });

  it('rejects version 3', () => {
    const result = parseSavedExpression(v1Fixture.replace('"version":1', '"version":3'));
    expect(result.ok).toBe(false);
  });
});
