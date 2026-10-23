import { formatPayloadReference, type PayloadPath } from '@ryanmakes/eb_engine';
import type { ParsedValueSource } from './jsonPayloadSession';
import { collectPayloadLeaves } from './payloadTreeModel';

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

export interface ParsedValueGroup {
  id: string;
  label: string;
  rootCaption: string;
  matchingCount: number;
  rows: ParsedValueRow[];
  entries: ParsedValueEntry[];
  emptyMessage: string | null;
}

export interface ParsedValueList {
  sources: ParsedValueGroup[];
  visibleCount: number;
  /** Matching leaves past the shared cap. */
  hiddenCount: number;
  /** Set when there are no sources, explaining why. */
  emptyMessage: string | null;
}

export const MAX_PARSED_VALUE_ROWS = 200;

/** Expansion key of the "Parsed Value" group shown while no payload is parsed. */
export const PARSED_VALUE_PLACEHOLDER_ID = 'parsed-value';

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
  sources: readonly ParsedValueSource[],
  search: string,
): ParsedValueList {
  const needle = search.trim().toLowerCase();
  let remaining = MAX_PARSED_VALUE_ROWS;
  let matchingCount = 0;
  let visibleCount = 0;

  const groups = sources.map<ParsedValueGroup>((source) => {
    if (source.referenceRoot === null) {
      return {
        id: source.id,
        label: source.label,
        rootCaption: source.rootCaption,
        matchingCount: 0,
        rows: [],
        entries: [],
        emptyMessage: 'Set an action name in JSON reference',
      };
    }

    const root = source.referenceRoot;
    const matched = collectPayloadLeaves(source.parsed.value)
      .filter((leaf) => needle === '' ||
        leaf.label.toLowerCase().includes(needle));
    const rows = matched.slice(0, remaining).map((leaf) => ({
      label: leaf.label,
      path: leaf.path,
      expression: formatPayloadReference({ root, path: leaf.path }),
    }));

    remaining -= rows.length;
    matchingCount += matched.length;
    visibleCount += rows.length;
    return {
      id: source.id,
      label: source.label,
      rootCaption: source.rootCaption,
      matchingCount: matched.length,
      rows,
      entries: buildParsedValueEntries(rows),
      emptyMessage: matched.length === 0
        ? 'No paths match this search'
        : null,
    };
  });

  return {
    sources: groups,
    visibleCount,
    hiddenCount: matchingCount - visibleCount,
    emptyMessage: sources.length === 0
      ? 'Parse a sample in JSON reference'
      : null,
  };
}
