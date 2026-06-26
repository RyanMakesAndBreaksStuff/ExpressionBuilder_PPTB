export type ExpressionMode = 'triggerCondition' | 'filterArray';
export type FieldType = 'string' | 'number' | 'boolean' | 'dateTime' | 'choice';
export type ValueType = FieldType | 'null' | 'unknown';
export type PredicateType = 'boolean';
export type Conjunction = 'and' | 'or';
export type FieldSourceKind = 'dataverse';

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  path: string[];
  choices?: string[];
  options?: Array<{ label: string; value: number }>;
  nullable?: boolean;
  source?: FieldSourceKind;
  logicalName?: string;
  group?: string;
  orphaned?: boolean;
}

export type ExpressionNode =
  | GroupNode
  | RuleNode
  | FunctionCallNode
  | FieldReferenceNode
  | LiteralNode;

export interface GroupNode {
  kind: 'group';
  conjunction: Conjunction;
  children: ExpressionNode[];
}

export interface RuleNode {
  kind: 'rule';
  operator: string;
  left: ExpressionNode;
  right?: ExpressionNode;
}

export interface FunctionCallNode {
  kind: 'function';
  name: string;
  args: ExpressionNode[];
}

export interface FieldReferenceNode {
  kind: 'field';
  fieldId: string;
}

export interface LiteralNode {
  kind: 'literal';
  value: string | number | boolean | null;
  valueType: ValueType;
}

export interface FormatDiagnostic {
  code:
    | 'EMPTY_GROUP'
    | 'INVALID_ROOT_TYPE'
    | 'MISSING_OPERAND'
    | 'UNKNOWN_FIELD'
    | 'UNSUPPORTED_OPERATOR'
    | 'TYPE_MISMATCH'
    | 'UNSAFE_NULL_STRING_WRAPPER'
    | 'MAX_DEPTH';
  message: string;
  severity: 'error' | 'warning';
  path: string;
}

export interface FormatterOptions {
  mode: ExpressionMode;
  fields: FieldDefinition[];
  maxDepth?: number;
}

export interface FormatResult {
  expression: string;
  diagnostics: FormatDiagnostic[];
  returnType: PredicateType | ValueType;
}
