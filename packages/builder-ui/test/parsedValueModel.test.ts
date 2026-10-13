import { formatPayloadRoot, type PayloadReferenceRoot } from '@ryanmakes/eb_engine';
import { describe, expect, it } from 'vitest';
import {
  currentReferenceRoot,
  initialJsonReferenceState,
  jsonReferenceReducer,
  type JsonReferenceAction,
} from '../src/workbench/jsonReferenceState';
import { buildParsedValueList, MAX_PARSED_VALUE_ROWS } from '../src/workbench/parsedValueModel';
import type { ParsedValueSource } from '../src/workbench/jsonPayloadSession';
import { parsePayload } from '../src/importExport/jsonPayload';

function source(
  id: string,
  value: unknown,
  name = id,
): ParsedValueSource {
  const result = parsePayload(JSON.stringify(value));
  if (!result.ok) throw new Error(result.message);
  return {
    id,
    label: name,
    rootCaption: `body('${name}')`,
    parsed: result.payload,
    referenceRoot: { kind: 'body', actionName: name },
  };
}

const triggerBody = { kind: 'triggerBody' } as const;

function fixture(value: unknown, root: PayloadReferenceRoot | null): ParsedValueSource[] {
  const result = parsePayload(JSON.stringify(value));
  if (!result.ok) throw new Error(result.message);
  return [{
    id: 'fixture-1',
    label: 'Fixture',
    rootCaption: root ? formatPayloadRoot(root) : 'No action name',
    parsed: result.payload,
    referenceRoot: root,
  }];
}

function firstSource(list: ReturnType<typeof buildParsedValueList>) {
  const group = list.sources[0];
  if (!group) throw new Error('expected a source group');
  return group;
}

describe('parsed value model', () => {
  it('lists every leaf with its reference expression (FR-21, AC-21.1)', () => {
    const list = buildParsedValueList(fixture({ Name: 'Ada Lovelace', tags: ['a'] }, triggerBody), '');
    expect(firstSource(list).rows).toEqual([
      { label: 'Name', expression: "triggerBody()?['Name']", path: ['Name'] },
      { label: 'tags[0]', expression: "triggerBody()?['tags'][0]", path: ['tags', 0] },
    ]);
    expect(firstSource(list).emptyMessage).toBeNull();
    expect(list.hiddenCount).toBe(0);
  });

  it('treats an empty object or array as a leaf and nests deeply', () => {
    const list = buildParsedValueList(fixture({ a: { b: { c: 1 } }, empty: {}, none: [] }, triggerBody), '');
    expect(firstSource(list).rows.map((row) => row.label)).toEqual(['a.b.c', 'empty', 'none']);
  });

  it('explains an absent sample or root (AC-21.2)', () => {
    expect(buildParsedValueList([], '').emptyMessage)
      .toBe('Parse a sample in JSON reference');
    expect(firstSource(buildParsedValueList(fixture({ a: 1 }, null), '')).emptyMessage)
      .toBe('Set an action name in JSON reference');
  });

  it('filters by label, case-insensitively', () => {
    const list = buildParsedValueList(fixture({ Name: 1, other: 2 }, triggerBody), 'NAM');
    expect(firstSource(list).rows.map((row) => row.label)).toEqual(['Name']);
  });

  it('caps the rows and counts the rest (AC-21.3)', () => {
    const sample = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`key${i}`, i]));
    const list = buildParsedValueList(fixture(sample, triggerBody), '');
    expect(firstSource(list).rows).toHaveLength(MAX_PARSED_VALUE_ROWS);
    expect(list.hiddenCount).toBe(50);
  });

  it('says so when a filter matches nothing', () => {
    expect(firstSource(buildParsedValueList(fixture({ a: 1 }, triggerBody), 'zzz')).emptyMessage)
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

  it('groups each array item while preserving source references and search', () => {
    const sample = { body: { value: [{ Name: 'Ada' }, { Name: 'Grace' }] } };
    const root = { kind: 'outputs', actionName: 'Get items' } as const;
    const list = buildParsedValueList(fixture(sample, root), '');
    expect(firstSource(list)).toMatchObject({
      entries: [
        {
          kind: 'arrayItem', key: '["body","value",0]', label: 'body.value[0]',
          entries: [{
            kind: 'row',
            row: {
              label: 'body.value[0].Name',
              expression: "outputs('Get_items')?['body']?['value'][0]?['Name']",
              path: ['body', 'value', 0, 'Name'],
            },
          }],
        },
        { kind: 'arrayItem', key: '["body","value",1]', label: 'body.value[1]' },
      ],
    });
    expect(firstSource(buildParsedValueList(fixture(sample, root), '[1]'))).toMatchObject({
      entries: [{ kind: 'arrayItem', label: 'body.value[1]' }],
    });
    expect(firstSource(buildParsedValueList(fixture(sample, root), '')).entries).toHaveLength(2);
  });

  it('groups nested, primitive and empty array items without grouping string keys', () => {
    const list = buildParsedValueList(fixture({ rows: [[{ value: 1 }], 2, {}, []], '2024.[x]': { value: 3 } }, triggerBody), '');
    expect(firstSource(list).entries).toMatchObject([
      { kind: 'arrayItem', label: 'rows[0]', entries: [
        { kind: 'arrayItem', label: 'rows[0][0]', entries: [
          { kind: 'row', row: {
            label: 'rows[0][0].value', path: ['rows', 0, 0, 'value'],
            expression: "triggerBody()?['rows'][0][0]?['value']",
          } },
        ] },
      ] },
      ...[1, 2, 3].map((index) => ({
        kind: 'arrayItem', label: 'rows[' + index + ']', entries: [
          { kind: 'row', row: {
            path: ['rows', index], expression: "triggerBody()?['rows'][" + index + ']',
          } },
        ],
      })),
      { kind: 'row', row: { path: ['2024.[x]', 'value'] } },
    ]);
  });

  it('caps visible leaves globally before grouping items', () => {
    const item = Object.fromEntries(Array.from({ length: 125 }, (_, index) => ['key' + index, index]));
    const list = buildParsedValueList(fixture({ items: [item, item] }, triggerBody), '');
    expect(firstSource(list).rows).toHaveLength(MAX_PARSED_VALUE_ROWS);
    expect(list.hiddenCount).toBe(50);
    expect(firstSource(list).entries).toHaveLength(2);
    expect(firstSource(list).entries.map((entry) => entry.kind === 'arrayItem' ? entry.entries.length : -1))
      .toEqual([125, 75]);
  });

  it('filters before one shared cap and supports a null root', () => {
    const early = source('early',
      Array.from({ length: 150 }, () => ({ early: 1 })));
    const late = source('late',
      Array.from({ length: 100 }, () => ({ late: 2 })));

    const all = buildParsedValueList([early, late], '');
    expect(all.visibleCount).toBe(200);
    expect(all.hiddenCount).toBe(50);
    expect(all.sources.map((group) => group.matchingCount))
      .toEqual([150, 100]);

    const filtered = buildParsedValueList([early, late], 'late');
    expect(filtered.visibleCount).toBe(100);
    expect(filtered.sources[1].rows[0].expression)
      .toBe("body('late')[0]?['late']");

    const scalar = buildParsedValueList([source('null_source', null)], '');
    expect(scalar.sources[0].rows).toEqual([{
      label: '(root)',
      path: [],
      expression: "body('null_source')",
    }]);
  });

  it('excludes a source without an action name from the shared budget', () => {
    const unnamed = { ...source('unnamed', { x: 1 }), referenceRoot: null };
    const list = buildParsedValueList([unnamed, source('named', { y: 2 })], '');
    expect(list.visibleCount).toBe(1);
    expect(list.hiddenCount).toBe(0);
    expect(list.sources[0]).toMatchObject({
      matchingCount: 0,
      rows: [],
      emptyMessage: 'Set an action name in JSON reference',
    });
    expect(list.sources[1].rows).toHaveLength(1);
  });
});
