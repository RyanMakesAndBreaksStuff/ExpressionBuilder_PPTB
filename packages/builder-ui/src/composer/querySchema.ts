import type { Conjunction, ExpressionMode, FieldDefinition } from '@pavb/engine';

export interface QueryDocument {
  version: 1;
  mode: ExpressionMode;
  fields: FieldDefinition[];
  root: QueryGroup;
  selectedRuleId?: string;
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
  /** Ordered function wrappers applied to BOTH operands (e.g. ['trim','toLower']). */
  wrappers?: string[];
}

export type RulePatch = Partial<Omit<QueryRule, 'id' | 'kind'>>;
