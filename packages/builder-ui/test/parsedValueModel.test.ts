import { describe, expect, it } from 'vitest';
import {
  currentReferenceRoot,
  initialJsonReferenceState,
  jsonReferenceReducer,
  type JsonReferenceAction,
} from '../src/workbench/jsonReferenceState';
import { buildParsedValueList, MAX_PARSED_VALUE_ROWS } from '../src/workbench/parsedValueModel';

const triggerBody = { kind: 'triggerBody' } as const;

describe('parsed value model', () => {
  it('lists every leaf with its reference expression (FR-21, AC-21.1)', () => {
    const list = buildParsedValueList({ Name: 'Ada Lovelace', tags: ['a'] }, triggerBody, '');
    expect(list.rows).toEqual([
      { label: 'Name', expression: "triggerBody()?['Name']", path: ['Name'] },
      { label: 'tags[0]', expression: "triggerBody()?['tags'][0]", path: ['tags', 0] },
    ]);
    expect(list.emptyMessage).toBeNull();
    expect(list.hiddenCount).toBe(0);
  });

  it('treats an empty object or array as a leaf and nests deeply', () => {
    const list = buildParsedValueList({ a: { b: { c: 1 } }, empty: {}, none: [] }, triggerBody, '');
    expect(list.rows.map((row) => row.label)).toEqual(['a.b.c', 'empty', 'none']);
  });

  it('explains an absent sample or root (AC-21.2)', () => {
    expect(buildParsedValueList(null, triggerBody, '').emptyMessage)
      .toBe('Parse a sample in JSON reference');
    expect(buildParsedValueList({ a: 1 }, null, '').emptyMessage)
      .toBe('Set an action name in JSON reference');
  });

  it('filters by label, case-insensitively', () => {
    const list = buildParsedValueList({ Name: 1, other: 2 }, triggerBody, 'NAM');
    expect(list.rows.map((row) => row.label)).toEqual(['Name']);
  });

  it('caps the rows and counts the rest (AC-21.3)', () => {
    const sample = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`key${i}`, i]));
    const list = buildParsedValueList(sample, triggerBody, '');
    expect(list.rows).toHaveLength(MAX_PARSED_VALUE_ROWS);
    expect(list.hiddenCount).toBe(50);
  });

  it('says so when a filter matches nothing', () => {
    expect(buildParsedValueList({ a: 1 }, triggerBody, 'zzz').emptyMessage)
      .toBe('No paths match this search');
  });

  // HIGH-001 (loop plan): the source action and the Apply to each are different names.
  it('roots Parsed Value at the source action, never the loop name', () => {
    const actions: JsonReferenceAction[] = [
      { type: 'setActionName', value: 'Get items' },
      { type: 'setLoopName', value: 'Apply to each' },
    ];
    const state = actions.reduce(jsonReferenceReducer, initialJsonReferenceState);
    expect(currentReferenceRoot(state)).toEqual({ kind: 'outputs', actionName: 'Get items' });
    expect(currentReferenceRoot(initialJsonReferenceState)).toBeNull();
  });
});
