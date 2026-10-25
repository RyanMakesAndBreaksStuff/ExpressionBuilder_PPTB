import { useMemo, type ReactNode } from 'react';
import {
  Menu,
  MenuItemCheckbox,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { wrapperChainContract, type FieldDefinition } from '@ryanmakes/eb_engine';
import { chainYieldsNumber, findField, getDefaultValue, getOperatorsForField, getSafeOperator } from '../app/builderState';
import type { RuleRowEditorProps } from './types';
import { DuplicateIcon, TrashIcon, WrapIcon } from './icons/BuilderIcons';
import { ConditionDragHandle } from './ConditionDragHandle';
import { ConditionMoveButtons } from './ConditionMoveButtons';
import { listGroupMoveTargets } from './dragDropModel';
import { ValueEditor } from './ValueEditor';
import { WRAPPERS } from './wrappers';

export function RuleRowEditor({
  fields,
  onDelete,
  onDuplicate,
  onSelect,
  onUpdate,
  onRequestRemap,
  rule,
  selected,
  parentGroupId,
  sourceIndex,
  siblingCount,
  onReorderNode,
  root,
  onMoveNode,
}: RuleRowEditorProps) {
  const field = findField(fields, rule.fieldId);
  const fieldLabel = field?.label ?? rule.fieldId;
  const valueMissing = rule.value === undefined || rule.value === null || rule.value === '';
  const hasError = valueMissing && rule.operator !== 'empty' && rule.operator !== 'notEmpty';
  const appliedWraps = rule.wrappers ?? [];
  const nodeLabel = field?.label ?? `unknown field ${rule.fieldId}`;
  const hasReorderMetadata =
    parentGroupId !== undefined &&
    sourceIndex !== undefined &&
    siblingCount !== undefined &&
    onReorderNode !== undefined;
  const moveTargets =
    hasReorderMetadata && root
      ? listGroupMoveTargets(root, rule.id, parentGroupId)
      : undefined;
  const moveButtons = hasReorderMetadata ? (
    <ConditionMoveButtons
      label={nodeLabel}
      sourceIndex={sourceIndex}
      siblingCount={siblingCount}
      onMove={(finalIndex) => onReorderNode(rule.id, parentGroupId, finalIndex)}
      moveTargets={moveTargets}
      onMoveToGroup={onMoveNode ? (targetGroupId) => onMoveNode(rule.id, targetGroupId) : undefined}
    />
  ) : null;
  const renderDraggableRow = (
    renderRow: (
      sourceRef?: (element: Element | null) => void,
      handle?: ReactNode,
      isDragging?: boolean,
    ) => ReactNode,
  ): ReactNode => {
    if (!hasReorderMetadata) {
      return renderRow();
    }

    return (
      <ConditionDragHandle
        nodeId={rule.id}
        parentGroupId={parentGroupId}
        sourceIndex={sourceIndex}
        label={`condition ${nodeLabel}`}
      >
        {({ sourceRef, handle, isDragging }) =>
          renderRow(sourceRef, handle, isDragging)
        }
      </ConditionDragHandle>
    );
  };

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
    return renderDraggableRow((sourceRef, handle, isDragging = false) => (
      <div
        ref={sourceRef}
        className={`eb-rule-row-editor is-orphan${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
        role="group"
        aria-label={`Unknown field ${rule.fieldId}`}
        data-node-id={rule.id}
        onClick={() => onSelect(rule.id)}
      >
        {handle}
        <span className="eb-orphan-badge" title="This field is not in the active source" aria-label="Unknown field">
          ⚠ Unknown field
        </span>
        <span className="eb-field-title">{rule.fieldId}</span>
        <span className="eb-muted">{rule.operator} {String(rule.value ?? '')}</span>
        <div className="eb-rule-tools">
          {moveButtons}
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
    ));
  }

  const numericValue = field.type === 'number' || chainYieldsNumber(field, appliedWraps);
  const operators = getOperatorsForField(field, appliedWraps);
  // An imported operator outside the chain contract stays selectable so the user can see and correct it.
  const operatorOptions = operators.includes(rule.operator) ? operators : [rule.operator, ...operators];
  const appendableWrappers: readonly string[] = wrapperChainContract(field, appliedWraps).appendableWrappers;

  return renderDraggableRow((sourceRef, handle, isDragging = false) => (
    <div
      ref={sourceRef}
      className={`eb-rule-row-editor ${selected ? 'is-selected' : ''} ${hasError ? 'is-error' : ''} ${isDragging ? 'is-dragging' : ''}`}
      role="group"
      aria-label={`${fieldLabel} ${rule.operator} ${String(rule.value ?? '')}`}
      data-node-id={rule.id}
      onClick={() => onSelect(rule.id)}
      onFocusCapture={() => onSelect(rule.id)}
    >
      {handle}
      <span className={`eb-type ${field.type}`}>{getTypeLabel(field.type)}</span>
      <select
        className="eb-select"
        value={rule.fieldId}
        onChange={(event) => {
          const nextField = findField(fields, event.target.value);
          if (!nextField) return;
          onUpdate(rule.id, {
            fieldId: nextField.id,
            operator: getSafeOperator(nextField, rule.operator, appliedWraps),
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
        {operatorOptions.map((operator) => (
          <option key={operator} value={operator}>
            {operator}
          </option>
        ))}
      </select>
      <div className="eb-value-wrap">
        <ValueEditor
          field={field}
          rule={rule}
          fieldLabel={fieldLabel}
          hasError={hasError}
          numericValue={numericValue}
          onUpdate={onUpdate}
        />
        {appliedWraps.length ? (
          <span className="eb-wrap-chip" aria-label={`Applied wraps: ${appliedWraps.join(', ')}`}>
            <WrapIcon />
            {appliedWraps.join(' · ')}
          </span>
        ) : null}
      </div>
      <div className="eb-rule-tools">
        {moveButtons}
        <Menu
          checkedValues={{ wrappers: appliedWraps }}
          onCheckedValueChange={(_, { checkedItems }) => {
            const set = new Set(checkedItems);
            // keep already-applied in their current order, then append newly-checked in click order
            const kept = appliedWraps.filter((id) => set.has(id));
            const added = checkedItems.filter((id) => !appliedWraps.includes(id));
            const wrappers = [...kept, ...added];
            onUpdate(rule.id, { wrappers, operator: getSafeOperator(field, rule.operator, wrappers) });
          }}
        >
          <MenuTrigger disableButtonEnhancement>
            <button
              type="button"
              className="eb-icon-btn"
              title="Wrappers"
              aria-label={`Wrappers for ${fieldLabel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <WrapIcon />
            </button>
          </MenuTrigger>
          <MenuPopover onClick={(e) => e.stopPropagation()}>
            <MenuList>
              {WRAPPERS.map((w) => (
                <MenuItemCheckbox
                  key={w.id}
                  name="wrappers"
                  value={w.id}
                  title={w.detail}
                  disabled={!appliedWraps.includes(w.id) && !appendableWrappers.includes(w.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="eb-menu-item-label">{w.label}</span>
                  <span className="eb-menu-item-detail">{w.detail}</span>
                </MenuItemCheckbox>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
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
    </div>
  ));
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
