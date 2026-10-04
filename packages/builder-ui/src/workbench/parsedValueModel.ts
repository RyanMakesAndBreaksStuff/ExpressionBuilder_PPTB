import {
  formatPayloadReference,
  type PayloadPath,
  type PayloadReferenceRoot,
} from '@ryanmakes/eb_engine';
import { isJsonObject } from '../importExport/jsonPayload';

export interface ParsedValueRow {
  /** Dotted/bracketed path, e.g. `Name`, `tags[0]`, `a.b.c`. */
  label: string;
  /** Bare reference expression, identical to what JSON reference copies. */
  expression: string;
  path: PayloadPath;
}

export type ParsedValueEntry =
  | { kind: 'row'; row: ParsedValueRow }
  | {
      kind: 'arrayItem';
      key: string;
      label: string;
      entries: ParsedValueEntry[];
    };

export interface ParsedValueList {
  rows: ParsedValueRow[];
  entries: ParsedValueEntry[];
  /** Matching leaves past the cap. */
  hiddenCount: number;
  /** Set when `rows` is empty, explaining why. */
  emptyMessage: string | null;
}

export const MAX_PARSED_VALUE_ROWS = 200;

/**
 * A sample is capped at 10,000 values upstream (MAX_VALUE_COUNT), so a full
 * walk is cheap; the row cap is about how many are useful to show, not about
 * the cost of finding them.
 */
function walk(
  value: unknown,
  path: PayloadPath,
  label: string,
  root: PayloadReferenceRoot,
  out: ParsedValueRow[],
): void {
  const leaf = () => {
    out.push({ label, expression: formatPayloadReference({ root, path }), path });
  };

  if (isJsonObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return leaf();
    for (const key of keys) {
      walk(value[key], [...path, key], label === '' ? key : `${label}.${key}`, root, out);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return leaf();
    value.forEach((item, index) => {
      walk(item, [...path, index], `${label}[${index}]`, root, out);
    });
    return;
  }

  leaf();
}

function parsedPathLabel(path: PayloadPath): string {
  return path.reduce<string>(
    (label, segment) => typeof segment === 'number'
      ? label + '[' + segment + ']'
      : label === '' ? segment : label + '.' + segment,
    '',
  );
}

function buildParsedValueEntries(
  rows: readonly ParsedValueRow[],
  parentPath: PayloadPath = [],
): ParsedValueEntry[] {
  type PendingItem = {
    kind: 'pendingArrayItem';
    key: string;
    label: string;
    path: PayloadPath;
    rows: ParsedValueRow[];
  };
  const ordered: Array<ParsedValueEntry | PendingItem> = [];
  const items = new Map<string, PendingItem>();

  for (const row of rows) {
    const index = row.path.findIndex(
      (segment, position) => position >= parentPath.length && typeof segment === 'number',
    );
    if (index === -1) {
      ordered.push({ kind: 'row', row });
      continue;
    }
    const path = row.path.slice(0, index + 1);
    const key = JSON.stringify(path);
    let item = items.get(key);
    if (!item) {
      item = { kind: 'pendingArrayItem', key, label: parsedPathLabel(path), path, rows: [] };
      items.set(key, item);
      ordered.push(item);
    }
    item.rows.push(row);
  }
  return ordered.map<ParsedValueEntry>((entry) => entry.kind === 'pendingArrayItem'
    ? {
        kind: 'arrayItem', key: entry.key, label: entry.label,
        entries: buildParsedValueEntries(entry.rows, entry.path),
      }
    : entry);
}

export function buildParsedValueList(
  sample: unknown,
  root: PayloadReferenceRoot | null,
  search: string,
): ParsedValueList {
  if (sample === null || sample === undefined) {
    return { rows: [], entries: [], hiddenCount: 0, emptyMessage: 'Parse a sample in JSON reference' };
  }

  if (root === null) {
    return { rows: [], entries: [], hiddenCount: 0, emptyMessage: 'Set an action name in JSON reference' };
  }

  const all: ParsedValueRow[] = [];
  walk(sample, [], '', root, all);

  const needle = search.trim().toLowerCase();
  const matched = needle === ''
    ? all
    : all.filter((row) => row.label.toLowerCase().includes(needle));

  if (matched.length === 0) {
    return { rows: [], entries: [], hiddenCount: 0, emptyMessage: 'No paths match this search' };
  }

  const rows = matched.slice(0, MAX_PARSED_VALUE_ROWS);
  return {
    rows,
    entries: buildParsedValueEntries(rows),
    hiddenCount: Math.max(0, matched.length - MAX_PARSED_VALUE_ROWS),
    emptyMessage: null,
  };
}
