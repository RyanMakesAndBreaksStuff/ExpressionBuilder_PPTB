import { describe, expect, it } from 'vitest';
import { inferFieldsFromSample, parseSampleRecord } from './inferFromSample';

describe('inferFieldsFromSample', () => {
  it('infers string, number, boolean primitives', () => {
    const fields = inferFieldsFromSample({ name: 'Alice', age: 30, active: true });
    expect(fields.map((f) => f.type)).toEqual(['string', 'number', 'boolean']);
    expect(fields.map((f) => f.id)).toEqual(['name', 'age', 'active']);
  });

  it('infers dateTime from ISO date strings', () => {
    const fields = inferFieldsFromSample({ createdAt: '2024-01-15T08:00:00Z', date: '2024-06-01' });
    expect(fields.every((f) => f.type === 'dateTime')).toBe(true);
  });

  it('flattens nested objects to dotted paths', () => {
    const fields = inferFieldsFromSample({ address: { city: 'Austin', zip: '78701' } });
    expect(fields.map((f) => f.id)).toEqual(['address.city', 'address.zip']);
    expect(fields[0].path).toEqual(['address', 'city']);
  });

  it('skips null and array values', () => {
    const fields = inferFieldsFromSample({ name: null, tags: ['a', 'b'], score: 5 });
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('score');
  });

  it('produces title-cased labels from snake_case keys', () => {
    const fields = inferFieldsFromSample({ first_name: 'Bob' });
    expect(fields[0].label).toBe('First Name');
  });

  it('tags fields with source: json', () => {
    const fields = inferFieldsFromSample({ x: 1 });
    expect(fields[0].source).toBe('json');
  });

  it('encodes a dotted key, a nested path, a tilde key, and an empty segment', () => {
    expect(inferFieldsFromSample({ 'a.b': 1 }).map((f) => ({ id: f.id, path: f.path, label: f.label }))).toEqual([
      { id: 'a~1b', path: ['a.b'], label: 'A B' },
    ]);
    expect(inferFieldsFromSample({ a: { b: 2 } }).map((f) => ({ id: f.id, path: f.path, label: f.label }))).toEqual([
      { id: 'a.b', path: ['a', 'b'], label: 'B' },
    ]);
    expect(inferFieldsFromSample({ 'a~b': 1 }).map((f) => ({ id: f.id, path: f.path, label: f.label }))).toEqual([
      { id: 'a~0b', path: ['a~b'], label: 'A~B' },
    ]);
    expect(inferFieldsFromSample({ '': 1 }).map((f) => ({ id: f.id, path: f.path, label: f.label }))).toEqual([
      { id: '~2', path: [''], label: '' },
    ]);
  });

  it('keeps a dotted key distinct from the nested path that used to share its id', () => {
    const fields = inferFieldsFromSample({ 'a.b': 1, a: { b: 2 } });
    expect(fields.map((f) => f.id)).toEqual(['a~1b', 'a.b']);
    expect(fields.map((f) => f.path)).toEqual([['a.b'], ['a', 'b']]);
    expect(fields.map((f) => f.type)).toEqual(['number', 'number']);
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
  });

  it('escapes tilde so an encoded dot or tilde cannot collide with a literal key', () => {
    const fields = inferFieldsFromSample({ '~': 1, '~0': 2, 'a~1b': 3, 'a.b': 4 });
    expect(fields.map((f) => f.id)).toEqual(['~0', '~00', 'a~01b', 'a~1b']);
    expect(fields.map((f) => f.path)).toEqual([['~'], ['~0'], ['a~1b'], ['a.b']]);
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
  });

  it('encodes empty segments so they cannot collide with a dot or a ~2 key', () => {
    expect(inferFieldsFromSample({ '': 1, '~2': 2 }).map((f) => ({ id: f.id, path: f.path }))).toEqual([
      { id: '~2', path: [''] },
      { id: '~02', path: ['~2'] },
    ]);
    expect(inferFieldsFromSample({ '': { b: 1 }, '.b': 2 }).map((f) => ({ id: f.id, path: f.path }))).toEqual([
      { id: '~2.b', path: ['', 'b'] },
      { id: '~1b', path: ['.b'] },
    ]);
    expect(inferFieldsFromSample({ '': { '': 1 }, '.': 2 }).map((f) => ({ id: f.id, path: f.path }))).toEqual([
      { id: '~2.~2', path: ['', ''] },
      { id: '~1', path: ['.'] },
    ]);
    expect(inferFieldsFromSample({ 'a.': 1, a: { '': 2 } }).map((f) => ({ id: f.id, path: f.path }))).toEqual([
      { id: 'a~1', path: ['a.'] },
      { id: 'a.~2', path: ['a', ''] },
    ]);
  });

  it('still skips null and array values when keys need encoding', () => {
    const fields = inferFieldsFromSample({ 'a.b': null, '~': ['x'], '': { x: [] }, score: 5 });
    expect(fields.map((f) => f.id)).toEqual(['score']);
  });
});

describe('parseSampleRecord', () => {
  it('parses a valid object', () => {
    const result = parseSampleRecord('{"status": "active", "count": 3}');
    expect(Array.isArray(result)).toBe(true);
    expect((result as ReturnType<typeof inferFieldsFromSample>).map((f) => f.type)).toEqual([
      'string',
      'number',
    ]);
  });

  it('accepts the first element of an array', () => {
    const result = parseSampleRecord('[{"x": true}]');
    expect(Array.isArray(result)).toBe(true);
    expect((result as ReturnType<typeof inferFieldsFromSample>)[0].type).toBe('boolean');
  });

  it('returns error for invalid JSON', () => {
    const result = parseSampleRecord('{bad json}');
    expect('error' in result).toBe(true);
  });

  it('returns error for non-object JSON', () => {
    const result = parseSampleRecord('"just a string"');
    expect('error' in result).toBe(true);
  });

  it('imports a dotted key and a nested path as two fields', () => {
    const result = parseSampleRecord('{"a.b":1,"a":{"b":2},"a~b":3,"":4}');
    expect(Array.isArray(result)).toBe(true);
    const fields = result as ReturnType<typeof inferFieldsFromSample>;
    expect(fields.map((f) => ({ id: f.id, path: f.path }))).toEqual([
      { id: 'a~1b', path: ['a.b'] },
      { id: 'a.b', path: ['a', 'b'] },
      { id: 'a~0b', path: ['a~b'] },
      { id: '~2', path: [''] },
    ]);
  });
});
