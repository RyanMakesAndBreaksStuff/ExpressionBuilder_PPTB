import { useEffect, useMemo, useState } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import type { ExpressionMode } from '@pavb/engine';
import type { PlatformAdapter, PlatformTheme } from '@pavb/platform';
import { addGroup, addRule, deleteNode, duplicateRule, selectRule, updateRule } from '../composer/queryActions';
import type { QueryDocument } from '../composer/querySchema';
import { ConditionMasterPane } from '../components/ConditionMasterPane';
import { ExpressionCommandBar } from '../components/ExpressionCommandBar';
import { FieldSourcePane } from '../components/FieldSourcePane';
import { RuleInspectorPane } from '../components/RuleInspectorPane';
import { parseSavedExpression, serializeSavedExpression } from '../importExport/savedExpressionSchema';
import { builderDarkTheme, builderLightTheme } from '../theme/fluentTheme';
import { deriveBuilderState, findFirstRule, findRule } from './builderState';
import { sampleDocument } from './sampleData';
import '../theme/tokens.css';

export interface ExpressionBuilderShellProps {
  adapter: PlatformAdapter;
  initialDocument?: QueryDocument;
}

export function ExpressionBuilderShell({ adapter, initialDocument = sampleDocument }: ExpressionBuilderShellProps) {
  const [document, setDocument] = useState<QueryDocument>(initialDocument);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [savedJson, setSavedJson] = useState(() => serializeSavedExpression(initialDocument));
  const [importDiagnostics, setImportDiagnostics] = useState<
    Array<{ severity: 'error' | 'warning'; message: string }>
  >([]);
  const derived = useMemo(() => deriveBuilderState(document), [document]);
  const selectedRule = findRule(document.root, document.selectedRuleId) ?? findFirstRule(document.root);
  const diagnostics = [...importDiagnostics, ...derived.diagnostics];

  useEffect(() => {
    let active = true;

    adapter.getTheme().then((platformTheme) => {
      if (active) {
        setTheme(normalizeTheme(platformTheme));
      }
    });

    const unsubscribe = adapter.onThemeChanged((platformTheme) => {
      setTheme(normalizeTheme(platformTheme));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [adapter]);

  const updateMode = (mode: ExpressionMode) => {
    setDocument((current) => ({ ...current, mode }));
    setImportDiagnostics([]);
  };

  const copyExpression = () => {
    void adapter.copyToClipboard(derived.expression);
  };

  const exportDocument = () => {
    setSavedJson(serializeSavedExpression(document));
    setImportDiagnostics([]);
  };

  const importDocument = () => {
    const result = parseSavedExpression(savedJson);

    if (!result.ok) {
      setImportDiagnostics(result.errors.map((message) => ({ severity: 'error', message })));
      return;
    }

    setDocument(result.document);
    setSavedJson(serializeSavedExpression(result.document));
    setImportDiagnostics([]);
  };

  const connectFields = async () => {
    const fields = await adapter.getDataverseFields();
    if (fields.length === 0) {
      await adapter.notify('Using sample fields because no Dataverse connection is available.', 'info');
    }
  };

  return (
    <FluentProvider theme={theme === 'dark' ? builderDarkTheme : builderLightTheme}>
      <div className="eb-root" data-theme={theme}>
        <ExpressionCommandBar
          mode={document.mode}
          theme={theme}
          onModeChange={updateMode}
          onExport={exportDocument}
          onImport={importDocument}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onCopyExpression={copyExpression}
        />

        <div className="eb-layout">
          <FieldSourcePane fields={document.fields} onConnect={() => void connectFields()} />
          <ConditionMasterPane
            root={document.root}
            fields={document.fields}
            mode={document.mode}
            selectedRuleId={selectedRule?.id}
            expression={derived.expression}
            diagnostics={derived.diagnostics}
            onSelectRule={(ruleId) => setDocument((current) => selectRule(current, ruleId))}
            onAddRule={() =>
              setDocument((current) =>
                addRule(current, current.root.id, {
                  fieldId: current.fields[0]?.id ?? '',
                  operator: 'equals',
                  value: current.fields[0]?.choices?.[0] ?? '',
                }),
              )
            }
            onAddGroup={() => setDocument((current) => addGroup(current, current.root.id))}
            onCopy={copyExpression}
          />
          <RuleInspectorPane
            mode={document.mode}
            fields={document.fields}
            selectedRule={selectedRule}
            diagnostics={diagnostics}
            onUpdateRule={(ruleId, patch) => {
              setDocument((current) => updateRule(current, ruleId, patch));
              setImportDiagnostics([]);
            }}
            onDuplicateRule={(ruleId) => setDocument((current) => duplicateRule(current, ruleId))}
            onDeleteRule={(ruleId) => setDocument((current) => deleteNode(current, ruleId))}
          />
        </div>

        <div className="eb-import-export">
          <label className="eb-label" htmlFor="saved-expression-json">
            Saved expression JSON
          </label>
          <textarea
            id="saved-expression-json"
            className="eb-textarea"
            value={savedJson}
            onChange={(event) => setSavedJson(event.target.value)}
          />
        </div>
      </div>
    </FluentProvider>
  );
}

function normalizeTheme(theme: PlatformTheme): 'light' | 'dark' {
  return theme === 'dark' || theme === 'highContrast' ? 'dark' : 'light';
}
