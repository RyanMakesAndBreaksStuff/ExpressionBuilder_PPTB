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

export interface ParsedValueList {
  rows: ParsedValueRow[];
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

export function buildParsedValueList(
  sample: unknown,
  root: PayloadReferenceRoot | null,
  search: string,
): ParsedValueList {
  if (sample === null || sample === undefined) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'Parse a sample in JSON reference' };
  }

  if (root === null) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'Set an action name in JSON reference' };
  }

  const all: ParsedValueRow[] = [];
  walk(sample, [], '', root, all);

  const needle = search.trim().toLowerCase();
  const matched = needle === ''
    ? all
    : all.filter((row) => row.label.toLowerCase().includes(needle));

  if (matched.length === 0) {
    return { rows: [], hiddenCount: 0, emptyMessage: 'No paths match this search' };
  }

  return {
    rows: matched.slice(0, MAX_PARSED_VALUE_ROWS),
    hiddenCount: Math.max(0, matched.length - MAX_PARSED_VALUE_ROWS),
    emptyMessage: null,
  };
}
