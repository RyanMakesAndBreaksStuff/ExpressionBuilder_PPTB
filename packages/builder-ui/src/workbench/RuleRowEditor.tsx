import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { coerceValueForField, findField, getOperatorsForField, getSafeOperator } from '../app/builderState';
import type { QueryRule } from '../composer/querySchema';
import type { RuleRowEditorProps } from './types';
import { DuplicateIcon, GripIcon, TrashIcon, WrapIcon } from './icons/BuilderIcons';

export function RuleRowEditor({ fields, onDelete, onDuplicate, onSelect, onUpdate, onRequestRemap, rule, selected }: RuleRowEditorProps) {
  const field = findField(fields, rule.fieldId);
  const fieldLabel = field?.label ?? rule.fieldId;
  const hasError = !rule.value && rule.operator !== 'empty' && rule.operator !== 'notEmpty';

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
            caseInsensitive: false,
          });
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Field for ${fieldLabel}`}
        title="Select field"
      >
        {fields.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
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
        {field.choices?.length ? (
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
        {rule.caseInsensitive ? (
          <span className="eb-wrap-chip">
            <WrapIcon />
            toLower
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
            onUpdate(rule.id, { caseInsensitive: true });
          }}
          disabled={field.type !== 'string' && field.type !== 'choice'}
          aria-label="Wrap both sides in toLower()"
        >
          Wrap both sides in toLower()
        </button>
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
