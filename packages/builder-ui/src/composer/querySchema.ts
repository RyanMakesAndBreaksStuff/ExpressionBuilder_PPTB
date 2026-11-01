import type { Conjunction, ExpressionMode, FieldDefinition } from '@ryanmakes/eb_engine';

export type DataSourceKind = 'dataverse' | 'sample' | 'import' | 'profile' | 'unknown';

export interface DataSourceDescriptor {
  kind: DataSourceKind;
  label?: string;
  tableLogicalName?: string;
  includeRelated?: boolean;
  fetchedAt?: number;
}

export interface QueryDocument {
  version: 1 | 2;
  mode: ExpressionMode;
  fields: FieldDefinition[];
  root: QueryGroup;
  selectedRuleId?: string;
  /** Group that new rules/groups/fields are added to. Falls back to root.id when unset. */
  activeGroupId?: string;
  source?: DataSourceDescriptor;
}

export type QueryNode = QueryGroup | QueryRule;

export interface QueryGroup {
  id: string;
  kind: 'group';
  conjunction: Conjunction;
  children: QueryNode[];
}

export interface QueryRule {
  id: string;
  kind: 'rule';
  fieldId: string;
  operator: string;
  value?: string | number | boolean | null;
  /** Ordered function wrappers (e.g. ['trim','toLower']). Text wrappers (toLower/toUpper/trim) apply to BOTH operands; length/coalesce apply to the field side only. */
  wrappers?: string[];
}

export type RulePatch = Partial<Omit<QueryRule, 'id' | 'kind'>>;
