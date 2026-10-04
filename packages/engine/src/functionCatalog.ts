export type ArgType =
  | 'string' | 'number' | 'integer' | 'boolean' | 'any'
  | 'collection' | 'object' | 'timestamp';

export type FunctionGroup = 'String' | 'Collection' | 'Logical' | 'Math' | 'Date and time';

export const FUNCTION_GROUPS: readonly FunctionGroup[] = [
  'String', 'Collection', 'Logical', 'Math', 'Date and time',
];

export interface CatalogArg {
  name: string;
  type: ArgType;
  required: boolean;
  /** Repeats: the UI offers one more empty slot once this one is filled (D9). */
  variadic: boolean;
  /** Learn's example literal for a timestamp argument. Absent on every other type. */
  sample?: string;
}

export interface CatalogFunction {
  name: string;
  group: FunctionGroup;
  description: string;
  args: CatalogArg[];
  returns: ArgType;
}

/**
 * Argument spec: space-separated `name:type`, `?` for optional, `*` for
 * variadic — `'text:string length:integer?'`.
 * ponytail: a 7-line reader keeps 79 uniform signatures at one line each
 * instead of ~900 lines of object literals. If an argument ever needs more
 * than name/type/required/variadic, drop the spec and write the objects out.
 * Timestamp samples stay out of the spec: convertToUtc's sample contains a space.
 */
function parseArgs(spec: string): CatalogArg[] {
  if (spec === '') return [];
  return spec.split(' ').map((token) => {
    const variadic = token.endsWith('*');
    const withoutStar = variadic ? token.slice(0, -1) : token;
    const required = !withoutStar.endsWith('?');
    const [name, type] = (required ? withoutStar : withoutStar.slice(0, -1)).split(':');
    return { name, type: type as ArgType, required, variadic };
  });
}

function entry(
  group: FunctionGroup,
  name: string,
  spec: string,
  returns: ArgType,
  description: string,
  samples?: Readonly<Record<string, string>>,
): CatalogFunction {
  const args = parseArgs(spec).map((arg) => {
    const sample = samples?.[arg.name];
    return sample === undefined ? arg : { ...arg, sample };
  });
  return { name, group, description, args, returns };
}

export const FUNCTION_CATALOG: CatalogFunction[] = [
  // ---- String (20) ----
  entry('String', 'chunk', 'collection:any length:integer', 'collection', 'Split a string or array into chunks of equal length.'),
  entry('String', 'concat', 'text1:string text2:string text3:string?*', 'string', 'Join two or more strings.'),
  entry('String', 'endsWith', 'text:string searchText:string', 'boolean', 'True when the text ends with the substring.'),
  entry('String', 'formatNumber', 'number:number format:string locale:string?', 'string', 'Format a number as a string.'),
  entry('String', 'guid', 'format:string?', 'string', 'Generate a globally unique identifier.'),
  entry('String', 'indexOf', 'text:string searchText:string', 'integer', 'Position of the first occurrence, or -1.'),
  entry('String', 'isFloat', 'value:string locale:string?', 'boolean', 'True when the string is a floating-point number.'),
  entry('String', 'isInt', 'value:string', 'boolean', 'True when the string is an integer.'),
  entry('String', 'lastIndexOf', 'text:string searchText:string', 'integer', 'Position of the last occurrence, or -1.'),
  entry('String', 'length', 'value:any', 'integer', 'Number of characters in a string or items in a collection.'),
  entry('String', 'nthIndexOf', 'text:string searchText:string occurrence:integer', 'integer', 'Position of the nth occurrence.'),
  entry('String', 'replace', 'text:string oldText:string newText:string', 'string', 'Replace every occurrence of a substring.'),
  entry('String', 'slice', 'text:string startIndex:integer endIndex:integer?', 'string', 'Substring between two positions.'),
  entry('String', 'split', 'text:string delimiter:string', 'collection', 'Split text on a delimiter into an array.'),
  entry('String', 'startsWith', 'text:string searchText:string', 'boolean', 'True when the text starts with the substring.'),
  entry('String', 'substring', 'text:string startIndex:integer length:integer?', 'string', 'Characters from a position for a length.'),
  entry('String', 'toLower', 'text:string', 'string', 'Lower-case the text.'),
  entry('String', 'toUpper', 'text:string', 'string', 'Upper-case the text.'),
  entry('String', 'trim', 'text:string', 'string', 'Remove leading and trailing whitespace.'),
  entry('String', 'trimByteOrderMark', 'text:string', 'string', 'Remove a leading byte-order mark.'),

  // ---- Collection (14) ----
  entry('Collection', 'chunk', 'collection:any length:integer', 'collection', 'Split a string or array into chunks of equal length.'),
  entry('Collection', 'contains', 'collection:any value:any', 'boolean', 'True when the collection holds the value.'),
  entry('Collection', 'empty', 'collection:any', 'boolean', 'True when the collection is empty.'),
  entry('Collection', 'first', 'collection:collection', 'any', 'First item in the collection.'),
  entry('Collection', 'intersection', 'collection1:collection collection2:collection*', 'collection', 'Items common to every collection.'),
  entry('Collection', 'item', '', 'any', 'Current item of the enclosing repeating action.'),
  entry('Collection', 'join', 'collection:collection delimiter:string', 'string', 'Join items into one delimited string.'),
  entry('Collection', 'last', 'collection:collection', 'any', 'Last item in the collection.'),
  entry('Collection', 'length', 'value:any', 'integer', 'Number of items in a collection or characters in a string.'),
  entry('Collection', 'reverse', 'collection:collection', 'collection', 'Reverse the item order.'),
  entry('Collection', 'skip', 'collection:collection count:integer', 'collection', 'Drop items from the front.'),
  entry('Collection', 'sort', 'collection:collection sortBy:string?', 'collection', 'Sort items, optionally by a key.'),
  entry('Collection', 'take', 'collection:collection count:integer', 'collection', 'Keep items from the front.'),
  entry('Collection', 'union', 'collection1:collection collection2:collection*', 'collection', 'All items from every collection, deduplicated.'),

  // ---- Logical (12) ----
  entry('Logical', 'and', 'expression1:boolean expression2:boolean*', 'boolean', 'True when every expression is true.'),
  entry('Logical', 'equals', 'object1:any object2:any', 'boolean', 'True when both values are equivalent.'),
  entry('Logical', 'greater', 'value:any compareTo:any', 'boolean', 'True when the first value is greater.'),
  entry('Logical', 'greaterOrEquals', 'value:any compareTo:any', 'boolean', 'True when the first value is greater or equal.'),
  entry('Logical', 'if', 'expression:boolean valueIfTrue:any valueIfFalse:any', 'any', 'Pick a value on a condition.'),
  entry('Logical', 'isFloat', 'value:string locale:string?', 'boolean', 'True when the string is a floating-point number.'),
  entry('Logical', 'isInt', 'value:string', 'boolean', 'True when the string is an integer.'),
  entry('Logical', 'less', 'value:any compareTo:any', 'boolean', 'True when the first value is less.'),
  entry('Logical', 'lessOrEquals', 'value:any compareTo:any', 'boolean', 'True when the first value is less or equal.'),
  entry('Logical', 'not', 'expression:boolean', 'boolean', 'Invert a boolean.'),
  entry('Logical', 'or', 'expression1:boolean expression2:boolean*', 'boolean', 'True when any expression is true.'),
  entry('Logical', 'strongEquals', 'object1:any object2:any', 'boolean', 'True when both values match without type coercion.'),

  // ---- Math (10) ----
  entry('Math', 'add', 'summand1:number summand2:number', 'number', 'Add two numbers.'),
  entry('Math', 'div', 'dividend:number divisor:number', 'number', 'Divide the first number by the second.'),
  entry('Math', 'max', 'number1:number number2:number*', 'number', 'Largest value.'),
  entry('Math', 'min', 'number1:number number2:number*', 'number', 'Smallest value.'),
  entry('Math', 'mod', 'dividend:number divisor:number', 'number', 'Remainder of a division.'),
  entry('Math', 'mul', 'multiplicand1:number multiplicand2:number', 'number', 'Multiply two numbers.'),
  entry('Math', 'pow', 'base:number exponent:number', 'number', 'Raise a number to a power.'),
  entry('Math', 'rand', 'minValue:integer maxValue:integer', 'integer', 'Random integer in a range.'),
  entry('Math', 'range', 'startIndex:integer count:integer', 'collection', 'Array of integers starting at a number.'),
  entry('Math', 'sub', 'minuend:number subtrahend:number', 'number', 'Subtract the second number from the first.'),

  // ---- Date and time (23) ----
  entry('Date and time', 'addDays', 'timestamp:timestamp days:integer format:string?', 'string', 'Add days to a timestamp.', { timestamp: '2018-03-15T00:00:00Z' }),
  entry('Date and time', 'addHours', 'timestamp:timestamp hours:integer format:string?', 'string', 'Add hours to a timestamp.', { timestamp: '2018-03-15T00:00:00Z' }),
  entry('Date and time', 'addMinutes', 'timestamp:timestamp minutes:integer format:string?', 'string', 'Add minutes to a timestamp.', { timestamp: '2018-03-15T00:10:00Z' }),
  entry('Date and time', 'addSeconds', 'timestamp:timestamp seconds:integer format:string?', 'string', 'Add seconds to a timestamp.', { timestamp: '2018-03-15T00:00:00Z' }),
  entry('Date and time', 'addToTime', 'timestamp:timestamp interval:integer timeUnit:string format:string?', 'string', 'Add a number of time units to a timestamp.', { timestamp: '2018-01-01T00:00:00Z' }),
  entry('Date and time', 'convertFromUtc', 'timestamp:timestamp destinationTimeZone:string format:string?', 'string', 'Convert a timestamp from UTC to a time zone.', { timestamp: '2018-01-01T08:00:00.0000000Z' }),
  entry('Date and time', 'convertTimeZone', 'timestamp:timestamp sourceTimeZone:string destinationTimeZone:string format:string?', 'string', 'Convert a timestamp between time zones.', { timestamp: '2018-01-01T08:00:00.0000000Z' }),
  entry('Date and time', 'convertToUtc', 'timestamp:timestamp sourceTimeZone:string format:string?', 'string', 'Convert a timestamp from a time zone to UTC.', { timestamp: '01/01/2018 00:00:00' }),
  entry('Date and time', 'dateDifference', 'startDate:timestamp endDate:timestamp', 'string', 'Difference between two timestamps.', { startDate: '2015-02-08', endDate: '2018-07-30' }),
  entry('Date and time', 'dayOfMonth', 'timestamp:timestamp', 'integer', 'Day of the month.', { timestamp: '2018-03-15T13:27:36Z' }),
  entry('Date and time', 'dayOfWeek', 'timestamp:timestamp', 'integer', 'Day of the week, Sunday is 0.', { timestamp: '2018-03-15T13:27:36Z' }),
  entry('Date and time', 'dayOfYear', 'timestamp:timestamp', 'integer', 'Day of the year.', { timestamp: '2018-03-15T13:27:36Z' }),
  entry('Date and time', 'formatDateTime', 'timestamp:timestamp format:string? locale:string?', 'string', 'Format a timestamp.', { timestamp: '03/15/2018' }),
  entry('Date and time', 'formatTimeSpan', 'timespan:string format:string? locale:string?', 'string', 'Format a time span.'),
  entry('Date and time', 'getFutureTime', 'interval:integer timeUnit:string format:string?', 'string', 'Current timestamp plus an interval.'),
  entry('Date and time', 'getPastTime', 'interval:integer timeUnit:string format:string?', 'string', 'Current timestamp minus an interval.'),
  entry('Date and time', 'parseDateTime', 'timestamp:string locale:string? format:string?', 'string', 'Parse a timestamp from a string.'),
  entry('Date and time', 'startOfDay', 'timestamp:timestamp format:string?', 'string', 'Start of the day for a timestamp.', { timestamp: '2018-03-15T13:30:30Z' }),
  entry('Date and time', 'startOfHour', 'timestamp:timestamp format:string?', 'string', 'Start of the hour for a timestamp.', { timestamp: '2018-03-15T13:30:30Z' }),
  entry('Date and time', 'startOfMonth', 'timestamp:timestamp format:string?', 'string', 'Start of the month for a timestamp.', { timestamp: '2018-03-15T13:30:30Z' }),
  entry('Date and time', 'subtractFromTime', 'timestamp:timestamp interval:integer timeUnit:string format:string?', 'string', 'Subtract a number of time units from a timestamp.', { timestamp: '2018-01-02T00:00:00Z' }),
  entry('Date and time', 'ticks', 'timestamp:timestamp', 'number', 'Number of 100-nanosecond ticks since 0001-01-01.', { timestamp: '2018-03-15T13:27:36Z' }),
  entry('Date and time', 'utcNow', 'format:string?', 'string', 'Current timestamp in UTC.'),
];

/**
 * First match wins. Learn lists chunk, length, isFloat and isInt in two
 * categories, but each is one function with one signature (a test pins that),
 * so either entry gives the same answer.
 */
export function findFunction(name: string): CatalogFunction | undefined {
  return FUNCTION_CATALOG.find((fn) => fn.name === name);
}
