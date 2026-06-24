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
import { emptyStarterDocument, sampleFields } from './sampleData';
import { applySource, discoverCached, discoverThroughAdapter } from './sourceState';
import { ConditionCanvas } from '../workbench/ConditionCanvas';
import { ExpressionDocumentPanel } from '../workbench/ExpressionDocumentPanel';
import { FieldToolboxPane } from '../workbench/FieldToolboxPane';
import { ImportSchemaDialog } from '../workbench/ImportSchemaDialog';
import { AddFieldForm } from '../workbench/AddFieldForm';
import { ManageProfilesDialog } from '../workbench/ManageProfilesDialog';
import { TablePickerDialog } from '../workbench/TablePickerDialog';
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

export function ExpressionBuilderShell({
  adapter,
  initialDocument = emptyStarterDocument,
}: ExpressionBuilderShellProps) {
  const [document, setDocument] = useState<QueryDocument>(initialDocument);
  const [paletteId, setPaletteId] = useState<PaletteId>('porcelainDark');
  const [savedJson, setSavedJson] = useState(() => serializeSavedExpression(initialDocument));
  const [importDiagnostics, setImportDiagnostics] = useState<
    Array<{ severity: 'error' | 'warning'; message: string }>
  >([]);
  const [workbench, setWorkbench] = useState(getDefaultWorkbenchState);
  type OpenDialog = 'none' | 'tablePicker' | 'import' | 'addField' | 'profiles' | 'remap' | 'switch' | 'drift';
  const [dialog, setDialog] = useState<OpenDialog>('none');
  const [relatedSections, setRelatedSections] = useState<
    Array<{ navigationProperty: string; displayName: string }>
  >([]);

  const derived = useMemo(() => deriveBuilderState(document), [document]);
  const selectedRule = findRule(document.root, document.selectedRuleId) ?? findFirstRule(document.root);
  const diagnostics = [...importDiagnostics, ...derived.diagnostics];
  const theme = porcelainTokens[paletteId].mode;

  useEffect(() => {
    let active = true;

    void adapter.getTheme().then((platformTheme) => {
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

  /** Discover fields (cache-first). On success wires related sections for the table. */
  const connectFieldsCached = async (
    table: string,
    tableLabel: string,
    includeRelated: boolean,
    refresh = false,
  ) => {
    const fields = await discoverCached(adapter, adapter.settings, table, includeRelated, refresh);
    if (!isFieldDefinitionArray(fields) || fields.length === 0) {
      await adapter.notify('No fields discovered. Import a schema or add fields manually.', 'info');
      return;
    }
    setDocument((current) =>
      applySource(
        current,
        { kind: 'dataverse', label: tableLabel, tableLogicalName: table, includeRelated },
        fields,
      ),
    );
    if (adapter.getRelatedTables) {
      void adapter.getRelatedTables(table).then((rels) =>
        setRelatedSections(
          rels.map((r) => ({ navigationProperty: r.navigationProperty, displayName: r.displayName })),
        ),
      );
    }
  };

  /** Legacy path used when no table is known (backward compat). */
  const connectFields = async (table?: string, includeRelated?: boolean) => {
    if (table) {
      await connectFieldsCached(table, table, includeRelated ?? false);
      return;
    }
    const result = await discoverThroughAdapter(adapter, undefined, includeRelated);
    if (!isFieldDefinitionArray(result.fields) || result.fields.length === 0) {
      await adapter.notify('No fields discovered. Import a schema or add fields manually.', 'info');
      return;
    }
    setDocument((current) =>
      applySource(
        current,
        {
          kind: 'dataverse',
          label: result.table?.displayName ?? 'Dataverse',
          tableLogicalName: result.table?.logicalName,
          includeRelated,
        },
        result.fields,
      ),
    );
  };

  const handleExpandRelated = (navigationProperty: string) => {
    const table = document.source?.tableLogicalName;
    if (!table || !adapter.discoverRelatedFields) return;
    void adapter.discoverRelatedFields(table, navigationProperty).then((result) => {
      if (result.fields.length === 0) return;
      setDocument((current) => ({
        ...current,
        fields: [
          ...current.fields.filter((f) => !result.fields.some((nf) => nf.id === f.id)),
          ...result.fields,
        ],
      }));
    });
  };

  const loadSampleFields = () => {
    setDocument((current) =>
      applySource(current, { kind: 'sample', label: 'Sample fields' }, sampleFields),
    );
    setRelatedSections([]);
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
          onToggleTheme={() =>
            setPaletteId((current) =>
              current === 'porcelainDark' ? 'porcelainLight' : 'porcelainDark',
            )
          }
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
            source={document.source ?? { kind: 'unknown' }}
            activeTab={workbench.leftTab}
            collapsed={workbench.leftDockCollapsed}
            onTabChange={(leftTab) => setWorkbench((current) => ({ ...current, leftTab }))}
            onToggleCollapsed={() => setWorkbench((current) => toggleDock(current, 'left'))}
            onSwitchTable={() => setDialog('tablePicker')}
            onImport={() => setDialog('import')}
            onAddField={() => setDialog('addField')}
            onLoadSamples={loadSampleFields}
            onManageProfiles={() => setDialog('profiles')}
            onRefresh={() => {
              const table = document.source?.tableLogicalName;
              const label = document.source?.label ?? table ?? 'Dataverse';
              const includeRelated = document.source?.includeRelated ?? false;
              if (table) {
                void connectFieldsCached(table, label, includeRelated, true);
              } else {
                void connectFields();
              }
            }}
            relatedSections={relatedSections}
            onExpandRelated={handleExpandRelated}
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

      <ImportSchemaDialog
        open={dialog === 'import'}
        onDismiss={() => setDialog('none')}
        onImport={(fields, label) => {
          setDocument((current) => applySource(current, { kind: 'import', label }, fields));
          setRelatedSections([]);
          setDialog('none');
        }}
      />

      <AddFieldForm
        open={dialog === 'addField'}
        existing={document.fields}
        onDismiss={() => setDialog('none')}
        onAdd={(field) => {
          setDocument((current) => ({
            ...current,
            version: 2,
            fields: [...current.fields, field],
            source:
              current.source?.kind && current.source.kind !== 'unknown'
                ? current.source
                : { kind: 'import', label: 'Manual fields' },
          }));
          setDialog('none');
        }}
      />

      <ManageProfilesDialog
        open={dialog === 'profiles'}
        settings={adapter.settings}
        currentFields={document.fields}
        onDismiss={() => setDialog('none')}
        onLoad={(name, fields) => {
          setDocument((current) => applySource(current, { kind: 'profile', label: name }, fields));
          setRelatedSections([]);
          setDialog('none');
        }}
      />

      <TablePickerDialog
        open={dialog === 'tablePicker'}
        loadTables={() => adapter.getTables?.() ?? Promise.resolve([])}
        onDismiss={() => setDialog('none')}
        onConfirm={(table, includeRelated) => {
          setDialog('none');
          void connectFieldsCached(table.logicalName, table.displayName, includeRelated, false);
        }}
      />
    </FluentProvider>
  );
}

function normalizePalette(platformTheme: PlatformTheme): PaletteId {
  const mode: PorcelainThemeMode =
    platformTheme === 'dark' || platformTheme === 'highContrast' ? 'dark' : 'light';
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
