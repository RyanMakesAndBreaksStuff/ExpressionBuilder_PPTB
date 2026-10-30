import { describe, expect, it } from 'vitest';
import { importJsonSchema, type JsonSchemaImportResult } from './jsonSchemaImport';

const ok = (result: ReturnType<typeof importJsonSchema>): JsonSchemaImportResult => {
  if ('error' in result) throw new Error(`Expected ok but got error: ${result.error}`);
  return result;
};

describe('importJsonSchema', () => {
  it('maps string/integer/boolean/number to correct FieldTypes', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
            score: { type: 'number' },
            active: { type: 'boolean' },
          },
        }),
      ),
    );
    expect(result.fields.map((f) => f.type)).toEqual(['string', 'number', 'number', 'boolean']);
  });

  it('maps string+date-time format to dateTime', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { created: { type: 'string', format: 'date-time' } } }),
      ),
    );
    expect(result.fields[0].type).toBe('dateTime');
  });

  it('maps enum to choice with choices array', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { status: { type: 'string', enum: ['open', 'closed'] } } }),
      ),
    );
    expect(result.fields[0].type).toBe('choice');
    expect(result.fields[0].choices).toEqual(['open', 'closed']);
    expect(result.fields[0].options).toBeUndefined();
  });

  it('handles nullable type array (string | null)', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { note: { type: ['string', 'null'] } } }),
      ),
    );
    expect(result.fields[0].type).toBe('string');
  });

  it('uses title as label when provided', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { firstName: { type: 'string', title: 'First Name' } } }),
      ),
    );
    expect(result.fields[0].label).toBe('First Name');
  });

  it('warns on unsupported types and defaults to string', () => {
    const result = ok(
      importJsonSchema(JSON.stringify({ properties: { data: { type: 'object' } } })),
    );
    expect(result.fields[0].type).toBe('string');
    expect(result.warnings).toEqual([
      'Property "data" has unsupported type "object" — defaulted to string.',
    ]);
  });

  it('tags fields with source: jsonSchema', () => {
    const result = ok(
      importJsonSchema(JSON.stringify({ properties: { x: { type: 'string' } } })),
    );
    expect(result.fields[0].source).toBe('jsonSchema');
  });

  it('returns error for invalid JSON', () => {
    expect(importJsonSchema('{bad}')).toEqual({ error: 'JSON is not valid.' });
  });

  it('returns error when properties is missing', () => {
    expect(importJsonSchema(JSON.stringify({ type: 'object' }))).toEqual({
      error: 'Schema has no "properties" object.',
    });
  });

  it('rejects a properties value that is not an object', () => {
    const error = { error: 'Schema has no "properties" object.' };
    expect(importJsonSchema(JSON.stringify({ properties: null }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: [] }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: 'name' }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: true }))).toEqual(error);
  });

  it('rejects null, array, and primitive roots without throwing', () => {
    const error = { error: 'Unsupported JSON Schema shape.' };
    expect(importJsonSchema('null')).toEqual(error);
    expect(importJsonSchema('[]')).toEqual(error);
    expect(importJsonSchema('1')).toEqual(error);
    expect(importJsonSchema('"text"')).toEqual(error);
  });

  it('rejects boolean schemas as an unsupported shape', () => {
    const error = { error: 'Unsupported JSON Schema shape.' };
    expect(importJsonSchema('true')).toEqual(error);
    expect(importJsonSchema('false')).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: { ready: true } }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: { ready: false } }))).toEqual(error);
  });

  it('rejects a null or non-object property without importing siblings', () => {
    const error = { error: 'Unsupported JSON Schema shape.' };
    expect(importJsonSchema(JSON.stringify({ properties: { x: null } }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: { x: [] } }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: { x: 'string' } }))).toEqual(error);
    expect(importJsonSchema(JSON.stringify({ properties: { x: 1 } }))).toEqual(error);
    expect(
      importJsonSchema(
        JSON.stringify({ properties: { ok: { type: 'string' }, bad: null } }),
      ),
    ).toEqual(error);
  });

  it('keeps field order and diagnoses mixed enum members instead of stringifying them', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            level: { enum: [1, 'high', null] },
            name: { type: 'string', title: 'Name' },
          },
        }),
      ),
    );
    expect(result.fields).toEqual([
      {
        id: 'level',
        label: 'level',
        type: 'string',
        path: ['level'],
        source: 'jsonSchema',
      },
      {
        id: 'name',
        label: 'Name',
        type: 'string',
        path: ['name'],
        source: 'jsonSchema',
      },
    ]);
    expect(result.warnings).toEqual([
      'Property "level" enum has a null member — enum was not imported.',
      'Property "level" enum has mixed member types — enum was not imported.',
    ]);
  });

  it('imports homogeneous numeric enums as number options', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            status: { type: 'integer', title: 'Status', enum: [1, 2] },
            score: { type: 'number', enum: [1, 1.5] },
            priority: { enum: [0, -3] },
            rank: { type: ['integer', 'null'], enum: [4, 5] },
          },
        }),
      ),
    );
    expect(result.warnings).toEqual([]);
    expect(result.fields).toEqual([
      {
        id: 'status',
        label: 'Status',
        type: 'number',
        path: ['status'],
        source: 'jsonSchema',
        options: [
          { label: '1', value: 1 },
          { label: '2', value: 2 },
        ],
      },
      {
        id: 'score',
        label: 'score',
        type: 'number',
        path: ['score'],
        source: 'jsonSchema',
        options: [
          { label: '1', value: 1 },
          { label: '1.5', value: 1.5 },
        ],
      },
      {
        id: 'priority',
        label: 'priority',
        type: 'number',
        path: ['priority'],
        source: 'jsonSchema',
        options: [
          { label: '0', value: 0 },
          { label: '-3', value: -3 },
        ],
      },
      {
        id: 'rank',
        label: 'rank',
        type: 'number',
        path: ['rank'],
        source: 'jsonSchema',
        options: [
          { label: '4', value: 4 },
          { label: '5', value: 5 },
        ],
      },
    ]);
    expect(result.fields.every((field) => field.choices === undefined)).toBe(true);
  });

  it('imports a boolean enum that allows both values as boolean', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            active: { type: 'boolean', title: 'Active', enum: [true, false] },
            other: { enum: [false, true, false] },
          },
        }),
      ),
    );
    expect(result.warnings).toEqual([]);
    expect(result.fields).toEqual([
      {
        id: 'active',
        label: 'Active',
        type: 'boolean',
        path: ['active'],
        source: 'jsonSchema',
      },
      {
        id: 'other',
        label: 'other',
        type: 'boolean',
        path: ['other'],
        source: 'jsonSchema',
      },
    ]);
  });

  it('keeps string enums as string choices, including numeric-looking values', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            code: { type: 'string', enum: ['1', '2'] },
            created: {
              type: 'string',
              format: 'date-time',
              enum: ['2020-01-01T00:00:00Z'],
            },
          },
        }),
      ),
    );
    expect(result.warnings).toEqual([]);
    expect(result.fields).toEqual([
      {
        id: 'code',
        label: 'code',
        type: 'choice',
        path: ['code'],
        source: 'jsonSchema',
        choices: ['1', '2'],
      },
      {
        id: 'created',
        label: 'created',
        type: 'choice',
        path: ['created'],
        source: 'jsonSchema',
        choices: ['2020-01-01T00:00:00Z'],
      },
    ]);
  });

  it('round-trips finite numeric options and string choices on the field object', () => {
    const numeric = ok(
      importJsonSchema(
        JSON.stringify({ properties: { status: { type: 'integer', enum: [1, 2] } } }),
      ),
    );
    const text = ok(
      importJsonSchema(
        JSON.stringify({ properties: { status: { type: 'string', enum: ['open', 'closed'] } } }),
      ),
    );
    expect(JSON.parse(JSON.stringify(numeric.fields[0]))).toEqual(numeric.fields[0]);
    expect(numeric.fields[0].options).toEqual([
      { label: '1', value: 1 },
      { label: '2', value: 2 },
    ]);
    expect(JSON.parse(JSON.stringify(text.fields[0]))).toEqual(text.fields[0]);
    expect(text.fields[0].choices).toEqual(['open', 'closed']);
  });

  it('diagnoses a null enum member and does not stringify it', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({ properties: { note: { type: 'string', enum: ['open', null] } } }),
      ),
    );
    expect(result.fields[0].type).toBe('string');
    expect(result.fields[0].choices).toBeUndefined();
    expect(result.fields[0].options).toBeUndefined();
    expect(result.warnings).toEqual([
      'Property "note" enum has a null member — enum was not imported.',
    ]);
  });

  it('diagnoses object and array enum members', () => {
    const result = ok(
      importJsonSchema(
        JSON.stringify({
          properties: {
            item: { type: 'string', enum: [{ a: 1 }] },
            tags: { enum: [['a', 'b']] },
          },
        }),
      ),
    );
    expect(result.fields.map((field) => [field.id, field.type, field.choices, field.options])).toEqual([
      ['item', 'string', undefined, undefined],
      ['tags', 'string', undefined, undefined],
    ]);
    expect(result.warnings).toEqual([
      'Property "item" enum has an object or array member — enum was not imported.',
      'Property "tags" enum has an object or array member — enum was not imported.',
    ]);
  });

  it('diagnoses non-finite enum members and does not import them as options', () => {
    // 1e309 survives JSON.parse as Infinity; JSON.stringify would erase it.
    const result = ok(
      importJsonSchema('{"properties":{"n":{"type":"number","enum":[1,1e309,-1e309]}}}'),
    );
    expect(result.fields[0].type).toBe('number');
    expect(result.fields[0].options).toBeUndefined();
    expect(result.fields[0].choices).toBeUndefined();
    expect(result.warnings).toEqual([
      'Property "n" enum has a non-finite number — enum was not imported.',
    ]);
  });

  it('diagnoses a singleton boolean enum as a limitation', () => {
    const onlyTrue = ok(
      importJsonSchema(
        JSON.stringify({ properties: { flag: { type: 'boolean', enum: [true] } } }),
      ),
    );
    const onlyFalse = ok(
      importJsonSchema(JSON.stringify({ properties: { flag: { enum: [false, false] } } })),
    );
    expect(onlyTrue.fields[0]).toEqual({
      id: 'flag',
      label: 'flag',
      type: 'boolean',
      path: ['flag'],
      source: 'jsonSchema',
    });
    expect(onlyFalse.fields[0].type).toBe('boolean');
    expect(onlyFalse.fields[0].choices).toBeUndefined();
    expect(onlyTrue.warnings).toEqual([
      'Property "flag" enum limitation: only true is allowed — the boolean editor cannot enforce a single value.',
    ]);
    expect(onlyFalse.warnings).toEqual([
      'Property "flag" enum limitation: only false is allowed — the boolean editor cannot enforce a single value.',
    ]);
  });

  it('diagnoses an enum that conflicts with the declared type', () => {
    const fractional = ok(
      importJsonSchema(
        JSON.stringify({ properties: { count: { type: 'integer', enum: [1, 1.5] } } }),
      ),
    );
    expect(fractional.fields[0].type).toBe('number');
    expect(fractional.fields[0].options).toBeUndefined();
    expect(fractional.fields[0].choices).toBeUndefined();
    expect(fractional.warnings).toEqual([
      'Property "count" enum conflicts with declared type "integer" — enum was not imported.',
    ]);

    const code = ok(
      importJsonSchema(
        JSON.stringify({ properties: { code: { type: 'string', enum: [1, 2] } } }),
      ),
    );
    expect(code.fields[0].type).toBe('string');
    expect(code.fields[0].choices).toBeUndefined();
    expect(code.fields[0].options).toBeUndefined();
    expect(code.warnings).toEqual([
      'Property "code" enum conflicts with declared type "string" — enum was not imported.',
    ]);

    const flag = ok(
      importJsonSchema(
        JSON.stringify({ properties: { flag: { type: 'integer', enum: [true] } } }),
      ),
    );
    expect(flag.fields[0].type).toBe('number');
    expect(flag.fields[0].choices).toBeUndefined();
    expect(flag.warnings).toEqual([
      'Property "flag" enum conflicts with declared type "integer" — enum was not imported.',
    ]);

    const blob = ok(
      importJsonSchema(
        JSON.stringify({ properties: { blob: { type: 'object', enum: [1, 2] } } }),
      ),
    );
    expect(blob.fields[0].type).toBe('string');
    expect(blob.fields[0].options).toBeUndefined();
    expect(blob.warnings).toEqual([
      'Property "blob" enum conflicts with declared type "object" — enum was not imported.',
      'Property "blob" has unsupported type "object" — defaulted to string.',
    ]);
  });

  it('ignores an empty enum and uses the declared type', () => {
    const result = ok(
      importJsonSchema(JSON.stringify({ properties: { age: { type: 'integer', enum: [] } } })),
    );
    expect(result.warnings).toEqual([]);
    expect(result.fields[0].type).toBe('number');
    expect(result.fields[0].options).toBeUndefined();
    expect(result.fields[0].choices).toBeUndefined();
  });
});
