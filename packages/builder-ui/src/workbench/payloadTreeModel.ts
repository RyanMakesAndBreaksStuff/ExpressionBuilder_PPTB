import type { PayloadPath } from '@ryanmakes/eb_engine';
import {
  isJsonObject,
  keyToPath,
  pathKey,
  payloadValueType,
  valueAtPath,
  type PayloadValueType,
} from '../importExport/jsonPayload';

/** Arrays show this many elements, then a "Show N more" row (FR-035). */
export const ARRAY_PAGE_SIZE = 20;

/**
 * Very wide objects page the same way (FR-039). Building 10,000 plain rows took
 * 1.8 s of DOM work in Chromium, far over the 1 s budget for expanding one node;
 * 500 rows stay well inside the 200 ms target. The SC-006 benchmark confirms it.
 */
export const OBJECT_PAGE_SIZE = 500;

export const ROOT_KEY = pathKey([]);

/** Previews longer than this are cut in JS as well as by CSS, so a huge string never reaches the DOM. */
const PREVIEW_MAX_LENGTH = 120;

export interface PayloadValueRow {
  kind: 'value';
  key: string;
  path: PayloadPath;
  parentKey: string | null;
  /** aria-level: the root row is level 1. */
  level: number;
  posInSet: number;
  setSize: number;
  /** The object key or `[index]`; empty for the root row, whose label is the live root expression. */
  label: string;
  labelKind: 'root' | 'key' | 'index';
  type: PayloadValueType;
  preview: string;
  expandable: boolean;
  expanded: boolean;
}

export interface PayloadMoreRow {
  kind: 'more';
  key: string;
  parentKey: string;
  level: number;
  posInSet: number;
  setSize: number;
  hiddenCount: number;
}

export type PayloadTreeRow = PayloadValueRow | PayloadMoreRow;

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** One-line preview (FR-032). */
export function previewValue(value: unknown): string {
  if (Array.isArray(value)) return countLabel(value.length, 'item');
  if (isJsonObject(value)) return `{${Object.keys(value).length}}`;
  if (typeof value === 'string') return truncate(JSON.stringify(value));
  return String(value);
}

/** Reference card header: the type, then the JSON value for strings, numbers and booleans (FR-043). */
export function selectionSummary(value: unknown): string {
  const type = payloadValueType(value);
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return `${type} · ${truncate(JSON.stringify(value))}`;
  }
  return type;
}

/** Breadcrumb and tree label for one path segment; the empty key shows as "". */
export function segmentLabel(segment: string | number): string {
  if (typeof segment === 'number') return `[${segment}]`;
  return segment === '' ? '""' : segment;
}

/**
 * The rows a flat APG tree renders: every value whose ancestors are all
 * expanded, in document order, plus one "Show N more" row for each expanded
 * container that still hides children.
 */
export function buildVisibleRows(
  root: unknown,
  expanded: ReadonlySet<string>,
  showAll: ReadonlySet<string>,
): PayloadTreeRow[] {
  const rows: PayloadTreeRow[] = [];

  const visit = (
    value: unknown,
    path: PayloadPath,
    parentKey: string | null,
    level: number,
    posInSet: number,
    setSize: number,
  ): void => {
    const key = pathKey(path);
    const keys = isJsonObject(value) ? Object.keys(value) : null;
    const childCount = Array.isArray(value) ? value.length : (keys?.length ?? 0);
    const isExpanded = childCount > 0 && expanded.has(key);
    const last = path.at(-1);

    rows.push({
      kind: 'value',
      key,
      path,
      parentKey,
      level,
      posInSet,
      setSize,
      label: last === undefined ? '' : segmentLabel(last),
      labelKind: last === undefined ? 'root' : typeof last === 'number' ? 'index' : 'key',
      type: payloadValueType(value),
      preview: previewValue(value),
      expandable: childCount > 0,
      expanded: isExpanded,
    });
    if (!isExpanded) return;

    const pageSize = Array.isArray(value) ? ARRAY_PAGE_SIZE : OBJECT_PAGE_SIZE;
    const shownCount = showAll.has(key) ? childCount : Math.min(childCount, pageSize);
    const hiddenCount = childCount - shownCount;
    const visibleSetSize = shownCount + (hiddenCount > 0 ? 1 : 0);

    for (let index = 0; index < shownCount; index += 1) {
      if (keys === null) {
        visit((value as unknown[])[index], [...path, index], key, level + 1, index + 1, visibleSetSize);
      } else {
        const member = keys[index];
        visit((value as Record<string, unknown>)[member], [...path, member], key, level + 1, index + 1, visibleSetSize);
      }
    }
    if (hiddenCount > 0) {
      rows.push({
        kind: 'more',
        key: `${key}+more`,
        parentKey: key,
        level: level + 1,
        posInSet: visibleSetSize,
        setSize: visibleSetSize,
        hiddenCount,
      });
    }
  };

  visit(root, [], null, 1, 1, 1);
  return rows;
}

/** The first child a "Show N more" row reveals, which takes focus after it is activated. */
export function firstHiddenChildKey(root: unknown, row: PayloadMoreRow): string | null {
  const parentPath = keyToPath(row.parentKey);
  const parent = valueAtPath(root, parentPath);
  if (!parent.found) return null;
  const index = row.posInSet - 1;
  if (Array.isArray(parent.value)) return pathKey([...parentPath, index]);
  if (isJsonObject(parent.value)) {
    const member = Object.keys(parent.value)[index];
    return member === undefined ? null : pathKey([...parentPath, member]);
  }
  return null;
}

function truncate(text: string): string {
  return text.length > PREVIEW_MAX_LENGTH ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : text;
}
