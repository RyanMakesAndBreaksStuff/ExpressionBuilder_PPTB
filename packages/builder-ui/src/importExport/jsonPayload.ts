import type { PayloadPath } from '@ryanmakes/eb_engine';

/**
 * Provisional limits (spec FR-024). The SC-006 benchmark confirms or changes
 * them before release; the messages below are built from these values so a
 * change here updates what the user reads.
 */
export const MAX_SAMPLE_BYTES = 1_048_576;
export const MAX_VALUE_COUNT = 10_000;
export const MAX_NESTING_DEPTH = 64;

export const PARSE_MESSAGES = {
  empty: 'Paste a sample before parsing.',
  tooLarge: `Sample is larger than ${MAX_SAMPLE_BYTES / 1_048_576} MiB. Trim it to the part you need.`,
  invalidPrefix: 'Not valid JSON: ',
  tooManyValues: `Sample has more than ${MAX_VALUE_COUNT.toLocaleString('en-US')} values. Trim it to the part you need.`,
  tooDeep: `Sample is nested deeper than ${MAX_NESTING_DEPTH} levels.`,
} as const;

export type PayloadValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface ParsedPayload {
  /** What JSON.parse returned for `text`. */
  value: unknown;
  /** The root plus every object, array and leaf inside it. */
  valueCount: number;
  /** The exact text that was parsed; the stale-sample status compares against it. */
  text: string;
}

export type ParsePayloadResult =
  | { ok: true; payload: ParsedPayload }
  | { ok: false; message: string };

/**
 * Runs the spec's checks in order and stops at the first failure (FR-021):
 * empty, size, syntax, value count, depth. Parsing is the platform's own
 * JSON.parse, so comments, trailing commas and single quotes are rejected and
 * a repeated key keeps its last value (FR-023).
 */
export function parsePayload(text: string): ParsePayloadResult {
  if (text.trim() === '') return { ok: false, message: PARSE_MESSAGES.empty };
  if (utf8ByteLength(text) > MAX_SAMPLE_BYTES) return { ok: false, message: PARSE_MESSAGES.tooLarge };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${PARSE_MESSAGES.invalidPrefix}${reason}` };
  }

  const valueCount = countValues(value);
  if (valueCount === null) return { ok: false, message: PARSE_MESSAGES.tooManyValues };
  if (exceedsDepth(value)) return { ok: false, message: PARSE_MESSAGES.tooDeep };

  return { ok: true, payload: { value, valueCount, text } };
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Compare validated JSON data independently of object-key order and source formatting. */
export function payloadValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => payloadValuesEqual(value, right[index]));
  }
  if (!isJsonObject(left) || !isJsonObject(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every((key) => Object.hasOwn(right, key)
      && payloadValuesEqual(left[key], right[key]));
}

export function payloadValueType(value: unknown): PayloadValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'object';
}

/**
 * Collision-free row identity (CON-007): the path keeps its types, so the key
 * "0" and the index 0 produce different identities, and no key can be confused
 * with a separator.
 */
export function pathKey(path: PayloadPath): string {
  return JSON.stringify(path);
}

export function keyToPath(key: string): PayloadPath {
  return JSON.parse(key) as PayloadPath;
}

export type PathLookup = { found: true; value: unknown } | { found: false };

/**
 * Follows own members and in-range array elements only, so a key such as
 * "constructor" never resolves through the prototype.
 */
export function valueAtPath(root: unknown, path: PayloadPath): PathLookup {
  let current = root;
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || !Number.isInteger(segment) || segment < 0 || segment >= current.length) {
        return { found: false };
      }
      current = current[segment];
    } else {
      if (!isJsonObject(current) || !Object.hasOwn(current, segment)) return { found: false };
      current = current[segment];
    }
  }
  return { found: true, value: current };
}

function childValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isJsonObject(value)) return Object.values(value);
  return [];
}

/** Every UTF-16 code unit needs at least one UTF-8 byte, so long text is rejected unencoded. */
function utf8ByteLength(text: string): number {
  if (text.length > MAX_SAMPLE_BYTES) return text.length;
  return new TextEncoder().encode(text).length;
}

/** Iterative so deep samples cannot overflow the stack; stops once past the limit (FR-022). */
function countValues(root: unknown): number | null {
  let count = 1;
  const pending: unknown[] = [root];
  while (pending.length > 0) {
    const children = childValues(pending.pop());
    count += children.length;
    if (count > MAX_VALUE_COUNT) return null;
    for (const child of children) pending.push(child);
  }
  return count;
}

function exceedsDepth(root: unknown): boolean {
  const pending: Array<[unknown, number]> = [[root, 0]];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const [value, depth] = next;
    if (depth > MAX_NESTING_DEPTH) return true;
    for (const child of childValues(value)) pending.push([child, depth + 1]);
  }
  return false;
}
