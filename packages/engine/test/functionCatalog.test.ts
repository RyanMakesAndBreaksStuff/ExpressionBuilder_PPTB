import { describe, expect, it } from 'vitest';
import { FUNCTION_CATALOG, FUNCTION_GROUPS, findFunction } from '../src/functionCatalog';

describe('function catalog', () => {
  it('covers every Microsoft Learn category (FR-9)', () => {
    expect(FUNCTION_GROUPS).toEqual(['String', 'Collection', 'Logical', 'Math', 'Date and time']);
    const counts = Object.fromEntries(
      FUNCTION_GROUPS.map((group) => [group, FUNCTION_CATALOG.filter((fn) => fn.group === group).length]),
    );
    expect(counts).toEqual({ String: 20, Collection: 14, Logical: 12, Math: 10, 'Date and time': 23 });
  });

  it('gives every entry unique argument names and a description (AC-9.1)', () => {
    for (const fn of FUNCTION_CATALOG) {
      expect(fn.description, fn.name).not.toBe('');
      expect(new Set(fn.args.map((arg) => arg.name)).size, fn.name).toBe(fn.args.length);
      const firstOptional = fn.args.findIndex((arg) => !arg.required);
      if (firstOptional !== -1) {
        expect(fn.args.slice(firstOptional).every((arg) => !arg.required), fn.name).toBe(true);
      }
    }
  });

  it('models the signatures the UI depends on (AC-12.1)', () => {
    expect(findFunction('substring')?.args).toEqual([
      { name: 'text', type: 'string', required: true, variadic: false },
      { name: 'startIndex', type: 'integer', required: true, variadic: false },
      { name: 'length', type: 'integer', required: false, variadic: false },
    ]);
    expect(findFunction('concat')?.args).toEqual([
      { name: 'text1', type: 'string', required: true, variadic: false },
      { name: 'text2', type: 'string', required: true, variadic: false },
      { name: 'text3', type: 'string', required: false, variadic: true },
    ]);
    expect(findFunction('item')?.args).toEqual([]);
    expect(findFunction('nope')).toBeUndefined();
  });

  it('returns the first group for a name Learn lists twice', () => {
    expect(findFunction('length')?.group).toBe('String');
    expect(FUNCTION_CATALOG.filter((fn) => fn.name === 'length')).toHaveLength(2);
  });

  // findFunction resolves by name, so a twin with its own signature would hand
  // the Collection row the String row's arguments.
  it('stores a Learn sample on every timestamp argument and nowhere else', () => {
    const samples: Record<string, Record<string, string>> = {
      addDays: { timestamp: '2018-03-15T00:00:00Z' },
      addHours: { timestamp: '2018-03-15T00:00:00Z' },
      addMinutes: { timestamp: '2018-03-15T00:10:00Z' },
      addSeconds: { timestamp: '2018-03-15T00:00:00Z' },
      addToTime: { timestamp: '2018-01-01T00:00:00Z' },
      convertFromUtc: { timestamp: '2018-01-01T08:00:00.0000000Z' },
      convertTimeZone: { timestamp: '2018-01-01T08:00:00.0000000Z' },
      convertToUtc: { timestamp: '01/01/2018 00:00:00' },
      dateDifference: { startDate: '2015-02-08', endDate: '2018-07-30' },
      dayOfMonth: { timestamp: '2018-03-15T13:27:36Z' },
      dayOfWeek: { timestamp: '2018-03-15T13:27:36Z' },
      dayOfYear: { timestamp: '2018-03-15T13:27:36Z' },
      formatDateTime: { timestamp: '03/15/2018' },
      startOfDay: { timestamp: '2018-03-15T13:30:30Z' },
      startOfHour: { timestamp: '2018-03-15T13:30:30Z' },
      startOfMonth: { timestamp: '2018-03-15T13:30:30Z' },
      subtractFromTime: { timestamp: '2018-01-02T00:00:00Z' },
      ticks: { timestamp: '2018-03-15T13:27:36Z' },
    };
    const seen = new Set<string>();
    for (const fn of FUNCTION_CATALOG) {
      for (const arg of fn.args) {
        const expected = samples[fn.name]?.[arg.name];
        if (arg.type === 'timestamp') {
          expect(arg.sample, `${fn.group} ${fn.name}.${arg.name}`).toBe(expected);
          seen.add(`${fn.name}.${arg.name}`);
        } else {
          expect(arg.sample, `${fn.group} ${fn.name}.${arg.name}`).toBeUndefined();
        }
      }
    }
    const declared = Object.entries(samples).flatMap(([name, args]) =>
      Object.keys(args).map((arg) => `${name}.${arg}`),
    );
    expect(seen).toEqual(new Set(declared));
  });

  it('gives a name Learn lists twice one signature, since it is one function', () => {
    for (const fn of FUNCTION_CATALOG) {
      const first = findFunction(fn.name);
      expect({ args: fn.args, returns: fn.returns }, `${fn.group} ${fn.name}`)
        .toEqual({ args: first?.args, returns: first?.returns });
    }
    expect(findFunction('chunk')?.args.map((arg) => arg.name)).toEqual(['collection', 'length']);
  });
});
