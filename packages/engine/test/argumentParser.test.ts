import { describe, expect, it } from 'vitest';
import { parseArgument } from '../src/argumentParser';

function kindOf(text: string) {
  const result = parseArgument(text);
  if (!result.ok) throw new Error(`expected ${text} to parse: ${result.message}`);
  return result.value.kind;
}

function messageOf(text: string) {
  const result = parseArgument(text);
  if (result.ok) throw new Error(`expected ${text} to fail`);
  return result.message;
}

describe('parseArgument', () => {
  it('reads the shapes the screen produces (FR-13, AC-13.1)', () => {
    expect(kindOf('')).toBe('empty');
    expect(kindOf('   ')).toBe('empty');
    expect(kindOf("' - '")).toBe('string');
    expect(kindOf("'O''Brien'")).toBe('string');
    expect(kindOf('42')).toBe('number');
    expect(kindOf('-1.5')).toBe('number');
    expect(kindOf('true')).toBe('boolean');
    expect(kindOf('null')).toBe('null');
    expect(kindOf('utcNow()')).toBe('call');
    expect(kindOf("toUpper('a')")).toBe('call');
    expect(kindOf("triggerBody()?['Name']")).toBe('reference');
    expect(kindOf('triggerBody()')).toBe('reference');
    expect(kindOf("outputs('Get_items')?['body']?['value'][0]")).toBe('reference');
    expect(kindOf('item()')).toBe('reference');
    // What the JSON reference items() block copies once the loop plan lands.
    expect(kindOf("items('Apply_to_each')?['Requester']?['Email']")).toBe('reference');
  });

  it('names the nested call so the breadcrumb can label it', () => {
    const result = parseArgument("concat('a', 'b')");
    expect(result.ok && result.value).toMatchObject({ kind: 'call', name: 'concat' });
  });

  it('rejects bare text with a single-quotes hint (D8, AC-13.1)', () => {
    expect(messageOf('Ada')).toBe("Wrap text in single quotes: 'Ada'.");
  });

  it('rejects incomplete and malformed input (AC-13.1)', () => {
    expect(messageOf('toUpper(')).toBe('The value is incomplete.');
    expect(messageOf("'unclosed")).toBe('This text is missing its closing quote.');
    expect(messageOf("triggerBody()?['Name'")).toBe('An accessor is missing its closing "]".');
    expect(messageOf("toUpper('a')extra")).toBe('Unexpected "extra" after the value.');
    expect(messageOf('triggerBody()?[Name]'))
      .toBe("An accessor needs a quoted key or an index, e.g. ?['Name'].");
  });

  it('checks arity for catalog functions, not for payload roots', () => {
    expect(messageOf('toUpper()')).toBe('toUpper needs at least 1 argument.');
    expect(messageOf("substring('a', 1, 2, 3)")).toBe('substring takes at most 3 arguments.');
    expect(messageOf('nope()')).toBe('"nope" is not a known function.');
    expect(kindOf("concat('a', 'b', 'c', 'd')")).toBe('call'); // variadic
    expect(kindOf("outputs('Any_name')")).toBe('reference'); // a root, not in the catalog
  });

  it('stops runaway nesting', () => {
    const deep = `${'toUpper('.repeat(40)}'a'${')'.repeat(40)}`;
    expect(messageOf(deep)).toBe('This expression nests too deeply.');
  });
});