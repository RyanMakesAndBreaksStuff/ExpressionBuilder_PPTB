import { needsRightOperand, OPERATORS_BY_FIELD_TYPE } from './operators';
import type { ExpressionNode, FieldType, FunctionCallNode, ValueType } from './types';

const BOOLEAN_FUNCTIONS = new Set([
  'and',
  'or',
  'equals',
  'greater',
  'less',
  'greaterOrEquals',
  'lessOrEquals',
  'contains',
  'startsWith',
  'endsWith',
  'empty',
  'not',
]);

const STRING_WRAPPERS = new Set(['toLower', 'toUpper', 'trim']);

export const RULE_WRAPPER_NAMES = ['toLower', 'toUpper', 'trim', 'length', 'coalesce'] as const;

export type RuleWrapperName = (typeof RULE_WRAPPER_NAMES)[number];

const RULE_WRAPPER_SET = new Set<string>(RULE_WRAPPER_NAMES);

/** Reachable outputs of an operand. Not part of the package export. */
export interface EffectiveType {
  type: FieldType | null;
  types: readonly FieldType[];
  nullable: boolean;
  unresolved: boolean;
  unmodelled: boolean;
  definiteNull: boolean;
  /** Non-finite literal already reported by formatNode. Do not add a type diagnostic. */
  inert: boolean;
}

export interface WrapperChainContract {
  /** Concrete type. Null when mixed, invalid, or unmodelled. */
  outputType: FieldType | null;
  /** Reachable outputs in inference order. Empty unless the chain is valid and modelled. */
  outputTypes: readonly FieldType[];
  /** Empty unless `valid` is true and `unmodelled` is false. */
  operators: readonly string[];
  /** Empty unless `valid` is true and `unmodelled` is false. */
  appendableWrappers: readonly RuleWrapperName[];
  /** True only for a concrete dateTime result. Text transforms never set this. */
  normalizesDates: boolean;
  /** True when a valid chain has two or more reachable output types. */
  mixed: boolean;
  /** True when compatibility could not be established. */
  unmodelled: boolean;
  /** False when a wrapper in the chain rejects its input or is not a rule wrapper. */
  valid: boolean;
}

interface FieldTypeInfo {
  type: FieldType;
  nullable?: boolean;
}

export function isRuleWrapperName(name: string): name is RuleWrapperName {
  return RULE_WRAPPER_SET.has(name);
}

export function isTicksCall(node: FunctionCallNode): boolean {
  return node.name === 'ticks';
}

function concrete(type: FieldType, nullable = false): EffectiveType {
  return { type, types: [type], nullable, unresolved: false, unmodelled: false, definiteNull: false, inert: false };
}

function unresolvedType(): EffectiveType {
  return { type: null, types: [], nullable: false, unresolved: true, unmodelled: false, definiteNull: false, inert: false };
}

function unmodelledType(): EffectiveType {
  return { type: null, types: [], nullable: false, unresolved: false, unmodelled: true, definiteNull: false, inert: false };
}

function nullType(): EffectiveType {
  return { type: null, types: [], nullable: false, unresolved: false, unmodelled: false, definiteNull: true, inert: false };
}

function inertType(): EffectiveType {
  return { type: null, types: [], nullable: false, unresolved: false, unmodelled: false, definiteNull: false, inert: true };
}

function mixed(types: readonly FieldType[], nullable: boolean): EffectiveType {
  return { type: null, types, nullable, unresolved: false, unmodelled: false, definiteNull: false, inert: false };
}

export function describeEffectiveType(effect: EffectiveType): string {
  if (effect.definiteNull) return 'null';
  if (effect.types.length === 0) return 'unknown';
  return effect.types.join(' | ');
}

function isStringLikeType(type: FieldType): boolean {
  return type === 'string' || type === 'dateTime';
}

export function acceptsStringLike(effect: EffectiveType): boolean {
  if (effect.unresolved || effect.unmodelled || effect.definiteNull || effect.inert || effect.types.length === 0) return false;
  return effect.types.every(isStringLikeType);
}

function isCompatibleType(leftType: FieldType, rightType: FieldType): boolean {
  if (leftType === 'choice') {
    return rightType === 'choice' || rightType === 'string' || rightType === 'number';
  }

  return leftType === rightType;
}

function skipsType(effect: EffectiveType): boolean {
  return effect.unresolved || effect.unmodelled || effect.definiteNull || effect.inert || effect.types.length === 0;
}

export function resolveEffectiveType(
  node: ExpressionNode,
  lookup: (fieldId: string) => FieldTypeInfo | undefined,
): EffectiveType {
  switch (node.kind) {
    case 'field': {
      const field = lookup(node.fieldId);
      return field ? concrete(field.type, field.nullable === true) : unresolvedType();
    }
    case 'literal':
      if (typeof node.value === 'number' && !Number.isFinite(node.value)) return inertType();
      if (node.value === null || node.valueType === 'null') return nullType();
      if (node.valueType === 'unknown') return unmodelledType();
      return concrete(node.valueType);
    case 'group':
    case 'rule':
      return concrete('boolean');
    case 'function':
      return functionType(node, lookup);
  }
}

function functionType(node: FunctionCallNode, lookup: (fieldId: string) => FieldTypeInfo | undefined): EffectiveType {
  if (STRING_WRAPPERS.has(node.name)) return nominalWrapper(node, lookup, 'string');
  if (node.name === 'length') return nominalWrapper(node, lookup, 'number');
  if (node.name === 'coalesce') return coalesceType(node.args, lookup);
  if (node.name === 'utcNow' || node.name === 'addDays') return concrete('dateTime');
  if (node.name === 'ticks') return concrete('number');
  if (BOOLEAN_FUNCTIONS.has(node.name)) return concrete('boolean');
  return unmodelledType();
}

function nominalWrapper(
  node: FunctionCallNode,
  lookup: (fieldId: string) => FieldTypeInfo | undefined,
  output: 'string' | 'number',
): EffectiveType {
  const arg = node.args[0];
  if (!arg) return concrete(output);
  const input = resolveEffectiveType(arg, lookup);
  if (input.unresolved) return unresolvedType();
  if (input.inert) return inertType();
  if (input.unmodelled) return unmodelledType();
  return concrete(output, acceptsStringLike(input) && input.nullable);
}

function coalesceType(args: ExpressionNode[], lookup: (fieldId: string) => FieldTypeInfo | undefined): EffectiveType {
  if (args.length === 0) return unmodelledType();

  const reachable: FieldType[] = [];
  const seen = new Set<FieldType>();
  const add = (type: FieldType) => {
    if (seen.has(type)) return;
    seen.add(type);
    reachable.push(type);
  };

  for (const arg of args) {
    const effect = resolveEffectiveType(arg, lookup);
    if (effect.unresolved) return unresolvedType();
    if (effect.inert || effect.definiteNull) continue;
    if (effect.unmodelled) {
      if (effect.nullable) continue;
      return unmodelledType();
    }

    for (const type of effect.types) add(type);
    if (!effect.nullable) return finishCoalesce(reachable, false);
  }

  return finishCoalesce(reachable, true);
}

function finishCoalesce(types: readonly FieldType[], nullable: boolean): EffectiveType {
  if (types.length === 0) return nullType();
  if (types.length === 1) return concrete(types[0], nullable);
  return mixed(types, nullable);
}

export function effectiveReturnType(effect: EffectiveType): ValueType | 'boolean' {
  if (effect.definiteNull || effect.inert) return 'null';
  if (effect.type) return effect.type;
  return 'unknown';
}

function intersectOperators(types: readonly FieldType[]): string[] {
  const [first, ...rest] = types;
  if (!first) return [];
  return rest.reduce<string[]>(
    (ops, type) => ops.filter((operator) => OPERATORS_BY_FIELD_TYPE[type].includes(operator)),
    [...OPERATORS_BY_FIELD_TYPE[first]],
  );
}

function strictOperator(operator: string): boolean {
  return (
    operator === 'greater' ||
    operator === 'less' ||
    operator === 'greaterOrEquals' ||
    operator === 'lessOrEquals' ||
    operator === 'contains' ||
    operator === 'startsWith' ||
    operator === 'endsWith'
  );
}

export function operatorFitsEffective(effect: EffectiveType, operator: string): boolean {
  if (effect.types.length > 1) return intersectOperators(effect.types).includes(operator);
  if (!effect.type) return false;
  return OPERATORS_BY_FIELD_TYPE[effect.type].includes(operator);
}

export function effectsCompatible(left: EffectiveType, right: EffectiveType, operator: string): boolean {
  if (skipsType(left) || skipsType(right)) return true;
  if (left.types.length > 1 || right.types.length > 1) {
    if (strictOperator(operator)) return false;
    return left.types.some((leftType) => right.types.some((rightType) => isCompatibleType(leftType, rightType)));
  }
  if (!left.type || !right.type) return true;
  return isCompatibleType(left.type, right.type);
}

function operatorsFor(left: EffectiveType, right: EffectiveType): readonly string[] {
  if (skipsType(left)) return [];
  const base = left.types.length > 1 ? intersectOperators(left.types) : left.type ? [...OPERATORS_BY_FIELD_TYPE[left.type]] : [];
  return base.filter((operator) => !needsRightOperand(operator) || effectsCompatible(left, right, operator));
}

function wrapperCall(inner: ExpressionNode, name: string): ExpressionNode {
  if (name === 'coalesce') {
    return { kind: 'function', name, args: [inner, { kind: 'literal', value: '', valueType: 'string' }] };
  }

  return { kind: 'function', name, args: [inner] };
}

function chainAst(wrappers: readonly string[]): ExpressionNode {
  return wrappers.reduce<ExpressionNode>((inner, name) => wrapperCall(inner, name), { kind: 'field', fieldId: '$' });
}

function inputRejected(node: ExpressionNode, lookup: (fieldId: string) => FieldTypeInfo | undefined): boolean {
  if (node.kind !== 'function') return false;
  if (!isRuleWrapperName(node.name)) return true;
  if (node.args.some((arg) => inputRejected(arg, lookup))) return true;
  if (node.name === 'coalesce') return false;

  const arg = node.args[0];
  if (!arg) return true;
  const input = resolveEffectiveType(arg, lookup);
  if (input.unresolved || input.unmodelled || input.inert) return true;
  return !acceptsStringLike(input);
}

function canAppend(effect: EffectiveType, name: RuleWrapperName): boolean {
  if (name === 'coalesce') return true;
  return acceptsStringLike(effect);
}

/**
 * Effective contract for a rule-editor wrapper chain.
 * `wrappers` is outer-last, matching `toLower(trim(field))` for `['trim', 'toLower']`.
 * `coalesce` uses the editor fallback `''` and does not rewrite that fallback.
 */
export function wrapperChainContract(
  field: { type: FieldType; nullable?: boolean },
  wrappers: readonly string[],
): WrapperChainContract {
  const leftLookup = (): FieldTypeInfo => ({ type: field.type, nullable: field.nullable === true });
  const rightLookup = (): FieldTypeInfo => ({ type: field.type, nullable: false });
  const leftNode = chainAst(wrappers);
  const rightNode = chainAst(wrappers);
  const left = resolveEffectiveType(leftNode, leftLookup);
  const right = resolveEffectiveType(rightNode, rightLookup);
  const known = wrappers.every((name) => RULE_WRAPPER_SET.has(name));
  const valid = known && !inputRejected(leftNode, leftLookup) && !inputRejected(rightNode, rightLookup) && !left.unmodelled;
  const offer = valid && !left.unmodelled;

  return {
    outputType: offer ? left.type : null,
    outputTypes: offer ? [...left.types] : [],
    operators: offer ? operatorsFor(left, right) : [],
    appendableWrappers: offer ? RULE_WRAPPER_NAMES.filter((name) => canAppend(left, name)) : [],
    normalizesDates: offer && left.type === 'dateTime',
    mixed: offer && left.types.length > 1,
    unmodelled: !known || left.unmodelled,
    valid,
  };
}
