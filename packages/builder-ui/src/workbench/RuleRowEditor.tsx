import { useEffect, useRef } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { coerceValueForField, findField, getOperatorsForField, getSafeOperator } from '../app/builderState';
import type { QueryRule } from '../composer/querySchema';
import type { RuleRowEditorProps } from './types';

export function RuleRowEditor({ fields, onDelete, onDuplicate, onSelect, onUpdate, rule, selected }: RuleRowEditorProps) {
  const field = findField(fields, rule.fieldId);
  const fieldLabel = field?.label ?? rule.fieldId;
  const valueLabel = getRuleValueLabel(rule, field);

  if (!field) {
    return null;
  }

  return (
    <div
      className={`eb-rule-row-editor ${selected ? 'is-selected' : ''}`}
      role="group"
      aria-label={`${fieldLabel} ${rule.operator} ${valueLabel}`}
      onClick={() => onSelect(rule.id)}
      onFocusCapture={() => onSelect(rule.id)}
    >
      <div className="eb-rule-row-grid">
        <div>
          <label className="eb-label" htmlFor={`field-${rule.id}`}>
            Field for {fieldLabel}
          </label>
          <select
            id={`field-${rule.id}`}
            className="eb-select"
            value={rule.fieldId}
            onChange={(event) => {
              const nextField = findField(fields, event.target.value);
              if (!nextField) {
                return;
              }

              onUpdate(rule.id, {
                fieldId: nextField.id,
                operator: getSafeOperator(nextField, rule.operator),
                value: getDefaultValue(nextField),
                caseInsensitive: false,
              });
            }}
          >
            {fields.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eb-label" htmlFor={`operator-${rule.id}`}>
            Operator for {fieldLabel}
          </label>
          <select
            id={`operator-${rule.id}`}
            className="eb-select"
            value={rule.operator}
            onChange={(event) => onUpdate(rule.id, { operator: event.target.value })}
          >
            {getOperatorsForField(field).map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>

        <ValueEditor rule={rule} field={field} onUpdate={(patch) => onUpdate(rule.id, patch)} />
      </div>

      <div className="eb-rule-row-actions">
        <button
          type="button"
          className="eb-action-btn eb-action-subtle"
          onClick={() => onUpdate(rule.id, { caseInsensitive: true })}
          disabled={field.type !== 'string'}
        >
          Wrap both sides in toLower()
        </button>
        <button type="button" className="eb-action-btn eb-action-subtle" aria-label={`Duplicate ${fieldLabel} rule`} onClick={() => onDuplicate(rule.id)}>
          Duplicate
        </button>
        <button type="button" className="eb-action-btn eb-action-subtle" aria-label={`Delete ${fieldLabel} rule`} onClick={() => onDelete(rule.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

interface ValueEditorProps {
  rule: QueryRule;
  field: FieldDefinition;
  onUpdate: (patch: Partial<QueryRule>) => void;
}

function ValueEditor({ rule, field, onUpdate }: ValueEditorProps) {
  const id = `value-${rule.id}`;
  const fieldLabel = field.label;
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedValue = rule.value === undefined || rule.value === null ? '' : String(rule.value);

  useEffect(() => {
    if (inputRef.current && inputRef.current !== document.activeElement) {
      inputRef.current.value = normalizedValue;
    }
  }, [normalizedValue]);

  if (rule.operator === 'empty' || rule.operator === 'notEmpty') {
    return (
      <div>
        <span className="eb-label">Value for {fieldLabel}</span>
        <div className="eb-muted">This operator does not need a value.</div>
      </div>
    );
  }

  if (field.choices?.length) {
    return (
      <div>
        <label className="eb-label" htmlFor={id}>
          Value for {fieldLabel}
        </label>
        <select id={id} className="eb-select" value={String(rule.value ?? '')} onChange={(event) => onUpdate({ value: event.target.value })}>
          {field.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div>
        <label className="eb-label" htmlFor={id}>
          Value for {fieldLabel}
        </label>
        <select id={id} className="eb-select" value={String(rule.value ?? false)} onChange={(event) => onUpdate({ value: event.target.value === 'true' })}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="eb-label" htmlFor={id}>
        Value for {fieldLabel}
      </label>
      <input
        id={id}
        ref={inputRef}
        className="eb-input"
        type={field.type === 'number' ? 'number' : 'text'}
        defaultValue={normalizedValue}
        onChange={(event) => onUpdate({ value: coerceValueForField(event.target.value, field) })}
      />
    </div>
  );
}

function getDefaultValue(field: FieldDefinition): QueryRule['value'] {
  if (field.choices?.length) {
    return field.choices[0];
  }

  if (field.type === 'number') {
    return 0;
  }

  if (field.type === 'boolean') {
    return false;
  }

  return '';
}

function getRuleValueLabel(rule: QueryRule, field?: FieldDefinition): string {
  if (rule.operator === 'empty' || rule.operator === 'notEmpty') {
    return 'no value';
  }

  if (rule.value === undefined || rule.value === null || rule.value === '') {
    return field?.choices?.[0] ?? 'value';
  }

  return String(rule.value);
}
