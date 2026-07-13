import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { countRules } from '../app/builderState';
import type { QueryGroup } from '../composer/querySchema';
import { RuleRowEditor } from './RuleRowEditor';

interface ConditionGroupCardProps {
  group: QueryGroup;
  fields: FieldDefinition[];
  isRoot?: boolean;
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
  onRequestRemap?: (ruleId: string) => void;
  selectedWrappers?: string[];
}

export function ConditionGroupCard({
  fields,
  group,
  isRoot = false,
  selectedRuleId,
  activeGroupId,
  onAddGroup,
  onAddRule,
  onFocusGroup,
  onChangeGroupConjunction,
  onDeleteNode,
  onDuplicateRule,
  onSelectRule,
  onUpdateRule,
  onRequestRemap,
  selectedWrappers,
}: ConditionGroupCardProps) {
  const isAnd = group.conjunction === 'and';
  const ruleCount = countRules(group);
  const isFocused = group.id === activeGroupId;

  return (
    <section
      className={`eb-group-card ${!isRoot ? 'nested' : ''} ${isFocused ? 'is-focused' : ''}`}
      role="group"
      aria-label={`${group.conjunction.toUpperCase()} group ${group.id}`}
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
        <span className="eb-drag-dots" aria-hidden="true" hidden />
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
        {group.children.map((child) =>
          child.kind === 'group' ? (
            <ConditionGroupCard
              key={child.id}
              group={child}
              fields={fields}
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
              onRequestRemap={onRequestRemap}
              selectedWrappers={selectedWrappers}
            />
          ) : (
            <RuleRowEditor
              key={child.id}
              rule={child}
              fields={fields}
              selected={selectedRuleId === child.id}
              onSelect={onSelectRule}
              onUpdate={onUpdateRule}
              onDuplicate={onDuplicateRule}
              onDelete={onDeleteNode}
              onRequestRemap={onRequestRemap}
              selectedWrappers={selectedWrappers}
            />
          ),
        )}
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
}
