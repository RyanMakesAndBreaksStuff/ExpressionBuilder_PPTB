import { describe, expect, it } from 'vitest';
import {
  MAX_NESTING_DEPTH,
  MAX_SAMPLE_BYTES,
  MAX_VALUE_COUNT,
  PARSE_MESSAGES,
  keyToPath,
  parsePayload,
  pathKey,
  payloadValueType,
  valueAtPath,
} from '../src/importExport/jsonPayload';
import { fixtureA1 } from './fixtures/jsonReferenceFixtures';

function parseError(text: string): string {
  const result = parsePayload(text);
  if (result.ok) throw new Error('expected the parse to fail');
  return result.message;
}

function builtInParserMessage(text: string): string {
  try {
    JSON.parse(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected JSON.parse to throw');
}

const nestedArrays = (depth: number) => '['.repeat(depth) + ']'.repeat(depth);

describe('parsePayload', () => {
  it('counts fixture A1 as 25 values and keeps the parsed text', () => {
    const result = parsePayload(fixtureA1);

    expect(result).toEqual({ ok: true, payload: { value: JSON.parse(fixtureA1), valueCount: 25, text: fixtureA1 } });
  });

  it('rejects an empty or whitespace-only sample', () => {
    expect(parseError('')).toBe('Paste a sample before parsing.');
    expect(parseError(' \n\t ')).toBe('Paste a sample before parsing.');
  });

  it('measures the size in UTF-8 bytes and allows exactly 1 MiB', () => {
    expect(MAX_SAMPLE_BYTES).toBe(1_048_576);
    expect(parsePayload(JSON.stringify('x'.repeat(MAX_SAMPLE_BYTES - 2))).ok).toBe(true);
    expect(parseError(JSON.stringify('x'.repeat(MAX_SAMPLE_BYTES - 1)))).toBe(
      'Sample is larger than 1 MiB. Trim it to the part you need.',
    );
    // 524,290 UTF-16 code units, but 1,048,578 UTF-8 bytes.
    expect(parseError(`"${'é'.repeat(524_288)}"`)).toBe(PARSE_MESSAGES.tooLarge);
  });

  it('checks the size before the syntax', () => {
    expect(parseError(`{${' '.repeat(MAX_SAMPLE_BYTES)}`)).toBe(PARSE_MESSAGES.tooLarge);
  });

  it("reports the built-in parser's message for invalid JSON", () => {
    for (const text of ['{"a": 1,}', "{'a': 1}", '{"a": 1} // note', '{"a": ']) {
      expect(parseError(text)).toBe(`Not valid JSON: ${builtInParserMessage(text)}`);
    }
  });

  it('allows exactly 10,000 values and rejects 10,001', () => {
    expect(MAX_VALUE_COUNT).toBe(10_000);
    expect(parsePayload(JSON.stringify(new Array(9_999).fill(0)))).toMatchObject({
      ok: true,
      payload: { valueCount: 10_000 },
    });
    expect(parseError(JSON.stringify(new Array(10_000).fill(0)))).toBe(
      'Sample has more than 10,000 values. Trim it to the part you need.',
    );
  });

  it('allows 64 levels of nesting and rejects 65', () => {
    expect(MAX_NESTING_DEPTH).toBe(64);
    expect(parsePayload(nestedArrays(65))).toMatchObject({ ok: true, payload: { valueCount: 65 } });
    expect(parseError(nestedArrays(66))).toBe('Sample is nested deeper than 64 levels.');
  });

  it('checks the value count before the depth, without overflowing the stack', () => {
    expect(parseError(nestedArrays(10_001))).toBe(PARSE_MESSAGES.tooManyValues);
  });

  it('keeps the last value of a repeated key, and JSON inside a string stays a string', () => {
    const result = parsePayload('{"a": 1, "a": 2, "raw": "{\\"b\\": 3}"}');

    expect(result).toMatchObject({ ok: true, payload: { value: { a: 2, raw: '{"b": 3}' }, valueCount: 3 } });
  });

  it("keeps built-in object names as ordinary keys, in the parser's order", () => {
    const result = parsePayload('{"b": 1, "2": 2, "__proto__": 3, "constructor": 4, "hasOwnProperty": 5, "1": 6}');
    if (!result.ok) throw new Error(result.message);

    expect(Object.keys(result.payload.value as object)).toEqual(['1', '2', 'b', '__proto__', 'constructor', 'hasOwnProperty']);
    expect(valueAtPath(result.payload.value, ['__proto__'])).toEqual({ found: true, value: 3 });
  });

  it('accepts a top-level primitive as a single value', () => {
    expect(parsePayload('"text"')).toMatchObject({ ok: true, payload: { value: 'text', valueCount: 1 } });
    expect(parsePayload('null')).toMatchObject({ ok: true, payload: { value: null, valueCount: 1 } });
  });
});

describe('payload paths', () => {
  it('gives the key "0" and the index 0 different identities', () => {
    expect(pathKey(['0'])).not.toBe(pathKey([0]));
    expect(pathKey(['a.b'])).not.toBe(pathKey(['a', 'b']));
  });

  it('round-trips a path through its key', () => {
    const path = ['body', 0, "O'Brien", '', '[x]'];

    expect(keyToPath(pathKey(path))).toEqual(path);
  });

  it('follows own members and in-range elements only', () => {
    expect(valueAtPath({}, ['constructor'])).toEqual({ found: false });
    expect(valueAtPath({ '0': 'key' }, [0])).toEqual({ found: false });
    expect(valueAtPath(['element'], ['0'])).toEqual({ found: false });
    expect(valueAtPath(['element'], [1])).toEqual({ found: false });
    expect(valueAtPath({ a: [null] }, ['a', 0])).toEqual({ found: true, value: null });
    expect(valueAtPath('leaf', [])).toEqual({ found: true, value: 'leaf' });
  });

  it('names the six JSON types', () => {
    expect([null, [], {}, 's', 1, true].map(payloadValueType)).toEqual([
      'null',
      'array',
      'object',
      'string',
      'number',
      'boolean',
    ]);
  });
});
