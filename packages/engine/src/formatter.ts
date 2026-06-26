import { diagnostic } from './diagnostics';
import { formatFieldReference } from './fieldReferences';
import { inferFunctionReturnType, isTicksCall } from './functions';
import { formatLiteral } from './literals';
import { isDateComparison, isOperatorSupported, isStringComparison, needsRightOperand } from './operators';
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
  const left = formatNode(node.left, context, `${path}.left`, depth + 1);
  const leftField = node.left.kind === 'field' ? resolveField(node.left, context, `${path}.left`) : undefined;
  const fieldType = leftField?.type ?? left.returnType;

  if (leftField && !isOperatorSupported(leftField.type, node.operator)) {
    context.diagnostics.push(
      diagnostic('UNSUPPORTED_OPERATOR', `Operator "${node.operator}" is not supported for ${leftField.type} fields.`, path),
    );
  }

  if ((node.operator === 'empty' || node.operator === 'notEmpty') && (fieldType === 'number' || fieldType === 'boolean')) {
    context.diagnostics.push(
      diagnostic('TYPE_MISMATCH', `Operator "${node.operator}" cannot be used with ${fieldType} values.`, path),
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
  const rightType =
    node.right.kind === 'field' ? (resolveField(node.right, context, `${path}.right`)?.type ?? 'unknown') : right.returnType;

  if (leftField && rightType !== 'unknown' && rightType !== 'null' && !isCompatibleType(leftField.type, rightType)) {
    context.diagnostics.push(
      diagnostic('TYPE_MISMATCH', `Operator "${node.operator}" compares ${leftField.type} to ${rightType}.`, path),
    );
  }

  const operands = formatOperandsForOperator(node, left, right, leftField);
  const expression = formatOperator(node.operator, operands.left, operands.right);
  return { expression, returnType: 'boolean' };
}

function formatFunction(node: FunctionCallNode, context: FormatContext, path: string, depth: number): NodeFormat {
  const args = node.args.map((arg, index) => formatNode(arg, context, `${path}.args[${index}]`, depth + 1));

  if (
    (node.name === 'toLower' || node.name === 'toUpper' || node.name === 'trim') &&
    node.args[0]?.kind === 'field'
  ) {
    const field = resolveField(node.args[0], context, `${path}.args[0]`);
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

  return {
    expression: `${node.name}(${args.map((arg) => arg.expression).join(', ')})`,
    returnType: inferFunctionReturnType(node),
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

function resolveField(node: FieldReferenceNode, context: FormatContext, path: string): FieldDefinition | undefined {
  const field = context.fieldsById.get(node.fieldId);
  if (!field) {
    context.diagnostics.push(diagnostic('UNKNOWN_FIELD', `Unknown field "${node.fieldId}".`, path));
  }

  return field;
}

function formatOperandsForOperator(
  node: RuleNode,
  left: NodeFormat,
  right: NodeFormat,
  leftField: FieldDefinition | undefined,
): { left: string; right: string } {
  if (leftField?.type === 'dateTime' && isDateComparison(node.operator)) {
    return {
      left: wrapTicks(left.expression),
      right: node.right?.kind === 'function' && isTicksCall(node.right) ? right.expression : wrapTicks(right.expression),
    };
  }

  if (node.caseInsensitive && leftField?.type === 'string' && isStringComparison(node.operator)) {
    return {
      left: `toLower(${wrapNullableStringField(left.expression)})`,
      right: `toLower(${right.expression})`,
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

function wrapNullableStringField(expression: string): string {
  return `coalesce(${expression}, '')`;
}

function isCompatibleType(fieldType: FieldDefinition['type'], valueType: ValueType | PredicateType): boolean {
  if (fieldType === 'choice') {
    return valueType === 'choice' || valueType === 'string' || valueType === 'number';
  }

  return fieldType === valueType;
}
