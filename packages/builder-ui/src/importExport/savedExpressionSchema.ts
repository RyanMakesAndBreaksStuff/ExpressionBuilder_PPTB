import type { ExpressionMode, FieldDefinition, FieldType } from '@ryanmakes/eb_engine';
import type { QueryDocument, QueryNode } from '../composer/querySchema';

export type SavedExpressionParseResult =
  | { ok: true; document: QueryDocument }
  | { ok: false; errors: string[] };

const fieldTypes = new Set<FieldType>(['string', 'number', 'boolean', 'dateTime', 'choice']);
const modes = new Set<ExpressionMode>(['triggerCondition', 'filterArray']);
const conjunctions = new Set(['and', 'or']);

interface NodeIds {
  all: Set<string>;
  groups: Set<string>;
  rules: Set<string>;
}

export function serializeSavedExpression(document: QueryDocument): string {
  return JSON.stringify(document, null, 2);
}

export function parseSavedExpression(source: string): SavedExpressionParseResult {
  let value: unknown;

  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, errors: ['Import failed: JSON is not valid.'] };
  }

  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['Import failed: saved expression must be an object.'] };
  }

  if (value.version !== 1 && value.version !== 2) {
    errors.push('Import failed: version must be 1 or 2.');
  }

  if (typeof value.mode !== 'string' || !modes.has(value.mode as ExpressionMode)) {
    errors.push('Import failed: mode must be triggerCondition or filterArray.');
  }

  if (!Array.isArray(value.fields) || value.fields.length === 0) {
    errors.push('Import failed: fields must be a non-empty array.');
  } else {
    const fieldIds = new Set<string>();
    value.fields.forEach((field, index) => validateField(field, `fields[${index}]`, errors, fieldIds));
  }

  const ids: NodeIds = { all: new Set(), groups: new Set(), rules: new Set() };
  validateDocumentRoot(value.root, errors, ids);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Stale selection ids would point the UI at nothing; drop them instead of failing the import.
  if (typeof value.selectedRuleId === 'string' && !ids.rules.has(value.selectedRuleId)) {
    delete value.selectedRuleId;
  }
  if (typeof value.activeGroupId === 'string' && !ids.groups.has(value.activeGroupId)) {
    delete value.activeGroupId;
  }

  return { ok: true, document: value as unknown as QueryDocument };
}

function validateField(
  value: unknown,
  path: string,
  errors: string[],
  fieldIds: Set<string>,
): value is FieldDefinition {
  const before = errors.length;
  if (!isRecord(value)) {
    errors.push(`Import failed: ${path} must be an object.`);
    return false;
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    errors.push(`Import failed: ${path}.id is required.`);
  } else if (fieldIds.has(value.id)) {
    errors.push(`Import failed: ${path}.id "${value.id}" is duplicated.`);
  } else {
    fieldIds.add(value.id);
  }

  if (typeof value.label !== 'string' || value.label.length === 0) {
    errors.push(`Import failed: ${path}.label is required.`);
  }

  if (typeof value.type !== 'string' || !fieldTypes.has(value.type as FieldType)) {
    errors.push(`Import failed: ${path}.type is invalid.`);
  }

  if (!Array.isArray(value.path) || value.path.some((segment) => typeof segment !== 'string')) {
    errors.push(`Import failed: ${path}.path must be string segments.`);
  }

  if ('choices' in value && value.choices !== undefined) {
    if (!Array.isArray(value.choices) || value.choices.some((choice) => typeof choice !== 'string')) {
      errors.push(`Import failed: ${path}.choices must be strings.`);
    }
  }

  if ('options' in value && value.options !== undefined) {
    if (!Array.isArray(value.options)) {
      errors.push(`Import failed: ${path}.options must be {label, value} pairs.`);
    } else {
      let malformed = false;
      let nonFinite = false;
      for (const option of value.options) {
        if (!isRecord(option) || typeof option.label !== 'string' || typeof option.value !== 'number') {
          malformed = true;
          continue;
        }
        if (!Number.isFinite(option.value)) {
          nonFinite = true;
        }
      }
      if (malformed) {
        errors.push(`Import failed: ${path}.options must be {label, value} pairs.`);
      }
      if (nonFinite) {
        errors.push(`Import failed: ${path}.options values must be finite numbers.`);
      }
    }
  }

  return errors.length === before;
}

function validateDocumentRoot(value: unknown, errors: string[], ids: NodeIds): void {
  if (!isRecord(value)) {
    errors.push('Import failed: root must be an object.');
    return;
  }

  if (value.kind !== 'group') {
    errors.push('Import failed: root must be a group.');
    return;
  }

  validateGroup(value, 'root', errors, ids);
}

function validateNode(value: unknown, path: string, errors: string[], ids: NodeIds): value is QueryNode {
  if (!isRecord(value)) {
    errors.push(`Import failed: ${path} must be an object.`);
    return false;
  }

  if (value.kind === 'group') {
    return validateGroup(value, path, errors, ids);
  }

  if (value.kind === 'rule') {
    return validateRule(value, path, errors, ids);
  }

  errors.push(`Import failed: ${path}.kind must be group or rule.`);
  return false;
}

function validateGroup(value: Record<string, unknown>, path: string, errors: string[], ids: NodeIds): boolean {
  const before = errors.length;
  if (claimNodeId(value, path, errors, ids)) {
    ids.groups.add(value.id as string);
  }

  if (typeof value.conjunction !== 'string' || !conjunctions.has(value.conjunction)) {
    errors.push(`Import failed: ${path}.conjunction must be and or or.`);
  }

  if (!Array.isArray(value.children)) {
    errors.push(`Import failed: ${path}.children must be an array.`);
    return false;
  }

  value.children.forEach((child, index) => validateNode(child, `${path}.children[${index}]`, errors, ids));
  return errors.length === before;
}

// Groups and rules share one id space.
function claimNodeId(value: Record<string, unknown>, path: string, errors: string[], ids: NodeIds): boolean {
  if (typeof value.id !== 'string' || value.id.length === 0) {
    errors.push(`Import failed: ${path}.id is required.`);
    return false;
  }
  if (ids.all.has(value.id)) {
    errors.push(`Import failed: ${path}.id "${value.id}" is duplicated.`);
    return false;
  }
  ids.all.add(value.id);
  return true;
}

function validateRule(value: Record<string, unknown>, path: string, errors: string[], ids: NodeIds): boolean {
  const before = errors.length;
  if (claimNodeId(value, path, errors, ids)) {
    ids.rules.add(value.id as string);
  }

  if (typeof value.fieldId !== 'string' || value.fieldId.length === 0) {
    errors.push(`Import failed: ${path}.fieldId is required.`);
  }

  if (typeof value.operator !== 'string' || value.operator.length === 0) {
    errors.push(`Import failed: ${path}.operator is required.`);
  }

  if (typeof value.value === 'number' && !Number.isFinite(value.value)) {
    errors.push(`Import failed: ${path}.value must be a finite number.`);
  }

  if (value.value != null && !['string', 'number', 'boolean'].includes(typeof value.value)) {
    errors.push(`Import failed: ${path}.value must be a string, number, boolean or null.`);
  }

  if ('wrappers' in value && value.wrappers !== undefined) {
    if (!Array.isArray(value.wrappers) || value.wrappers.some((wrapper) => typeof wrapper !== 'string')) {
      errors.push(`Import failed: ${path}.wrappers must be an array of strings.`);
    }
  }

  return errors.length === before;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
