import { findFunction } from './functionCatalog';

export type ParsedArgument =
  | { kind: 'empty' }
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'null' }
  /** A payload-output call, or any call narrowed by an accessor. */
  | { kind: 'reference'; name: string }
  | { kind: 'call'; name: string };

export type ParseArgumentResult =
  | { ok: true; value: ParsedArgument }
  | { ok: false; message: string };

/** Calls addressing flow data; these name an action, so arity is not ours to check. */
const PAYLOAD_ROOTS = new Set([
  'triggerBody', 'triggerOutputs', 'trigger', 'outputs', 'body', 'actionBody',
  'actionOutputs', 'item', 'items', 'variables', 'parameters',
]);

/** A text field is a trust boundary: cap nesting so no input can exhaust the stack. */
const MAX_DEPTH = 32;

interface Cursor {
  text: string;
  pos: number;
  depth: number;
}

const NUMBER = /-?\d+(?:\.\d+)?/y;
const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/y;

export function parseArgument(text: string): ParseArgumentResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: { kind: 'empty' } };

  const cursor: Cursor = { text: trimmed, pos: 0, depth: 0 };
  let value: ParsedArgument;
  try {
    value = readValue(cursor);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not read this value.',
    };
  }

  skipSpace(cursor);
  if (cursor.pos < cursor.text.length) {
    return { ok: false, message: `Unexpected "${cursor.text.slice(cursor.pos)}" after the value.` };
  }
  return { ok: true, value };
}

function skipSpace(cursor: Cursor): void {
  while (cursor.pos < cursor.text.length && /\s/.test(cursor.text[cursor.pos])) cursor.pos += 1;
}

function readValue(cursor: Cursor): ParsedArgument {
  if (cursor.depth > MAX_DEPTH) throw new Error('This expression nests too deeply.');
  skipSpace(cursor);
  const char = cursor.text[cursor.pos];
  if (char === undefined) throw new Error('The value is incomplete.');
  if (char === "'") {
    readString(cursor);
    return { kind: 'string' };
  }
  if (char === '-' || (char >= '0' && char <= '9')) {
    readNumber(cursor);
    return { kind: 'number' };
  }
  if (/[A-Za-z_]/.test(char)) return readNamedValue(cursor);
  throw new Error(`"${char}" cannot start a value. Wrap text in single quotes.`);
}

function readNamedValue(cursor: Cursor): ParsedArgument {
  const name = readIdentifier(cursor);
  if (cursor.text[cursor.pos] !== '(') {
    if (name === 'true' || name === 'false') return { kind: 'boolean' };
    if (name === 'null') return { kind: 'null' };
    throw new Error(`Wrap text in single quotes: '${name}'.`);
  }

  const argCount = readCallArguments(cursor);
  checkArity(name, argCount);
  const narrowed = readAccessors(cursor);
  if (PAYLOAD_ROOTS.has(name) || narrowed) return { kind: 'reference', name };
  return { kind: 'call', name };
}

function checkArity(name: string, count: number): void {
  if (PAYLOAD_ROOTS.has(name)) return;
  const fn = findFunction(name);
  if (fn === undefined) throw new Error(`"${name}" is not a known function.`);

  const required = fn.args.filter((arg) => arg.required).length;
  if (count < required) throw new Error(`${name} needs at least ${plural(required)}.`);
  if (!fn.args.some((arg) => arg.variadic) && count > fn.args.length) {
    throw new Error(`${name} takes at most ${plural(fn.args.length)}.`);
  }
}

function plural(count: number): string {
  return `${count} argument${count === 1 ? '' : 's'}`;
}

function readIdentifier(cursor: Cursor): string {
  IDENTIFIER.lastIndex = cursor.pos;
  const match = IDENTIFIER.exec(cursor.text);
  if (match === null) throw new Error('A name was expected here.');
  cursor.pos = IDENTIFIER.lastIndex;
  return match[0];
}

function readNumber(cursor: Cursor): void {
  NUMBER.lastIndex = cursor.pos;
  const match = NUMBER.exec(cursor.text);
  if (match === null) throw new Error('This is not a valid number.');
  cursor.pos = NUMBER.lastIndex;
}

/** Consumes a quoted literal; a doubled `''` inside stays part of the string. */
function readString(cursor: Cursor): void {
  let from = cursor.pos + 1;
  for (;;) {
    const quote = cursor.text.indexOf("'", from);
    if (quote === -1) throw new Error('This text is missing its closing quote.');
    if (cursor.text[quote + 1] === "'") {
      from = quote + 2;
      continue;
    }
    cursor.pos = quote + 1;
    return;
  }
}

/** Consumes `( … )` and returns how many arguments it held. */
function readCallArguments(cursor: Cursor): number {
  cursor.pos += 1;
  cursor.depth += 1;
  skipSpace(cursor);
  if (cursor.text[cursor.pos] === ')') {
    cursor.pos += 1;
    cursor.depth -= 1;
    return 0;
  }

  let count = 0;
  for (;;) {
    readValue(cursor);
    count += 1;
    skipSpace(cursor);
    const char = cursor.text[cursor.pos];
    if (char === ',') {
      cursor.pos += 1;
      continue;
    }
    if (char === ')') {
      cursor.pos += 1;
      cursor.depth -= 1;
      return count;
    }
    throw new Error('The value is incomplete.');
  }
}

/** Consumes any run of `?['key']`, `['key']` or `[0]`; true when one was read. */
function readAccessors(cursor: Cursor): boolean {
  let found = false;
  for (;;) {
    let pos = cursor.pos;
    if (cursor.text[pos] === '?') pos += 1;
    if (cursor.text[pos] !== '[') return found;
    cursor.pos = pos + 1;

    skipSpace(cursor);
    const char = cursor.text[cursor.pos];
    if (char === "'") readString(cursor);
    else if (char !== undefined && char >= '0' && char <= '9') readNumber(cursor);
    else throw new Error("An accessor needs a quoted key or an index, e.g. ?['Name'].");

    skipSpace(cursor);
    if (cursor.text[cursor.pos] !== ']') throw new Error('An accessor is missing its closing "]".');
    cursor.pos += 1;
    found = true;
  }
}