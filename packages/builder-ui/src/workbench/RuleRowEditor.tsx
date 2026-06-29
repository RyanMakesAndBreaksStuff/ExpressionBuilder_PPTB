import { useMemo, useState } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { coerceValueForField, findField, getDefaultValue, getOperatorsForField, getSafeOperator } from '../app/builderState';
import type { RuleRowEditorProps } from './types';
import { DuplicateIcon, GripIcon, TrashIcon, WrapIcon } from './icons/BuilderIcons';

export function RuleRowEditor({
  fields,
  onDelete,
  onDuplicate,
  onSelect,
  onUpdate,
  onRequestRemap,
  rule,
  selected,
  selectedWrappers = [],
}: RuleRowEditorProps) {
  const field = findField(fields, rule.fieldId);
  const fieldLabel = field?.label ?? rule.fieldId;
  const hasError = !rule.value && rule.operator !== 'empty' && rule.operator !== 'notEmpty';
  const [rawValue, setRawValue] = useState(false);
  const appliedWraps = rule.wrappers ?? [];

  // Group fields: ungrouped (primary) first, then one bucket per related table.
  const { primary, grouped } = useMemo(() => {
    const primaryFields: FieldDefinition[] = [];
    const groups = new Map<string, FieldDefinition[]>();
    for (const item of fields) {
      if (item.group) {
        const bucket = groups.get(item.group) ?? [];
        bucket.push(item);
        groups.set(item.group, bucket);
      } else {
        primaryFields.push(item);
      }
    }
    return { primary: primaryFields, grouped: [...groups.entries()] };
  }, [fields]);

  if (!field) {
    return (
      <div
        className={`eb-rule-row-editor is-orphan${selected ? ' is-selected' : ''}`}
        role="group"
        aria-label={`Unknown field ${rule.fieldId}`}
        onClick={() => onSelect(rule.id)}
      >
        <span className="eb-orphan-badge" title="This field is not in the active source" aria-label="Unknown field">
          ⚠ Unknown field
        </span>
        <span className="eb-field-title">{rule.fieldId}</span>
        <span className="eb-muted">{rule.operator} {String(rule.value ?? '')}</span>
        <div className="eb-rule-tools">
          {onRequestRemap ? (
            <button
              type="button"
              className="eb-text-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(rule.id);
                onRequestRemap(rule.id);
              }}
            >
              Remap…
            </button>
          ) : null}
          <button
            type="button"
            className="eb-icon-btn"
            aria-label="Remove rule"
            title="Remove rule"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rule.id);
            }}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`eb-rule-row-editor ${selected ? 'is-selected' : ''} ${hasError ? 'is-error' : ''}`}
      role="group"
      aria-label={`${fieldLabel} ${rule.operator} ${String(rule.value ?? '')}`}
      onClick={() => onSelect(rule.id)}
      onFocusCapture={() => onSelect(rule.id)}
    >
      <span className="eb-drag-dots">
        <GripIcon />
      </span>
      <span className={`eb-type ${field.type}`}>{getTypeLabel(field.type)}</span>
      <select
        className="eb-select"
        value={rule.fieldId}
        onChange={(event) => {
          const nextField = findField(fields, event.target.value);
          if (!nextField) return;
          onUpdate(rule.id, {
            fieldId: nextField.id,
            operator: getSafeOperator(nextField, rule.operator),
            value: getDefaultValue(nextField),
          });
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Field for ${fieldLabel}`}
        title="Select field"
      >
        {primary.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
        {grouped.map(([groupName, groupFields]) => (
          <optgroup key={groupName} label={groupName}>
            {groupFields.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        className="eb-select"
        value={rule.operator}
        onChange={(event) => onUpdate(rule.id, { operator: event.target.value })}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Operator for ${fieldLabel}`}
        title="Select operator"
      >
        {getOperatorsForField(field).map((operator) => (
          <option key={operator} value={operator}>
            {operator}
          </option>
        ))}
      </select>
      <div className="eb-value-wrap">
        {field.options?.length && !rawValue ? (
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
        ) : field.options?.length && rawValue ? (
          <input
            className="eb-input"
            type="number"
            value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
            onChange={(event) => onUpdate(rule.id, { value: event.target.value === '' ? null : Number(event.target.value) })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Raw value"
            aria-label={`Raw value for ${fieldLabel}`}
          />
        ) : field.choices?.length ? (
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
        ) : field.type === 'boolean' ? (
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
        ) : (
          <input
            className="eb-input"
            type={field.type === 'number' ? 'number' : 'text'}
            value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
            onChange={(event) => onUpdate(rule.id, { value: coerceValueForField(event.target.value, field) })}
            onClick={(e) => e.stopPropagation()}
            placeholder={hasError ? 'Enter a value' : 'Value'}
            aria-label={`Value for ${fieldLabel}`}
          />
        )}
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
        {appliedWraps.length ? (
          <span className="eb-wrap-chip" aria-label={`Applied wraps: ${appliedWraps.join(', ')}`}>
            <WrapIcon />
            {appliedWraps.join(' · ')}
          </span>
        ) : null}
      </div>
      <div className="eb-rule-tools">
        <button
          type="button"
          className="eb-icon-btn"
          title="Duplicate rule"
          aria-label="Duplicate rule"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(rule.id);
          }}
        >
          <DuplicateIcon />
        </button>
        <button
          type="button"
          className="eb-icon-btn"
          title="Delete rule"
          aria-label="Delete rule"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(rule.id);
          }}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="eb-rule-row-actions">
        <button
          type="button"
          className="eb-action-btn eb-action-subtle"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(rule.id, { wrappers: selectedWrappers });
          }}
          disabled={selectedWrappers.length === 0}
          aria-label="Apply Wrap"
        >
          Apply Wrap
        </button>
        {appliedWraps.length ? (
          <button
            type="button"
            className="eb-action-btn eb-action-subtle"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(rule.id, { wrappers: [] });
            }}
            aria-label="Clear wraps"
          >
            Clear wraps
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getTypeLabel(type: FieldDefinition['type']): string {
  switch (type) {
    case 'choice': return 'C';
    case 'string': return 'Aa';
    case 'number': return '#';
    case 'dateTime': return 'D';
    case 'boolean': return 'B';
    default: return '?';
  }
}
