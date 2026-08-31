import { Fragment, type ReactNode } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { countRules } from '../app/builderState';
import type { QueryGroup } from '../composer/querySchema';
import { RuleRowEditor } from './RuleRowEditor';
import { ConditionDragHandle } from './ConditionDragHandle';
import { ConditionMoveButtons } from './ConditionMoveButtons';
import { ConditionPositionTarget } from './ConditionPositionTarget';

interface ConditionGroupCardProps {
  group: QueryGroup;
  fields: FieldDefinition[];
  isRoot?: boolean;
  /** Ids of every group above this one, root first. See ConditionPositionTarget. */
  ancestorGroupIds?: readonly string[];
  parentGroupId?: string;
  sourceIndex?: number;
  siblingCount?: number;
  selectedRuleId?: string;
  activeGroupId?: string;
  onSelectRule: (ruleId: string) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onFocusGroup: (groupId: string) => void;
  onChangeGroupConjunction: (groupId: string, conjunction: 'and' | 'or') => void;
  onUpdateRule: (ruleId: string, patch: Partial<import('../composer/querySchema').QueryRule>) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onReorderNode: (nodeId: string, parentGroupId: string, finalIndex: number) => void;
  onRequestRemap?: (ruleId: string) => void;
}

export function ConditionGroupCard({
  fields,
  group,
  isRoot = false,
  ancestorGroupIds = [],
  parentGroupId,
  sourceIndex,
  siblingCount,
  selectedRuleId,
  activeGroupId,
  onAddGroup,
  onAddRule,
  onFocusGroup,
  onChangeGroupConjunction,
  onDeleteNode,
  onReorderNode,
  onDuplicateRule,
  onSelectRule,
  onUpdateRule,
  onRequestRemap,
}: ConditionGroupCardProps) {
  const isAnd = group.conjunction === 'and';
  const isEmpty = group.children.length === 0;
  const ruleCount = countRules(group);
  const isFocused = group.id === activeGroupId;
  const groupLabel = `${group.conjunction.toUpperCase()} group ${group.id}`;
  // Separators rendered here sit inside this group, so the chain they guard
  // against includes it.
  const targetAncestorIds = [...ancestorGroupIds, group.id];

  const renderCard = ({
    sourceRef,
    handle,
    isDragging = false,
  }: {
    sourceRef?: (element: Element | null) => void;
    handle?: ReactNode;
    isDragging?: boolean;
  } = {}) => (
    <section
      ref={sourceRef}
      className={[
        'eb-group-card',
        isRoot ? 'is-root' : 'nested',
        isEmpty ? 'is-empty' : '',
        isFocused ? 'is-focused' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={groupLabel}
      data-node-id={group.id}
    >
      <div
        className="eb-group-toolbar"
        tabIndex={0}
        aria-label={`Focus ${group.conjunction.toUpperCase()} group ${group.id}`}
        onClick={() => onFocusGroup(group.id)}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onFocusGroup(group.id);
          }
        }}
      >
        {handle}
        <div className="eb-logic-pill">
          <button
            type="button"
            className={isAnd ? 'is-active' : undefined}
            aria-label={`Set ${group.id} conjunction to AND`}
            onClick={() => onChangeGroupConjunction(group.id, 'and')}
          >
            AND
          </button>
          <button
            type="button"
            className={!isAnd ? 'is-active' : undefined}
            aria-label={`Set ${group.id} conjunction to OR`}
            onClick={() => onChangeGroupConjunction(group.id, 'or')}
          >
            OR
          </button>
        </div>
        <span className="eb-group-caption">{isAnd ? 'Match all of the following' : 'Match any of the following'}</span>
        <span className="eb-group-count">{ruleCount} rules</span>
        <div className="eb-group-actions">
          {!isRoot &&
          parentGroupId !== undefined &&
          sourceIndex !== undefined &&
          siblingCount !== undefined ? (
            <ConditionMoveButtons
              label={`group ${group.id}`}
              sourceIndex={sourceIndex}
              siblingCount={siblingCount}
              onMove={(finalIndex) =>
                onReorderNode(group.id, parentGroupId, finalIndex)
              }
            />
          ) : null}
          <button type="button" className="eb-text-btn" onClick={() => onAddRule(group.id)}>
            + Rule
          </button>
          <button type="button" className="eb-text-btn" onClick={() => onAddGroup(group.id)}>
            + Group
          </button>
          {!isRoot && (
            <Button
              appearance="subtle"
              size="small"
              icon={<DeleteRegular />}
              aria-label={`Delete group ${group.id}`}
              onClick={() => onDeleteNode(group.id)}
            />
          )}
        </div>
      </div>

      <div className="eb-group-children">
        {group.children.map((child, childIndex) => (
          <Fragment key={child.id}>
            <ConditionPositionTarget
              groupId={group.id}
              groupLabel={groupLabel}
              ancestorGroupIds={targetAncestorIds}
              index={childIndex}
              beforeNodeId={child.id}
              positionCount={group.children.length + 1}
            />
            {child.kind === 'group' ? (
              <ConditionGroupCard
                group={child}
                fields={fields}
                ancestorGroupIds={targetAncestorIds}
                parentGroupId={group.id}
                sourceIndex={childIndex}
                siblingCount={group.children.length}
                selectedRuleId={selectedRuleId}
                activeGroupId={activeGroupId}
                onSelectRule={onSelectRule}
                onAddRule={onAddRule}
                onAddGroup={onAddGroup}
                onFocusGroup={onFocusGroup}
                onChangeGroupConjunction={onChangeGroupConjunction}
                onUpdateRule={onUpdateRule}
                onDuplicateRule={onDuplicateRule}
                onDeleteNode={onDeleteNode}
                onReorderNode={onReorderNode}
                onRequestRemap={onRequestRemap}
              />
            ) : (
              <RuleRowEditor
                rule={child}
                fields={fields}
                parentGroupId={group.id}
                sourceIndex={childIndex}
                siblingCount={group.children.length}
                selected={selectedRuleId === child.id}
                onSelect={onSelectRule}
                onUpdate={onUpdateRule}
                onDuplicate={onDuplicateRule}
                onDelete={onDeleteNode}
                onReorderNode={onReorderNode}
                onRequestRemap={onRequestRemap}
              />
            )}
          </Fragment>
        ))}
        <ConditionPositionTarget
          groupId={group.id}
          groupLabel={groupLabel}
          ancestorGroupIds={targetAncestorIds}
          index={group.children.length}
          positionCount={group.children.length + 1}
          terminal
        />
        <div className="eb-group-actions">
          <button type="button" className="eb-text-btn" onClick={() => onAddRule(group.id)}>
            + Rule
          </button>
          <button type="button" className="eb-text-btn" onClick={() => onAddGroup(group.id)}>
            + Group
          </button>
        </div>
      </div>
    </section>
  );

  if (
    isRoot ||
    parentGroupId === undefined ||
    sourceIndex === undefined ||
    siblingCount === undefined
  ) {
    return renderCard();
  }

  return (
    <ConditionDragHandle
      nodeId={group.id}
      parentGroupId={parentGroupId}
      sourceIndex={sourceIndex}
      label={`group ${group.id}`}
    >
      {({ sourceRef, handle, isDragging }) =>
        renderCard({ sourceRef, handle, isDragging })
      }
    </ConditionDragHandle>
  );
}
