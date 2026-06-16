import type { ExpressionMode, FieldDefinition, FormatDiagnostic } from '@ryanmakes/eb_engine';
import type { QueryGroup, QueryNode } from '../composer/querySchema';
import { modeLabel } from '../app/builderState';
import { ConditionGroupHeader } from './ConditionGroupHeader';
import { ConditionSummaryRow } from './ConditionSummaryRow';
import { ExpressionValidationBar } from './ExpressionValidationBar';

interface ConditionMasterPaneProps {
  root: QueryGroup;
  fields: FieldDefinition[];
  mode: ExpressionMode;
  selectedRuleId?: string;
  expression: string;
  diagnostics: FormatDiagnostic[];
  onSelectRule: (ruleId: string) => void;
  onAddRule: () => void;
  onAddGroup: () => void;
  onCopy: () => void;
}

export function ConditionMasterPane({
  root,
  fields,
  mode,
  selectedRuleId,
  expression,
  diagnostics,
  onSelectRule,
  onAddRule,
  onAddGroup,
  onCopy,
}: ConditionMasterPaneProps) {
  return (
    <main className="eb-pane eb-master" aria-label="Conditions pane">
      <section className="eb-condition-card eb-pane-surface">
        <div className="eb-pane-header">
          <div>
            <h2>Conditions</h2>
            <div className="eb-muted">{modeLabel(mode)} predicate tree</div>
          </div>
          <span className="eb-badge brand">{modeLabel(mode)}</span>
        </div>

        <div className="eb-master-actions">
          <button type="button" className="eb-btn" onClick={onAddRule}>
            Rule
          </button>
          <button type="button" className="eb-btn" onClick={onAddGroup}>
            Group
          </button>
        </div>

        <div className="eb-rule-list" role="listbox" aria-label="Conditions">
          <ConditionGroupHeader conjunction={root.conjunction} depth={0} />
          {root.children.map((child) => (
            <ConditionNode
              key={child.id}
              node={child}
              fields={fields}
              depth={1}
              selectedRuleId={selectedRuleId}
              onSelectRule={onSelectRule}
            />
          ))}
        </div>
      </section>

      <ExpressionValidationBar expression={expression} diagnostics={diagnostics} onCopy={onCopy} />
    </main>
  );
}

interface ConditionNodeProps {
  node: QueryNode;
  fields: FieldDefinition[];
  depth: number;
  selectedRuleId?: string;
  onSelectRule: (ruleId: string) => void;
}

function ConditionNode({ node, fields, depth, selectedRuleId, onSelectRule }: ConditionNodeProps) {
  if (node.kind === 'rule') {
    const field = fields.find((item) => item.id === node.fieldId);
    return (
      <ConditionSummaryRow
        rule={node}
        field={field}
        depth={depth}
        selected={selectedRuleId === node.id}
        onSelect={onSelectRule}
      />
    );
  }

  return (
    <>
      <ConditionGroupHeader conjunction={node.conjunction} depth={depth} />
      {node.children.map((child) => (
        <ConditionNode
          key={child.id}
          node={child}
          fields={fields}
          depth={depth + 1}
          selectedRuleId={selectedRuleId}
          onSelectRule={onSelectRule}
        />
      ))}
    </>
  );
}
