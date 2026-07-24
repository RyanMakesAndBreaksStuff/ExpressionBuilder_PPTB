import { Button } from '@fluentui/react-components';
import { useDraggable } from '@dnd-kit/react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { TypeGlyph } from '../components/TypeGlyph';
import { GripIcon } from './icons/BuilderIcons';
import {
  toolboxFieldDragId,
  type ToolboxFieldDragMetadata,
} from './dragDropModel';

interface ToolboxFieldRowProps {
  field: FieldDefinition;
  onCreateRuleFromField?: (field: FieldDefinition) => void;
}

export function ToolboxFieldRow({
  field,
  onCreateRuleFromField,
}: ToolboxFieldRowProps) {
  const metadata: ToolboxFieldDragMetadata = {
    kind: 'toolbox-field',
    fieldId: field.id,
  };
  const { handleRef, isDragging, ref } = useDraggable({
    id: toolboxFieldDragId(field.id),
    data: metadata,
    type: 'toolbox-field',
  });

  return (
    <li
      ref={ref}
      className={`eb-field-row${isDragging ? ' is-dragging' : ''}`}
      data-field-id={field.id}
    >
      <button
        type="button"
        className="eb-field-insert-action"
        onClick={() => onCreateRuleFromField?.(field)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCreateRuleFromField?.(field);
          }
        }}
        title="Add a rule for this field"
        aria-label={`Add a rule for ${field.label}, ${field.type}`}
      >
        <TypeGlyph type={field.type} />
        <span className="eb-field-main">
          <span className="eb-field-title">{field.label}</span>
          <span className="eb-field-detail">
            {field.path.join('.')} &middot; {field.type}
          </span>
        </span>
        <span className="eb-field-type-badge">{field.type}</span>
      </button>
      <Button
        ref={handleRef}
        type="button"
        appearance="subtle"
        size="small"
        className="eb-drag-handle"
        icon={<GripIcon />}
        aria-label={`Drag ${field.label} to insert`}
        title={`Drag ${field.label} to insert`}
      />
    </li>
  );
}
