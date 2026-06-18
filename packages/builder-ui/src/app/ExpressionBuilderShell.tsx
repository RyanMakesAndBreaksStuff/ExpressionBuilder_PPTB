import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import type { ExpressionMode, FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformAdapter, PlatformTheme } from '@ryanmakes/eb_platformadapter';
import {
  addGroup,
  addRule,
  changeGroupConjunction,
  deleteNode,
  duplicateRule,
  selectRule,
  updateRule,
} from '../composer/queryActions';
import type { QueryDocument } from '../composer/querySchema';
import { parseSavedExpression, serializeSavedExpression } from '../importExport/savedExpressionSchema';
import {
  createPorcelainFluentTheme,
  porcelainTokens,
  type PaletteId,
  type PorcelainThemeMode,
} from '../theme/workbenchTokens';
import { deriveBuilderState, findFirstRule, findRule } from './builderState';
import { emptyStarterDocument } from './sampleData';
import { ConditionCanvas } from '../workbench/ConditionCanvas';
import { ExpressionDocumentPanel } from '../workbench/ExpressionDocumentPanel';
import { FieldToolboxPane } from '../workbench/FieldToolboxPane';
import { SupportPane } from '../workbench/SupportPane';
import { WorkbenchHeader } from '../workbench/WorkbenchHeader';
import {
  getDefaultWorkbenchState,
  toggleDock,
  togglePreview,
} from '../workbench/workbenchState';
import '../theme/tokens.css';

export interface ExpressionBuilderShellProps {
  adapter: PlatformAdapter;
  initialDocument?: QueryDocument;
}

export function ExpressionBuilderShell({ adapter, initialDocument = emptyStarterDocument }: ExpressionBuilderShellProps) {
  const [document, setDocument] = useState<QueryDocument>(initialDocument);
  const [paletteId, setPaletteId] = useState<PaletteId>('porcelainDark');
  const [savedJson, setSavedJson] = useState(() => serializeSavedExpression(initialDocument));
  const [importDiagnostics, setImportDiagnostics] = useState<
    Array<{ severity: 'error' | 'warning'; message: string }>
  >([]);
  const [workbench, setWorkbench] = useState(getDefaultWorkbenchState);
  const derived = useMemo(() => deriveBuilderState(document), [document]);
  const selectedRule = findRule(document.root, document.selectedRuleId) ?? findFirstRule(document.root);
  const diagnostics = [...importDiagnostics, ...derived.diagnostics];
  const theme = porcelainTokens[paletteId].mode;

  useEffect(() => {
    let active = true;

    adapter.getTheme().then((platformTheme) => {
      if (active) {
        setPaletteId(normalizePalette(platformTheme));
      }
    });

    const unsubscribe = adapter.onThemeChanged((platformTheme) => {
      setPaletteId(normalizePalette(platformTheme));
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

  const copyExpression = async () => {
    await adapter.copyToClipboard(derived.expression);
    setWorkbench((current) => ({ ...current, copyState: 'copied' }));
    setTimeout(() => {
      setWorkbench((current) => ({ ...current, copyState: 'idle' }));
    }, 1200);
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
    if (!isFieldDefinitionArray(fields) || fields.length === 0) {
      await adapter.notify('Using sample fields because no Dataverse connection is available.', 'info');
      return;
    }

    setDocument((current) => ({ ...current, fields }));
  };

  const paletteVars = porcelainTokens[paletteId].cssVariables;

  return (
    <FluentProvider theme={createPorcelainFluentTheme(paletteId)}>
      <div className="eb-root" data-theme={theme} style={paletteVars as CSSProperties}>
        <WorkbenchHeader
          mode={document.mode}
          paletteId={paletteId}
          onModeChange={updateMode}
          onExport={exportDocument}
          onImport={importDocument}
          onToggleTheme={() => setPaletteId((current) => (current === 'porcelainDark' ? 'porcelainLight' : 'porcelainDark'))}
          onCopyExpression={() => void copyExpression()}
        />

        <main
          className="eb-workspace"
          style={
            {
              '--eb-left-dock-width': workbench.leftDockCollapsed ? '68px' : '286px',
              '--eb-right-dock-width': workbench.rightDockCollapsed ? '68px' : '330px',
            } as CSSProperties
          }
        >
          <FieldToolboxPane
            fields={document.fields}
            activeTab={workbench.leftTab}
            collapsed={workbench.leftDockCollapsed}
            onTabChange={(leftTab) => setWorkbench((current) => ({ ...current, leftTab }))}
            onToggleCollapsed={() => setWorkbench((current) => toggleDock(current, 'left'))}
            onConnect={() => void connectFields()}
          />

          <div className="eb-center-col">
            <ConditionCanvas
              root={document.root}
              fields={document.fields}
              mode={document.mode}
              selectedRuleId={selectedRule?.id}
              onSelectRule={(ruleId) => {
                setDocument((current) => selectRule(current, ruleId));
                setImportDiagnostics([]);
              }}
              onAddRule={(groupId) =>
                setDocument((current) =>
                  addRule(current, groupId, {
                    fieldId: current.fields[0]?.id ?? '',
                    operator: 'equals',
                    value: current.fields[0]?.choices?.[0] ?? '',
                  }),
                )
              }
              onAddGroup={(groupId) => setDocument((current) => addGroup(current, groupId))}
              onChangeGroupConjunction={(groupId, conjunction) =>
                setDocument((current) => changeGroupConjunction(current, groupId, conjunction))
              }
              onUpdateRule={(ruleId, patch) => {
                setDocument((current) => updateRule(current, ruleId, patch));
                setImportDiagnostics([]);
              }}
              onDuplicateRule={(ruleId) => setDocument((current) => duplicateRule(current, ruleId))}
              onDeleteNode={(nodeId) => setDocument((current) => deleteNode(current, nodeId))}
            />

            <ExpressionDocumentPanel
              expression={derived.expression}
              collapsed={workbench.previewCollapsed}
              copyState={workbench.copyState}
              onToggleCollapsed={() => setWorkbench((current) => togglePreview(current))}
              onCopy={() => void copyExpression()}
            />
          </div>

          <SupportPane
            mode={document.mode}
            diagnostics={diagnostics}
            activeTab={workbench.rightTab}
            collapsed={workbench.rightDockCollapsed}
            onTabChange={(rightTab) => setWorkbench((current) => ({ ...current, rightTab }))}
            onToggleCollapsed={() => setWorkbench((current) => toggleDock(current, 'right'))}
          />
        </main>
      </div>
    </FluentProvider>
  );
}

function normalizePalette(platformTheme: PlatformTheme): PaletteId {
  const mode: PorcelainThemeMode = platformTheme === 'dark' || platformTheme === 'highContrast' ? 'dark' : 'light';
  return mode === 'dark' ? 'porcelainDark' : 'porcelainLight';
}

function isFieldDefinitionArray(value: unknown[]): value is FieldDefinition[] {
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'label' in item &&
      'type' in item &&
      'path' in item,
  );
}
