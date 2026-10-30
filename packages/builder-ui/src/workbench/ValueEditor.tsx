import { useState } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { coerceValueForField } from '../app/builderState';
import type { RulePatch } from '../composer/querySchema';
import type { RuleRowEditorProps } from './types';

interface ValueEditorProps {
  field: FieldDefinition;
  rule: RuleRowEditorProps['rule'];
  fieldLabel: string;
  hasError: boolean;
  numericValue: boolean;
  onUpdate: (ruleId: string, patch: RulePatch) => void;
}

// Value cell of a rule row: the input that fits the field, plus the raw-value toggle for option fields.
export function ValueEditor({ field, rule, fieldLabel, hasError, numericValue, onUpdate }: ValueEditorProps) {
  const [rawValue, setRawValue] = useState(false);

  return (
    <>
      <ValueInput
        field={field}
        rule={rule}
        fieldLabel={fieldLabel}
        hasError={hasError}
        numericValue={numericValue}
        onUpdate={onUpdate}
        rawValue={rawValue}
      />
      {field.options?.length ? (
        <button
          type="button"
          className="eb-icon-btn"
          aria-label="Toggle raw value"
          title="Toggle raw value"
          aria-pressed={rawValue}
          onClick={(e) => {
            e.stopPropagation();
            setRawValue((current) => !current);
          }}
        >
          #
        </button>
      ) : null}
    </>
  );
}

function ValueInput({
  field,
  rule,
  fieldLabel,
  hasError,
  numericValue,
  onUpdate,
  rawValue,
}: ValueEditorProps & { rawValue: boolean }) {
  if (field.options?.length && !rawValue) {
    return (
      <select
        className="eb-select"
        value={String(rule.value ?? field.options[0].value)}
        onChange={(event) => onUpdate(rule.id, { value: Number(event.target.value) })}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Value for ${fieldLabel}`}
      >
        {field.options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.options?.length) {
    return (
      <input
        className="eb-input"
        type="number"
        value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
        onChange={(event) => onUpdate(rule.id, { value: event.target.value === '' ? null : Number(event.target.value) })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Raw value"
        aria-label={`Raw value for ${fieldLabel}`}
      />
    );
  }

  if (field.choices?.length) {
    return (
      <select
        className="eb-select"
        value={String(rule.value ?? '')}
        onChange={(event) => onUpdate(rule.id, { value: event.target.value })}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Value for ${fieldLabel}`}
      >
        {field.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <select
        className="eb-select"
        value={String(rule.value ?? false)}
        onChange={(event) => onUpdate(rule.id, { value: event.target.value === 'true' })}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Value for ${fieldLabel}`}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      className="eb-input"
      type={numericValue ? 'number' : 'text'}
      value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
      onChange={(event) => onUpdate(rule.id, { value: coerceValueForField(event.target.value, numericValue ? { ...field, type: 'number' } : field) })}
      onClick={(e) => e.stopPropagation()}
      placeholder={hasError ? 'Enter a value' : 'Value'}
      aria-label={`Value for ${fieldLabel}`}
    />
  );
}
