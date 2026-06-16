import type { CSSProperties, KeyboardEvent } from 'react';
import type { FieldDefinition } from '@pavb/engine';
import type { QueryRule } from '../composer/querySchema';
import { TypeGlyph } from './TypeGlyph';

interface ConditionSummaryRowProps {
  rule: QueryRule;
  field?: FieldDefinition;
  depth: number;
  selected: boolean;
  onSelect: (ruleId: string) => void;
}

export function ConditionSummaryRow({ rule, field, depth, selected, onSelect }: ConditionSummaryRowProps) {
  const fieldLabel = field?.label ?? rule.fieldId;
  const value = rule.value === undefined || rule.value === null ? '' : String(rule.value);
  const label = `${fieldLabel} ${rule.operator} ${value}`.trim();
  const style = { '--rule-depth': depth } as CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(rule.id);
    }
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={label}
      className="eb-rule-row"
      style={style}
      onClick={() => onSelect(rule.id)}
      onKeyDown={handleKeyDown}
    >
      {field ? <TypeGlyph type={field.type} /> : null}
      <span className="eb-rule-main">
        <span className="eb-rule-title">{fieldLabel}</span>
        <span className="eb-rule-detail">
          Rule: {rule.operator}
          {value ? ` ${value}` : ''}
        </span>
      </span>
      {rule.caseInsensitive ? <span className="eb-badge brand">toLower</span> : null}
    </button>
  );
}
