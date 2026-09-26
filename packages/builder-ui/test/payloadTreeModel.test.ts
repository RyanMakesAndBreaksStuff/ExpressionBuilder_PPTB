import { describe, expect, it } from 'vitest';
import { pathKey } from '../src/importExport/jsonPayload';
import {
  ARRAY_PAGE_SIZE,
  OBJECT_PAGE_SIZE,
  ROOT_KEY,
  buildVisibleRows,
  firstHiddenChildKey,
  previewValue,
  selectionSummary,
  type PayloadMoreRow,
} from '../src/workbench/payloadTreeModel';
import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

const a1 = JSON.parse(fixtureA1) as unknown;
const none = new Set<string>();

describe('buildVisibleRows', () => {
  it('shows only the root row until the root is expanded', () => {
    const rows = buildVisibleRows(a1, none, none);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: ROOT_KEY, labelKind: 'root', level: 1, posInSet: 1, setSize: 1, expandable: true, expanded: false });
  });

  it('lists members in parser order with level, position and set size', () => {
    const rows = buildVisibleRows(a1, new Set([ROOT_KEY, pathKey(['body'])]), none);

    expect(rows.map((row) => (row.kind === 'value' ? row.label : 'more'))).toEqual([
      '',
      'statusCode',
      'headers',
      'body',
      'value',
      '@odata.nextLink',
    ]);
    expect(rows[3]).toMatchObject({ level: 2, posInSet: 3, setSize: 3, type: 'object', preview: '{2}', expanded: true });
    expect(rows[4]).toMatchObject({ level: 3, posInSet: 1, setSize: 2, type: 'array', preview: '2 items', expanded: false });
    expect(rows[5]).toMatchObject({ type: 'null', preview: 'null', expandable: false });
  });

  it('labels array elements [n] and previews each type (FR-031, FR-032)', () => {
    const expanded = new Set([ROOT_KEY, pathKey(['body']), pathKey(['body', 'value']), pathKey(['body', 'value', 0])]);
    const rows = buildVisibleRows(a1, expanded, none);
    const first = rows.find((row) => row.key === pathKey(['body', 'value', 0]));
    const title = rows.find((row) => row.key === pathKey(['body', 'value', 0, 'Title']));
    const urgent = rows.find((row) => row.key === pathKey(['body', 'value', 0, 'Urgent']));

    expect(first).toMatchObject({ label: '[0]', labelKind: 'index', preview: '{6}' });
    expect(title).toMatchObject({ label: 'Title', type: 'string', preview: '"Laptop refresh"' });
    expect(urgent).toMatchObject({ type: 'boolean', preview: 'false' });
  });

  it('treats empty containers as selectable leaves without a chevron', () => {
    const rows = buildVisibleRows({ list: [], map: {} }, new Set([ROOT_KEY, pathKey(['list']), pathKey(['map'])]), none);

    expect(rows.slice(1)).toMatchObject([
      { label: 'list', preview: '0 items', expandable: false, expanded: false },
      { label: 'map', preview: '{0}', expandable: false, expanded: false },
    ]);
  });

  it('pages an array after 20 elements until "Show N more" is used (FR-035)', () => {
    const list = Array.from({ length: 45 }, (_, index) => index);
    const paged = buildVisibleRows(list, new Set([ROOT_KEY]), none);
    const more = paged.at(-1) as PayloadMoreRow;

    expect(ARRAY_PAGE_SIZE).toBe(20);
    expect(paged).toHaveLength(1 + 20 + 1);
    expect(more).toMatchObject({ kind: 'more', parentKey: ROOT_KEY, hiddenCount: 25, level: 2, posInSet: 21, setSize: 21 });
    expect(firstHiddenChildKey(list, more)).toBe(pathKey([20]));
    expect(buildVisibleRows(list, new Set([ROOT_KEY]), new Set([ROOT_KEY]))).toHaveLength(1 + 45);
  });

  it('pages only very wide objects (FR-039)', () => {
    const wide = Object.fromEntries(Array.from({ length: OBJECT_PAGE_SIZE + 3 }, (_, index) => [`k${index}`, index]));
    const rows = buildVisibleRows(wide, new Set([ROOT_KEY]), none);
    const more = rows.at(-1) as PayloadMoreRow;

    expect(rows).toHaveLength(1 + OBJECT_PAGE_SIZE + 1);
    expect(more.hiddenCount).toBe(3);
    expect(firstHiddenChildKey(wide, more)).toBe(pathKey([`k${OBJECT_PAGE_SIZE}`]));
    expect(buildVisibleRows({ a: 1, b: 2 }, new Set([ROOT_KEY]), none)).toHaveLength(3);
  });

  it('gives a key "0" and an index 0 different rows (CON-007)', () => {
    const rows = buildVisibleRows({ '0': ['zero'] }, new Set([ROOT_KEY, pathKey(['0'])]), none);

    expect(rows.map((row) => row.key)).toEqual([ROOT_KEY, pathKey(['0']), pathKey(['0', 0])]);
  });

  it('shows a top-level primitive as the root row alone', () => {
    expect(buildVisibleRows(42, new Set([ROOT_KEY]), none)).toMatchObject([{ key: ROOT_KEY, type: 'number', preview: '42', expandable: false }]);
  });
});

describe('previews and summaries', () => {
  it('previews one item in the singular and cuts long strings', () => {
    expect(previewValue(['a'])).toBe('1 item');
    expect(previewValue('x'.repeat(500))).toHaveLength(120);
    expect(previewValue('x'.repeat(500)).endsWith('…')).toBe(true);
  });

  it('summarises a selection as its type, plus the JSON value for leaves (FR-043)', () => {
    expect(selectionSummary('dana@contoso.com')).toBe('string · "dana@contoso.com"');
    expect(selectionSummary(5000)).toBe('number · 5000');
    expect(selectionSummary(false)).toBe('boolean · false');
    expect(selectionSummary(null)).toBe('null');
    expect(selectionSummary({})).toBe('object');
    expect(selectionSummary([])).toBe('array');
  });
});
