import { formatExpression, type ExpressionMode, type FieldDefinition, type FormatDiagnostic } from '@ryanmakes/eb_engine';
import type { QueryRule, RulePatch } from '../composer/querySchema';
import {
  coerceValueForField,
  findField,
  getOperatorsForField,
  getSafeOperator,
  queryNodeToAst,
} from '../app/builderState';
import { DiagnosticCard } from './DiagnosticCard';
import { ExpressionPreview } from './ExpressionPreview';

interface RuleInspectorPaneProps {
  mode: ExpressionMode;
  fields: FieldDefinition[];
  selectedRule?: QueryRule;
  diagnostics: Array<FormatDiagnostic | { severity: 'error' | 'warning'; message: string; code?: string }>;
  onUpdateRule: (ruleId: string, patch: RulePatch) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
}

export function RuleInspectorPane({
  mode,
  fields,
  selectedRule,
  diagnostics,
  onUpdateRule,
  onDuplicateRule,
  onDeleteRule,
}: RuleInspectorPaneProps) {
  const field = selectedRule ? findField(fields, selectedRule.fieldId) : undefined;
  const operators = getOperatorsForField(field);
  const ruleExpression =
    selectedRule && field
      ? formatExpression(queryNodeToAst(selectedRule, fields), { mode, fields }).expression
      : '@and()';

  const updateSelectedRule = (patch: RulePatch) => {
    if (selectedRule) {
      onUpdateRule(selectedRule.id, patch);
    }
  };

  return (
    <aside className="eb-pane eb-inspector-pane" aria-label="Inspector pane">
      <section className="eb-inspector eb-pane-surface">
        <div className="eb-pane-header">
          <div>
            <div className="eb-muted">AND root &gt; Rule name</div>
            <h2>Edit rule</h2>
          </div>
          {selectedRule ? <span className="eb-badge brand">Rule</span> : null}
        </div>

        {selectedRule && field ? (
          <div className="eb-form">
            <div>
              <label className="eb-label" htmlFor="rule-field">
                Field
              </label>
              <select
                id="rule-field"
                className="eb-select"
                value={selectedRule.fieldId}
                onChange={(event) => {
                  const nextField = findField(fields, event.target.value);
                  if (nextField) {
                    updateSelectedRule({
                      fieldId: nextField.id,
                      operator: getSafeOperator(nextField, selectedRule.operator),
                      value: defaultValue(nextField),
                      caseInsensitive: false,
                    });
                  }
                }}
              >
                {fields.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="eb-label" htmlFor="rule-operator">
                Operator
              </label>
              <select
                id="rule-operator"
                className="eb-select"
                value={selectedRule.operator}
                onChange={(event) => updateSelectedRule({ operator: event.target.value })}
              >
                {operators.map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
            </div>

            <ValueEditor rule={selectedRule} field={field} onUpdate={updateSelectedRule} />

            <div>
              <div className="eb-label">function chips</div>
              <div className="eb-chip-row" aria-label="function chips">
                <button
                  type="button"
                  className="eb-btn"
                  onClick={() => updateSelectedRule({ caseInsensitive: true })}
                  disabled={field.type !== 'string'}
                >
                  Wrap both sides in toLower()
                </button>
                <span className="eb-pill">toLower()</span>
                <span className="eb-pill">trim()</span>
                <span className="eb-pill">coalesce()</span>
              </div>
            </div>

            <div className="eb-diagnostics" role="status" aria-label="warnings/errors" aria-live="polite">
              {diagnostics.length > 0 ? (
                diagnostics.map((diagnostic, index) => (
                  <DiagnosticCard key={`${diagnostic.message}-${index}`} diagnostic={diagnostic} />
                ))
              ) : (
                <div className="eb-diagnostic">No warnings/errors.</div>
              )}
            </div>

            <ExpressionPreview expression={ruleExpression} label="Rule expression" />

            <div className="eb-button-row">
              <button type="button" className="eb-btn" onClick={() => onDuplicateRule(selectedRule.id)}>
                Duplicate
              </button>
              <button type="button" className="eb-btn danger" onClick={() => onDeleteRule(selectedRule.id)}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="eb-muted">Select a rule to edit.</div>
        )}
      </section>
    </aside>
  );
}

interface ValueEditorProps {
  rule: QueryRule;
  field: FieldDefinition;
  onUpdate: (patch: RulePatch) => void;
}

function ValueEditor({ rule, field, onUpdate }: ValueEditorProps) {
  if (rule.operator === 'empty' || rule.operator === 'notEmpty') {
    return (
      <div>
        <span className="eb-label">Value</span>
        <div className="eb-muted">This operator does not need a value.</div>
      </div>
    );
  }

  if (field.choices?.length) {
    return (
      <div>
        <label className="eb-label" htmlFor="rule-value">
          Value
        </label>
        <select
          id="rule-value"
          className="eb-select"
          value={String(rule.value ?? '')}
          onChange={(event) => onUpdate({ value: event.target.value })}
        >
          {field.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
        <div className="eb-choice-row">
          {field.choices.map((choice) => (
            <button key={choice} type="button" className="eb-btn subtle" onClick={() => onUpdate({ value: choice })}>
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div>
        <label className="eb-label" htmlFor="rule-value">
          Value
        </label>
        <select
          id="rule-value"
          className="eb-select"
          value={String(rule.value ?? false)}
          onChange={(event) => onUpdate({ value: event.target.value === 'true' })}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="eb-label" htmlFor="rule-value">
        Value
      </label>
      <input
        id="rule-value"
        className="eb-input"
        type={field.type === 'number' ? 'number' : 'text'}
        value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
        onChange={(event) => onUpdate({ value: coerceValueForField(event.target.value, field) })}
      />
    </div>
  );
}

function defaultValue(field: FieldDefinition): QueryRule['value'] {
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
