import { describe, expect, it } from 'vitest';
import { OPERATORS_BY_FIELD_TYPE, formatExpression, wrapperChainContract } from '../src';
import type { ExpressionNode, FieldDefinition, ValueType } from '../src';

const text: FieldDefinition = { id: 'Title', label: 'Title', type: 'string', path: ['Title'] };
const nullableText: FieldDefinition = { ...text, nullable: true };
const amount: FieldDefinition = { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] };
const nullableAmount: FieldDefinition = { ...amount, nullable: true };
const flag: FieldDefinition = { id: 'Flag', label: 'Flag', type: 'boolean', path: ['Flag'] };
const due: FieldDefinition = { id: 'Due', label: 'Due', type: 'dateTime', path: ['Due'] };
const nullableDue: FieldDefinition = { ...due, nullable: true };
const status: FieldDefinition = { id: 'Status', label: 'Status', type: 'choice', path: ['Status'] };

const fields = [text, amount, flag, due, status];

function field(fieldId: string): ExpressionNode {
  return { kind: 'field', fieldId };
}

function lit(value: string | number | boolean | null, valueType: ValueType): ExpressionNode {
  return { kind: 'literal', value, valueType };
}

function call(name: string, args: ExpressionNode[]): ExpressionNode {
  return { kind: 'function', name, args };
}

function rule(operator: string, left: ExpressionNode, right?: ExpressionNode): ExpressionNode {
  return { kind: 'rule', operator, left, right };
}

function coalesce(inner: ExpressionNode): ExpressionNode {
  return call('coalesce', [inner, lit('', 'string')]);
}

function run(node: ExpressionNode, selected: FieldDefinition[] = fields) {
  return formatExpression(node, { mode: 'triggerCondition', fields: selected });
}

const dateLiteral = lit('2026-01-01T00:00:00Z', 'dateTime');

describe('wrapper inputs', () => {
  it.each(['toLower', 'toUpper', 'trim'] as const)('rejects a number input to %s', (name) => {
    const result = run(rule('equals', call(name, [field('Amount')]), lit('1', 'string')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: `Function "${name}" does not accept number inputs.`,
        severity: 'error',
        path: '$.left',
      },
    ]);
  });

  it.each(['toLower', 'toUpper', 'trim'] as const)('rejects a boolean input to %s', (name) => {
    const result = run(rule('equals', call(name, [field('Flag')]), lit('true', 'string')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: `Function "${name}" does not accept boolean inputs.`,
        severity: 'error',
        path: '$.left',
      },
    ]);
  });

  it('rejects a number input to length', () => {
    const result = run(rule('equals', call('length', [field('Amount')]), lit(1, 'number')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Function "length" does not accept number inputs.',
        severity: 'error',
        path: '$.left',
      },
    ]);
  });

  it('rejects a boolean input to length', () => {
    const result = run(rule('equals', call('length', [field('Flag')]), lit(1, 'number')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Function "length" does not accept boolean inputs.',
        severity: 'error',
        path: '$.left',
      },
    ]);
  });

  it('rejects toLower applied to length', () => {
    const result = run(
      rule('equals', call('toLower', [call('length', [field('Title')])]), call('toLower', [call('length', [lit('abcd', 'string')])])),
    );

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Function "toLower" does not accept number inputs.',
        severity: 'error',
        path: '$.left',
      },
      {
        code: 'TYPE_MISMATCH',
        message: 'Function "toLower" does not accept number inputs.',
        severity: 'error',
        path: '$.right',
      },
    ]);
  });

  it('rejects choice input to a string wrapper', () => {
    const result = run(rule('equals', call('toLower', [field('Status')]), lit('Active', 'string')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Function "toLower" does not accept choice inputs.',
        severity: 'error',
        path: '$.left',
      },
    ]);
  });
});

describe('length comparisons', () => {
  it('compares a string length to a number', () => {
    const result = run(rule('greater', call('length', [field('Title')]), lit(4, 'number')));

    expect(result.expression).toBe("@greater(length(triggerBody()?['Title']), 4)");
    expect(result.diagnostics).toEqual([]);
  });

  it('compares lengths of two strings', () => {
    const result = run(rule('greater', call('length', [field('Title')]), call('length', [lit('abcd', 'string')])));

    expect(result.expression).toBe("@greater(length(triggerBody()?['Title']), length('abcd'))");
    expect(result.diagnostics).toEqual([]);
  });

  it('compares the length of a dateTime string representation as a number', () => {
    const result = run(rule('greater', call('length', [field('Due')]), lit(20, 'number')));

    expect(result.expression).toBe('@greater(length(triggerBody()?[\'Due\']), 20)');
    expect(result.expression).not.toContain('ticks(');
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects a string operator on a length result', () => {
    const result = run(rule('contains', call('length', [field('Title')]), call('length', [lit('ab', 'string')])));

    expect(result.diagnostics).toEqual([
      {
        code: 'UNSUPPORTED_OPERATOR',
        message: 'Operator "contains" is not supported for number values.',
        severity: 'error',
        path: '$',
      },
    ]);
  });

  it('rejects a string right operand for a length comparison', () => {
    const result = run(rule('greater', call('length', [field('Title')]), lit('4', 'string')));

    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Operator "greater" compares number to string.',
        severity: 'error',
        path: '$',
      },
    ]);
  });
});

describe('date normalization', () => {
  it('keeps ticks around a bare date comparison', () => {
    const result = run(rule('equals', field('Due'), dateLiteral));

    expect(result.expression).toBe("@equals(ticks(triggerBody()?['Due']), ticks('2026-01-01T00:00:00Z'))");
    expect(result.diagnostics).toEqual([]);
  });

  it('does not wrap an explicit ticks call twice', () => {
    const result = run(
      rule('greaterOrEquals', field('Due'), call('ticks', [dateLiteral])),
    );

    expect(result.expression).toBe("@greaterOrEquals(ticks(triggerBody()?['Due']), ticks('2026-01-01T00:00:00Z'))");
    expect(result.expression).not.toContain('ticks(ticks(');
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps ticks around a date-preserving addDays result', () => {
    const result = run(
      rule('less', field('Due'), call('addDays', [call('utcNow', []), lit(7, 'number')])),
    );

    expect(result.expression).toBe("@less(ticks(triggerBody()?['Due']), ticks(addDays(utcNow(), 7)))");
    expect(result.diagnostics).toEqual([]);
  });

  it.each(['toLower', 'toUpper', 'trim'] as const)('compares %s of a date as text without ticks', (name) => {
    const result = run(rule('equals', call(name, [field('Due')]), call(name, [dateLiteral])));

    expect(result.expression).toBe(
      `@equals(${name}(triggerBody()?['Due']), ${name}('2026-01-01T00:00:00Z'))`,
    );
    expect(result.expression).not.toContain('ticks(');
    expect(result.diagnostics).toEqual([]);
  });

  it('does not keep ticks after trimming a date-producing call', () => {
    const result = run(rule('equals', call('trim', [call('addDays', [call('utcNow', []), lit(1, 'number')])]), lit('2026-01-02', 'string')));

    expect(result.expression).toBe("@equals(trim(addDays(utcNow(), 1)), '2026-01-02')");
    expect(result.expression).not.toContain('ticks(');
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects numeric ordering of a text-transformed date', () => {
    const result = run(rule('greater', call('trim', [field('Due')]), call('trim', [dateLiteral])));

    expect(result.expression).toBe("@greater(trim(triggerBody()?['Due']), trim('2026-01-01T00:00:00Z'))");
    expect(result.expression).not.toContain('ticks(');
    expect(result.diagnostics).toEqual([
      {
        code: 'UNSUPPORTED_OPERATOR',
        message: 'Operator "greater" is not supported for string values.',
        severity: 'error',
        path: '$',
      },
    ]);
  });
});

describe('coalesce effective types', () => {
  it('keeps a non-null number and its empty fallback', () => {
    const result = run(rule('greater', coalesce(field('Amount')), coalesce(lit(1, 'number'))));

    expect(result.expression).toBe("@greater(coalesce(triggerBody()?['Amount'], ''), coalesce(1, ''))");
    expect(result.diagnostics).toEqual([]);
  });

  it('does not treat a nullable number coalesced with an empty string as numeric', () => {
    const result = run(rule('greater', coalesce(field('Amount')), coalesce(lit(1, 'number'))), [nullableAmount]);

    expect(result.expression).toBe("@greater(coalesce(triggerBody()?['Amount'], ''), coalesce(1, ''))");
    expect(result.expression).not.toContain('ticks(');
    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Operator "greater" cannot be used with number | string values.',
        severity: 'error',
        path: '$',
      },
    ]);
    expect(result.diagnostics.every((item) => !item.message.toLowerCase().includes('invalid'))).toBe(true);
  });

  it('still allows generic equality for that mixed number result', () => {
    const result = run(rule('equals', coalesce(field('Amount')), coalesce(lit(1, 'number'))), [nullableAmount]);

    expect(result.expression).toBe("@equals(coalesce(triggerBody()?['Amount'], ''), coalesce(1, ''))");
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps a homogeneous string fallback, including a nullable string', () => {
    const result = run(rule('equals', coalesce(field('Title')), coalesce(lit('Bob', 'string'))), [nullableText]);

    expect(result.expression).toBe("@equals(coalesce(triggerBody()?['Title'], ''), coalesce('Bob', ''))");
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps ticks when a non-null date is coalesced with an empty string', () => {
    const result = run(rule('equals', coalesce(field('Due')), coalesce(dateLiteral)));

    expect(result.expression).toBe(
      "@equals(ticks(coalesce(triggerBody()?['Due'], '')), ticks(coalesce('2026-01-01T00:00:00Z', '')))",
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('does not tick or order a nullable date coalesced with an empty string', () => {
    const result = run(rule('greater', coalesce(field('Due')), coalesce(dateLiteral)), [nullableDue]);

    expect(result.expression).toBe(
      "@greater(coalesce(triggerBody()?['Due'], ''), coalesce('2026-01-01T00:00:00Z', ''))",
    );
    expect(result.diagnostics).toEqual([
      {
        code: 'TYPE_MISMATCH',
        message: 'Operator "greater" cannot be used with dateTime | string values.',
        severity: 'error',
        path: '$',
      },
    ]);
  });

  it('warns when a coalesce result cannot be modelled', () => {
    const result = run(rule('equals', coalesce(call('frob', [])), lit('x', 'string')));

    expect(result.expression).toBe("@equals(coalesce(frob(), ''), 'x')");
    expect(result.diagnostics).toEqual([
      {
        code: 'UNMODELLED_RESULT',
        message: 'Compatibility could not be established for this result.',
        severity: 'warning',
        path: '$.left',
      },
    ]);
  });

  it('keeps the nullable string-wrapper warning', () => {
    const result = run(rule('equals', call('toLower', [field('Title')]), lit('x', 'string')), [nullableText]);
    const warning = result.diagnostics.find((item) => item.code === 'UNSAFE_NULL_STRING_WRAPPER');

    expect(warning).toEqual({
      code: 'UNSAFE_NULL_STRING_WRAPPER',
      message: 'Wrap nullable field "Title" with coalesce before toLower().',
      severity: 'warning',
      path: '$.left',
    });
    expect(result.diagnostics.some((item) => item.code === 'TYPE_MISMATCH')).toBe(false);
  });
});

describe('preserved field and literal reporting', () => {
  it('reports one UNKNOWN_FIELD for a missing field inside a wrapper', () => {
    const result = run(rule('equals', call('toLower', [field('ghost')]), lit('x', 'string')));

    expect(result.diagnostics).toEqual([
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.left.args[0]',
      },
    ]);
  });

  it('reports UNKNOWN_FIELD once per missing-field occurrence', () => {
    const result = run(rule('equals', field('ghost'), field('other')));

    expect(result.diagnostics).toEqual([
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "ghost".',
        severity: 'error',
        path: '$.left',
      },
      {
        code: 'UNKNOWN_FIELD',
        message: 'Unknown field "other".',
        severity: 'error',
        path: '$.right',
      },
    ]);
  });

  it('reports only INVALID_LITERAL for a non-finite number', () => {
    const result = run(rule('equals', field('Title'), lit(Number.POSITIVE_INFINITY, 'number')));

    expect(result.expression).toBe("@equals(triggerBody()?['Title'], null)");
    expect(result.diagnostics).toEqual([
      {
        code: 'INVALID_LITERAL',
        message: 'Numeric literals must be finite.',
        severity: 'error',
        path: '$.right',
      },
    ]);
  });
});

describe('wrapperChainContract', () => {
  const stringWrappers = ['toLower', 'toUpper', 'trim', 'length', 'coalesce'] as const;

  it.each([
    ['string', OPERATORS_BY_FIELD_TYPE.string, stringWrappers, false],
    ['dateTime', OPERATORS_BY_FIELD_TYPE.dateTime, stringWrappers, true],
    ['number', OPERATORS_BY_FIELD_TYPE.number, ['coalesce'], false],
    ['boolean', OPERATORS_BY_FIELD_TYPE.boolean, ['coalesce'], false],
    ['choice', OPERATORS_BY_FIELD_TYPE.choice, ['coalesce'], false],
  ] as const)('offers operators for an unwrapped %s field', (type, operators, appendableWrappers, normalizesDates) => {
    expect(wrapperChainContract({ type }, [])).toEqual({
      outputType: type,
      outputTypes: [type],
      operators: [...operators],
      appendableWrappers: [...appendableWrappers],
      normalizesDates,
      mixed: false,
      unmodelled: false,
      valid: true,
    });
  });

  it('treats length of a string as a number and blocks a following text wrapper', () => {
    expect(wrapperChainContract({ type: 'string' }, ['length'])).toMatchObject({
      outputType: 'number',
      outputTypes: ['number'],
      operators: [...OPERATORS_BY_FIELD_TYPE.number],
      appendableWrappers: ['coalesce'],
      normalizesDates: false,
      mixed: false,
      valid: true,
    });

    expect(wrapperChainContract({ type: 'string' }, ['length', 'toLower'])).toEqual({
      outputType: null,
      outputTypes: [],
      operators: [],
      appendableWrappers: [],
      normalizesDates: false,
      mixed: false,
      unmodelled: false,
      valid: false,
    });
  });

  it('turns a trimmed date into a string comparison', () => {
    expect(wrapperChainContract({ type: 'dateTime' }, ['trim'])).toMatchObject({
      outputType: 'string',
      operators: [...OPERATORS_BY_FIELD_TYPE.string],
      normalizesDates: false,
      valid: true,
      mixed: false,
    });
  });

  it('keeps a non-null number coalesced with an empty string numeric', () => {
    expect(wrapperChainContract({ type: 'number' }, ['coalesce'])).toMatchObject({
      outputType: 'number',
      operators: [...OPERATORS_BY_FIELD_TYPE.number],
      normalizesDates: false,
      mixed: false,
      valid: true,
    });
  });

  it('keeps a nullable number coalesced with an empty string mixed', () => {
    expect(wrapperChainContract({ type: 'number', nullable: true }, ['coalesce'])).toEqual({
      outputType: null,
      outputTypes: ['number', 'string'],
      operators: ['equals', 'notEquals'],
      appendableWrappers: ['coalesce'],
      normalizesDates: false,
      mixed: true,
      unmodelled: false,
      valid: true,
    });
  });

  it('keeps a nullable string coalesced with an empty string a string', () => {
    expect(wrapperChainContract({ type: 'string', nullable: true }, ['coalesce'])).toMatchObject({
      outputType: 'string',
      outputTypes: ['string'],
      operators: [...OPERATORS_BY_FIELD_TYPE.string],
      mixed: false,
      normalizesDates: false,
      valid: true,
    });
  });

  it('keeps ticks only when coalesce still yields a date', () => {
    expect(wrapperChainContract({ type: 'dateTime' }, ['coalesce']).normalizesDates).toBe(true);
    expect(wrapperChainContract({ type: 'dateTime', nullable: true }, ['coalesce'])).toMatchObject({
      outputType: null,
      outputTypes: ['dateTime', 'string'],
      operators: ['equals', 'notEquals'],
      normalizesDates: false,
      mixed: true,
      valid: true,
    });
  });

  it('rejects number and boolean text wrappers', () => {
    expect(wrapperChainContract({ type: 'number' }, ['toLower']).valid).toBe(false);
    expect(wrapperChainContract({ type: 'boolean' }, ['toLower']).valid).toBe(false);
    expect(wrapperChainContract({ type: 'number' }, ['length']).operators).toEqual([]);
    expect(wrapperChainContract({ type: 'boolean' }, ['length']).operators).toEqual([]);
  });
});
