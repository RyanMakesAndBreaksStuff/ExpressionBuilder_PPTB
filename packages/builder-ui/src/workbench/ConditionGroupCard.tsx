import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { QueryGroup } from '../composer/querySchema';
import { RuleRowEditor } from './RuleRowEditor';

interface ConditionGroupCardProps {
  group: QueryGroup;
  fields: FieldDefinition[];
  selectedRuleId?: string;
  onSelectRule: (ruleId: string) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onChangeGroupConjunction: (groupId: string, conjunction: 'and' | 'or') => void;
  onUpdateRule: (ruleId: string, patch: Partial<import('../composer/querySchema').QueryRule>) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function ConditionGroupCard({
  fields,
  group,
  selectedRuleId,
  onAddGroup,
  onAddRule,
  onChangeGroupConjunction,
  onDeleteNode,
  onDuplicateRule,
  onSelectRule,
  onUpdateRule,
}: ConditionGroupCardProps) {
  const isAnd = group.conjunction === 'and';

  return (
    <section className="eb-group-card" role="group" aria-label={`${group.conjunction.toUpperCase()} group ${group.id}`}>
      <div className="eb-group-toolbar">
        <div>
          <div className="eb-group-caption">{isAnd ? 'Match all of the following' : 'Match any of the following'}</div>
          <h3>{group.id === 'root' ? 'Root group' : group.id}</h3>
        </div>
        <div className="eb-group-actions">
          <button type="button" className={isAnd ? 'is-active' : undefined} aria-label={`Set ${group.id} conjunction to AND`} onClick={() => onChangeGroupConjunction(group.id, 'and')}>
            AND
          </button>
          <button type="button" className={!isAnd ? 'is-active' : undefined} aria-label={`Set ${group.id} conjunction to OR`} onClick={() => onChangeGroupConjunction(group.id, 'or')}>
            OR
          </button>
          <button type="button" onClick={() => onAddRule(group.id)}>Rule</button>
          <button type="button" onClick={() => onAddGroup(group.id)}>Group</button>
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
              onSelectRule={onSelectRule}
              onAddRule={onAddRule}
              onAddGroup={onAddGroup}
              onChangeGroupConjunction={onChangeGroupConjunction}
              onUpdateRule={onUpdateRule}
              onDuplicateRule={onDuplicateRule}
              onDeleteNode={onDeleteNode}
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
            />
          ),
        )}
      </div>
    </section>
  );
}
