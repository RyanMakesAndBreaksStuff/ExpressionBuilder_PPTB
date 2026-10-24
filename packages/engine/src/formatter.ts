import { diagnostic } from './diagnostics';
import { formatFieldReference } from './fieldReferences';
import {
  acceptsStringLike,
  describeEffectiveType,
  effectiveReturnType,
  effectsCompatible,
  isRuleWrapperName,
  isTicksCall,
  operatorFitsEffective,
  resolveEffectiveType,
  type EffectiveType,
} from './functions';
import { formatLiteral } from './literals';
import { isDateComparison, isOperatorSupported, needsRightOperand } from './operators';
import type {
  ExpressionNode,
  FieldDefinition,
  FieldReferenceNode,
  FormatDiagnostic,
  FormatterOptions,
  FormatResult,
  FunctionCallNode,
  PredicateType,
  RuleNode,
  ValueType,
} from './types';

interface FormatContext {
  options: FormatterOptions;
  fieldsById: Map<string, FieldDefinition>;
  diagnostics: FormatDiagnostic[];
}

interface NodeFormat {
  expression: string;
  returnType: PredicateType | ValueType;
}

const DEFAULT_MAX_DEPTH = 12;

export function formatExpression(node: ExpressionNode, options: FormatterOptions): FormatResult {
  const context: FormatContext = {
    options,
    fieldsById: new Map(options.fields.map((field) => [field.id, field])),
    diagnostics: [],
  };

  const result = formatNode(node, context, '$', 0);
  const expression = result.expression.startsWith('@') ? result.expression : `@${result.expression}`;

  if (result.returnType !== 'boolean') {
    context.diagnostics.push(
      diagnostic('INVALID_ROOT_TYPE', 'The root expression must return a boolean predicate.', '$'),
    );
  }

  return {
    expression,
    diagnostics: context.diagnostics,
    returnType: result.returnType,
  };
}

function formatNode(node: ExpressionNode, context: FormatContext, path: string, depth: number): NodeFormat {
  if (depth > (context.options.maxDepth ?? DEFAULT_MAX_DEPTH)) {
    context.diagnostics.push(diagnostic('MAX_DEPTH', 'Expression exceeds the maximum nesting depth.', path));
    return { expression: 'null', returnType: 'unknown' };
  }

  switch (node.kind) {
    case 'group':
      return formatGroup(node.children, node.conjunction, context, path, depth);
    case 'rule':
      return formatRule(node, context, path, depth);
    case 'function':
      return formatFunction(node, context, path, depth);
    case 'field':
      return formatField(node, context, path);
    case 'literal':
      if (typeof node.value === 'number' && !Number.isFinite(node.value)) {
        context.diagnostics.push(diagnostic('INVALID_LITERAL', 'Numeric literals must be finite.', path));
        return { expression: 'null', returnType: 'null' };
      }

      return { expression: formatLiteral(node), returnType: node.valueType };
  }
}

function formatGroup(
  children: ExpressionNode[],
  conjunction: 'and' | 'or',
  context: FormatContext,
  path: string,
  depth: number,
): NodeFormat {
  if (children.length === 0) {
    context.diagnostics.push(diagnostic('EMPTY_GROUP', 'A predicate group must contain at least one condition.', path));
    return { expression: `${conjunction}()`, returnType: 'boolean' };
  }

  const formatted = children.map((child, index) => formatNode(child, context, `${path}.children[${index}]`, depth + 1));
  return {
    expression: `${conjunction}(${formatted.map((item) => item.expression).join(', ')})`,
    returnType: 'boolean',
  };
}

function formatRule(node: RuleNode, context: FormatContext, path: string, depth: number): NodeFormat {
  const lookup = fieldLookup(context);
  const left = formatNode(node.left, context, `${path}.left`, depth + 1);
  const leftEffect = resolveEffectiveType(node.left, lookup);
  const typed = node.left.kind === 'field' || (node.left.kind === 'function' && isRuleWrapperName(node.left.name));

  if (typed && leftEffect.type && !isOperatorSupported(leftEffect.type, node.operator)) {
    const subject = node.left.kind === 'field' ? `${leftEffect.type} fields` : `${leftEffect.type} values`;
    context.diagnostics.push(
      diagnostic('UNSUPPORTED_OPERATOR', `Operator "${node.operator}" is not supported for ${subject}.`, path),
    );
  }

  if ((node.operator === 'empty' || node.operator === 'notEmpty') && (leftEffect.type === 'number' || leftEffect.type === 'boolean')) {
    context.diagnostics.push(
      diagnostic('TYPE_MISMATCH', `Operator "${node.operator}" cannot be used with ${leftEffect.type} values.`, path),
    );
  }

  const mixed = typed && leftEffect.types.length > 1;
  const mixedOperatorRejected = mixed && !operatorFitsEffective(leftEffect, node.operator);
  if (mixedOperatorRejected) {
    context.diagnostics.push(
      diagnostic(
        'TYPE_MISMATCH',
        `Operator "${node.operator}" cannot be used with ${describeEffectiveType(leftEffect)} values.`,
        path,
      ),
    );
  }

  if (!needsRightOperand(node.operator)) {
    const emptyExpression = `empty(${left.expression})`;
    return {
      expression: node.operator === 'notEmpty' ? `not(${emptyExpression})` : emptyExpression,
      returnType: 'boolean',
    };
  }

  if (!node.right) {
    context.diagnostics.push(diagnostic('MISSING_OPERAND', `Operator "${node.operator}" requires a right operand.`, path));
    return { expression: `${operatorFunction(node.operator)}(${left.expression}, null)`, returnType: 'boolean' };
  }

  const right = formatNode(node.right, context, `${path}.right`, depth + 1);
  const rightEffect = resolveEffectiveType(node.right, lookup);
  const explicitTicks =
    leftEffect.type === 'dateTime' &&
    isDateComparison(node.operator) &&
    node.right.kind === 'function' &&
    isTicksCall(node.right);

  if (typed && !explicitTicks && !mixedOperatorRejected && !effectsCompatible(leftEffect, rightEffect, node.operator)) {
    context.diagnostics.push(
      diagnostic(
        'TYPE_MISMATCH',
        `Operator "${node.operator}" compares ${describeEffectiveType(leftEffect)} to ${describeEffectiveType(rightEffect)}.`,
        path,
      ),
    );
  }

  const operands = formatOperandsForOperator(node, left, right, leftEffect);
  const expression = formatOperator(node.operator, operands.left, operands.right);
  return { expression, returnType: 'boolean' };
}

function formatFunction(node: FunctionCallNode, context: FormatContext, path: string, depth: number): NodeFormat {
  const args = node.args.map((arg, index) => formatNode(arg, context, `${path}.args[${index}]`, depth + 1));

  const lookup = fieldLookup(context);

  if (
    (node.name === 'toLower' || node.name === 'toUpper' || node.name === 'trim') &&
    node.args[0]?.kind === 'field'
  ) {
    const field = lookupField(node.args[0], context);
    if (field?.nullable) {
      context.diagnostics.push(
        diagnostic(
          'UNSAFE_NULL_STRING_WRAPPER',
          `Wrap nullable field "${field.label}" with coalesce before ${node.name}().`,
          path,
          'warning',
        ),
      );
    }
  }

  if (node.name === 'toLower' || node.name === 'toUpper' || node.name === 'trim' || node.name === 'length') {
    reportStringLikeInput(node, context, path, lookup);
  } else if (node.name === 'coalesce' && resolveEffectiveType(node, lookup).unmodelled) {
    context.diagnostics.push(
      diagnostic('UNMODELLED_RESULT', 'Compatibility could not be established for this result.', path, 'warning'),
    );
  }

  return {
    expression: `${node.name}(${args.map((arg) => arg.expression).join(', ')})`,
    returnType: effectiveReturnType(resolveEffectiveType(node, lookup)),
  };
}

function formatField(node: FieldReferenceNode, context: FormatContext, path: string): NodeFormat {
  const field = resolveField(node, context, path);
  if (!field) {
    return { expression: `unknownField('${node.fieldId.replaceAll("'", "''")}')`, returnType: 'unknown' };
  }

  return {
    expression: formatFieldReference(field, context.options.mode),
    returnType: field.type,
  };
}

function lookupField(node: FieldReferenceNode, context: FormatContext): FieldDefinition | undefined {
  return context.fieldsById.get(node.fieldId);
}

function fieldLookup(context: FormatContext): (fieldId: string) => { type: FieldDefinition['type']; nullable?: boolean } | undefined {
  return (fieldId: string) => {
    const field = context.fieldsById.get(fieldId);
    return field ? { type: field.type, nullable: field.nullable } : undefined;
  };
}

function reportStringLikeInput(
  node: FunctionCallNode,
  context: FormatContext,
  path: string,
  lookup: (fieldId: string) => { type: FieldDefinition['type']; nullable?: boolean } | undefined,
): void {
  const arg = node.args[0];
  if (!arg) {
    context.diagnostics.push(diagnostic('TYPE_MISMATCH', `Function "${node.name}" requires a string input.`, path));
    return;
  }

  const input = resolveEffectiveType(arg, lookup);
  if (input.unresolved || input.inert) return;
  if (input.unmodelled) {
    context.diagnostics.push(
      diagnostic('UNMODELLED_RESULT', 'Compatibility could not be established for this result.', path, 'warning'),
    );
    return;
  }

  if (!acceptsStringLike(input)) {
    context.diagnostics.push(
      diagnostic('TYPE_MISMATCH', `Function "${node.name}" does not accept ${describeEffectiveType(input)} inputs.`, path),
    );
  }
}

function resolveField(node: FieldReferenceNode, context: FormatContext, path: string): FieldDefinition | undefined {
  const field = lookupField(node, context);
  if (!field) {
    context.diagnostics.push(diagnostic('UNKNOWN_FIELD', `Unknown field "${node.fieldId}".`, path));
  }

  return field;
}

function formatOperandsForOperator(
  node: RuleNode,
  left: NodeFormat,
  right: NodeFormat,
  leftEffect: EffectiveType,
): { left: string; right: string } {
  if (leftEffect.type === 'dateTime' && isDateComparison(node.operator)) {
    return {
      left: wrapTicks(left.expression),
      right: node.right?.kind === 'function' && isTicksCall(node.right) ? right.expression : wrapTicks(right.expression),
    };
  }

  return { left: left.expression, right: right.expression };
}

function formatOperator(operator: string, left: string, right: string): string {
  const expression = `${operatorFunction(operator)}(${left}, ${right})`;
  return operator === 'notEquals' ? `not(${expression})` : expression;
}

function operatorFunction(operator: string): string {
  return operator === 'notEquals' ? 'equals' : operator;
}

function wrapTicks(expression: string): string {
  return expression.startsWith('ticks(') ? expression : `ticks(${expression})`;
}
