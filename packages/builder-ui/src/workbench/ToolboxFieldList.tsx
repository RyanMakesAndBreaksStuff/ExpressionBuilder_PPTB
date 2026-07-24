import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { ToolboxFieldRow } from './ToolboxFieldRow';

interface ToolboxFieldListProps {
  items: FieldDefinition[];
  ariaLabel: string;
  onCreateRuleFromField?: (field: FieldDefinition) => void;
}

export function ToolboxFieldList({
  items,
  ariaLabel,
  onCreateRuleFromField,
}: ToolboxFieldListProps) {
  return (
    <ul className="eb-field-list" role="list" aria-label={ariaLabel}>
      {items.map((field) => (
        <ToolboxFieldRow
          key={field.id}
          field={field}
          onCreateRuleFromField={onCreateRuleFromField}
        />
      ))}
    </ul>
  );
}
