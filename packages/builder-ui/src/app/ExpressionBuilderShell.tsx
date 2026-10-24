import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FluentProvider, Spinner } from '@fluentui/react-components';
import type { ExpressionMode, FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformAdapter, PlatformTheme } from '@ryanmakes/eb_platformadapter';
import {
  addGroup,
  addRule,
  changeGroupConjunction,
  clearDocument,
  deleteNode,
  duplicateRule,
  focusGroup,
  moveNode,
  reorderNode,
  selectRule,
  updateRule,
} from '../composer/queryActions';
import type { QueryDocument } from '../composer/querySchema';
import { parseSavedExpression, serializeSavedExpression } from '../importExport/savedExpressionSchema';
import { diffFields, type FieldDrift } from '../importExport/metadataCache';
import {
  createPorcelainFluentTheme,
  porcelainTokens,
  type PaletteId,
  type PorcelainThemeMode,
} from '../theme/workbenchTokens';
import { deriveBuilderState, findFirstRule, findRule, getDefaultValue, getSafeOperator } from './builderState';
import { isFieldDefinitionArray } from './fieldUtils';
import { emptyStarterDocument, sampleFields } from './sampleData';
import { applySource, diffSourceSwitch, discoverCached, discoverThroughAdapter, removeRules, referencedFieldIds } from './sourceState';
import { ConditionCanvas } from '../workbench/ConditionCanvas';
import { ExpressionDocumentPanel } from '../workbench/ExpressionDocumentPanel';
import { FieldToolboxPane } from '../workbench/FieldToolboxPane';
import type { RelatedLoadStatus } from '../workbench/types';
import { ImportSchemaDialog } from '../workbench/ImportSchemaDialog';
import { ImportExpressionDialog } from '../workbench/ImportExpressionDialog';
import { AddFieldForm } from '../workbench/AddFieldForm';
import { ManageProfilesDialog } from '../workbench/ManageProfilesDialog';
import { TablePickerDialog } from '../workbench/TablePickerDialog';
import { RemapFieldDialog } from '../workbench/RemapFieldDialog';
import { SwitchSourceDialog } from '../workbench/SwitchSourceDialog';
import { SourceUpdatedDialog } from '../workbench/SourceUpdatedDialog';
import { OnboardingPanel } from '../workbench/OnboardingPanel';
import { SupportPane } from '../workbench/SupportPane';
import { ShellHeader } from '../workbench/ShellHeader';
import { BuilderDragDropProvider } from '../workbench/BuilderDragDropProvider';
import { JsonPayloadWorkspace } from '../workbench/JsonPayloadWorkspace';
import { FunctionsWorkspace } from '../workbench/FunctionsWorkspace';
import {
  createJsonPayloadSession, getParsedSources, jsonPayloadSessionReducer,
} from '../workbench/jsonPayloadSession';
import type { ScreenId } from '../workbench/screens';
import {
  getDefaultWorkbenchState,
  isShortViewport,
  isStackedViewport,
  toggleDock,
  togglePreview,
} from '../workbench/workbenchState';
import '../theme/tokens.css';
import '../theme/shell.css';
import '../theme/functions.css';
import '../theme/jsonPayloads.css';

const createRuleSeed = (field: FieldDefinition) => ({
  fieldId: field.id,
  operator: getSafeOperator(field, 'equals'),
  value: getDefaultValue(field),
});

export interface ExpressionBuilderShellProps {
  adapter: PlatformAdapter;
  hostActions?: ReactNode;
  initialDocument?: QueryDocument;
  /**
   * Which build is hosting the shell. Table connections require a live Dataverse
   * connection, which the standalone web build does not have — defaults to 'pptb'
   * (full-featured) so existing hosts and tests keep current behavior unless they
   * opt into 'web'.
   */
  platform?: 'web' | 'pptb';
  /**
   * Host theme known before first paint. Without it the shell starts on
   * porcelain dark and animates to the real theme, and that in-between frame
   * fails color contrast.
   */
  initialTheme?: PlatformTheme;
}

export function ExpressionBuilderShell({
  adapter,
  hostActions,
  initialDocument = emptyStarterDocument,
  initialTheme,
  platform = 'pptb',
}: ExpressionBuilderShellProps) {
  const canConnectTable = platform !== 'web';
  const [document, setDocument] = useState<QueryDocument>(initialDocument);
  const [paletteId, setPaletteId] = useState<PaletteId>(() =>
    initialTheme ? normalizePalette(initialTheme) : 'porcelainDark',
  );
  const [importDiagnostics, setImportDiagnostics] = useState<
    Array<{ severity: 'error' | 'warning'; message: string }>
  >([]);
  const [workbench, setWorkbench] = useState(() =>
    getDefaultWorkbenchState({
      stacked: isStackedViewport(),
      short: isShortViewport(),
      hasFields: initialDocument.fields.length > 0,
    }),
  );
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyResetTimer.current), []);

  const [screen, setScreen] = useState<ScreenId>('condition');
  const [jsonSession, jsonDispatch] = useReducer(
    jsonPayloadSessionReducer,
    undefined,
    createJsonPayloadSession,
  );
  // Each payload's parse notice reaches the host once, even across workspace remounts or adapter swaps.
  const deliveredNotices = useRef(new Map<string, number>());
  useEffect(() => {
    for (const payload of jsonSession.payloads) {
      const notice = payload.state.parseNotice;
      const delivered = deliveredNotices.current.get(payload.id) ?? 0;
      if (!notice || notice.id <= delivered) continue;
      deliveredNotices.current.set(payload.id, notice.id);
      void adapter.notify(notice.message, 'success');
    }
  }, [adapter, jsonSession.payloads]);
  const parsedSources = useMemo(
    () => getParsedSources(jsonSession.payloads),
    [jsonSession.payloads],
  );

  /**
   * Stacked, the Toolbox has to stay open on an empty document — it holds the
   * only route to a data source. The moment fields arrive it has done that job,
   * and a full field list below the canvas is what buried the canvas in the
   * first place, so fold it away on the empty→populated transition only. Later
   * field changes and any manual toggle are left alone.
   */
  const hadFields = useRef(initialDocument.fields.length > 0);
  const hasFields = document.fields.length > 0;
  useEffect(() => {
    const wasEmpty = !hadFields.current;
    hadFields.current = hasFields;
    if (wasEmpty && hasFields && isStackedViewport()) {
      setWorkbench((current) => ({ ...current, leftDockCollapsed: true }));
    }
  }, [hasFields]);
  type OpenDialog =
    | 'none'
    | 'tablePicker'
    | 'import'
    | 'importExpression'
    | 'addField'
    | 'profiles'
    | 'remap'
    | 'switch'
    | 'drift';
  const [dialog, setDialog] = useState<OpenDialog>('none');
  const [relatedSections, setRelatedSections] = useState<
    Array<{ navigationProperty: string; displayName: string }>
  >([]);
  /**
   * Accepted source/document replacement, refresh, and adapter change bump this.
   * Related-section and related-field completions carry the generation and adapter
   * they started with and no-op once either has moved. Not a busy-overlay owner.
   */
  const sourceGeneration = useRef(0);
  /** Related-section load status for the current source generation; reset with it. */
  const [relatedStatus, setRelatedStatus] = useState<Record<string, RelatedLoadStatus>>({});
  const adapterRef = useRef(adapter);
  useLayoutEffect(() => {
    if (adapterRef.current === adapter) return;
    adapterRef.current = adapter;
    sourceGeneration.current += 1;
    // Old-adapter requests are dropped, so their pending flags must not block a retry.
    setRelatedStatus({});
  }, [adapter]);

  const isCurrentSourceRequest = (generation: number, requestAdapter: PlatformAdapter) =>
    generation === sourceGeneration.current && requestAdapter === adapterRef.current;

  const acceptSourceReplacement = () => {
    sourceGeneration.current += 1;
    setRelatedSections([]);
    setRelatedStatus({});
  };

  const loadRelatedSections = (table: string) => {
    const generation = sourceGeneration.current;
    const requestAdapter = adapter;
    if (!requestAdapter.getRelatedTables) {
      setRelatedSections([]);
      return;
    }
    void requestAdapter
      .getRelatedTables(table)
      .then((rels) => {
        if (!isCurrentSourceRequest(generation, requestAdapter)) return;
        setRelatedSections(
          rels.map((r) => ({
            navigationProperty: r.navigationProperty,
            displayName: r.displayName,
          })),
        );
      })
      .catch((err) => {
        if (!isCurrentSourceRequest(generation, requestAdapter)) return;
        void requestAdapter.notify(
          `Could not load related tables: ${err instanceof Error ? err.message : 'unknown error'}`,
          'warning',
        );
      });
  };

  // Pending state for the switch-source confirmation dialog (T18).
  type PendingSwitch = {
    table: string;
    tableLabel: string;
    includeRelated: boolean;
    fields: FieldDefinition[];
    diff: import('./sourceState').SourceSwitchDiff;
  };
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);

  // Pending state for the drift summary dialog (T19).
  type PendingDrift = { drift: FieldDrift; removedInUse: string[] };
  const [pendingDrift, setPendingDrift] = useState<PendingDrift | null>(null);

  /**
   * Blocking overlay for retrieve/load operations. Without it the user can edit
   * rules or start a second discovery while the first promise is still in
   * flight, and the late result overwrites what they just did.
   * Each run owns a token and clears only its own overlay, so a superseded run
   * cannot hide a newer one. A rejection (primary discovery or cache access) is
   * reported once against the adapter that started it, unless that adapter was
   * replaced; nothing was applied, so the current document stays and the user
   * can retry. Related-field work catches its own errors before reaching here.
   */
  // Overlapping runs stack; the overlay shows the newest one until every run finishes.
  const [busyRuns, setBusyRuns] = useState<Array<{ owner: object; label: string }>>([]);
  const busy = busyRuns.at(-1) ?? null;
  const runBusy = async <T,>(label: string, work: () => Promise<T>): Promise<T | undefined> => {
    const owner = {};
    const requestAdapter = adapter;
    setBusyRuns((runs) => [...runs, { owner, label }]);
    try {
      return await work();
    } catch (err) {
      if (requestAdapter !== adapterRef.current) return undefined;
      void requestAdapter.notify(
        `Could not load fields: ${err instanceof Error ? err.message : 'unknown error'}`,
        'error',
      );
      return undefined;
    } finally {
      setBusyRuns((runs) => runs.filter((run) => run.owner !== owner));
    }
  };

  const derived = useMemo(() => deriveBuilderState(document), [document]);
  const selectedRule = findRule(document.root, document.selectedRuleId) ?? findFirstRule(document.root);
  const diagnostics = [...importDiagnostics, ...derived.diagnostics];
  const theme = porcelainTokens[paletteId].mode;

  useEffect(() => {
    let active = true;
    void adapter.getTheme().then((t) => { if (active) setPaletteId(normalizePalette(t)); });
    const unsubscribe = adapter.onThemeChanged((t) => setPaletteId(normalizePalette(t)));
    return () => { active = false; unsubscribe(); };
  }, [adapter]);

  const updateMode = (mode: ExpressionMode) => {
    setDocument((current) => ({ ...current, mode }));
    setImportDiagnostics([]);
  };

  const copyExpression = async () => {
    try {
      await adapter.copyToClipboard(derived.expression);
      setWorkbench((current) => ({ ...current, copyState: 'copied' }));
      // A second copy inside the window would otherwise let the first timer clear
      // the confirmation early, and an unmount mid-window would set state on a
      // dead component.
      if (copyResetTimer.current !== undefined) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => {
        copyResetTimer.current = undefined;
        setWorkbench((current) => ({ ...current, copyState: 'idle' }));
      }, 1200);
    } catch (err) {
      await adapter.notify(
        `Could not copy expression: ${err instanceof Error ? err.message : 'clipboard unavailable'}`,
        'error',
      );
    }
  };

  /** Copies the current document as saved-expression JSON to the clipboard. */
  const exportDocument = async () => {
    try {
      await adapter.copyToClipboard(serializeSavedExpression(document));
    } catch (err) {
      await adapter.notify(
        `Could not copy expression JSON: ${err instanceof Error ? err.message : 'clipboard unavailable'}`,
        'error',
      );
      return;
    }
    await adapter.notify('Expression JSON copied to clipboard.', 'success');
  };

  /** Parses pasted saved-expression JSON (from the import dialog) and applies it. */
  const importDocument = (source: string) => {
    const result = parseSavedExpression(source);
    if (!result.ok) {
      setImportDiagnostics(result.errors.map((message) => ({ severity: 'error', message })));
      return;
    }
    setDocument(result.document);
    setImportDiagnostics([]);
    setDialog('none');
    acceptSourceReplacement();
  };

  /** Discover fields (cache-first). On refresh, diffs and shows the drift dialog (T19). */
  const connectFieldsCached = async (
    table: string,
    tableLabel: string,
    includeRelated: boolean,
    refresh = false,
  ) => {
    const generation = sourceGeneration.current;
    const requestAdapter = adapter;
    const fields = await discoverCached(adapter, adapter.settings, table, includeRelated, refresh);
    if (!isCurrentSourceRequest(generation, requestAdapter)) return;
    if (!isFieldDefinitionArray(fields) || fields.length === 0) {
      await adapter.notify('No fields discovered. Import a schema or add fields manually.', 'info');
      return;
    }

    // T19: On refresh, diff the old vs new field set and surface a drift summary.
    if (refresh && document.source?.kind === 'dataverse') {
      const drift = diffFields(document.fields, fields);
      const hasDrift = drift.added.length > 0 || drift.removed.length > 0 || drift.changed.length > 0;
      if (hasDrift) {
        const usedIds = referencedFieldIds(document.root);
        const removedInUse = drift.removed.filter((f) => usedIds.has(f.id)).map((f) => f.id);
        setPendingDrift({ drift, removedInUse });
        setDialog('drift');
      }
    }
    setDocument((current) =>
      applySource(
        current,
        { kind: 'dataverse', label: tableLabel, tableLogicalName: table, includeRelated },
        fields,
      ),
    );
    acceptSourceReplacement();
    loadRelatedSections(table);
  };

  /** Legacy path used when no table is known (backward compat). */
  const connectFields = async (table?: string, includeRelated?: boolean) => {
    if (table) {
      await connectFieldsCached(table, table, includeRelated ?? false);
      return;
    }
    const generation = sourceGeneration.current;
    const requestAdapter = adapter;
    const result = await discoverThroughAdapter(adapter, undefined, includeRelated);
    if (!isCurrentSourceRequest(generation, requestAdapter)) return;
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
    acceptSourceReplacement();
  };

  const handleExpandRelated = (navigationProperty: string) => {
    const table = document.source?.tableLogicalName;
    const discoverRelatedFields = adapter.discoverRelatedFields;
    const current = relatedStatus[navigationProperty];
    if (!table || !discoverRelatedFields || current === 'pending' || current === 'succeeded') return;
    const generation = sourceGeneration.current;
    const requestAdapter = adapter;
    const setStatus = (status: RelatedLoadStatus) =>
      setRelatedStatus((prev) => ({ ...prev, [navigationProperty]: status }));
    setStatus('pending');
    void runBusy('Loading related fields…', () => discoverRelatedFields(table, navigationProperty)
      .then((result) => {
        if (!isCurrentSourceRequest(generation, requestAdapter)) return;
        setStatus('succeeded');
        if (result.fields.length === 0) return;
        setDocument((current) => ({
          ...current,
          fields: [
            ...current.fields.filter((f) => !result.fields.some((nf) => nf.id === f.id)),
            ...result.fields,
          ],
        }));
      })
      .catch((err) => {
        if (!isCurrentSourceRequest(generation, requestAdapter)) return;
        setStatus('failed');
        void requestAdapter.notify(
          `Could not expand related fields: ${err instanceof Error ? err.message : 'unknown error'}`,
          'warning',
        );
      }));
  };

  const createRuleFromField = (field: FieldDefinition) => {
    setDocument((current) => {
      const targetGroupId = current.activeGroupId ?? current.root.id;
      return addRule(current, targetGroupId, createRuleSeed(field));
    });
  };

  const insertFieldAtPosition = (
    fieldId: string,
    groupId: string,
    index: number,
  ) => {
    setDocument((current) => {
      const field = current.fields.find((candidate) => candidate.id === fieldId);
      return field ? addRule(current, groupId, createRuleSeed(field), index) : current;
    });
  };

  const reorderConditionNode = (
    nodeId: string,
    parentGroupId: string,
    finalIndex: number,
  ) => {
    setDocument((current) =>
      reorderNode(current, nodeId, parentGroupId, finalIndex),
    );
  };

  const moveConditionNode = (
    nodeId: string,
    targetGroupId: string,
    index?: number,
  ) => {
    setDocument((current) => moveNode(current, nodeId, targetGroupId, index));
  };

  const loadSampleFields = () => {
    acceptSourceReplacement();
    setDocument((current) =>
      applySource(current, { kind: 'sample', label: 'Sample fields' }, sampleFields),
    );
  };

  /**
   * T18: Intercept table confirmation. Discovers fields first; if existing rules would
   * become orphans, shows SwitchSourceDialog before applying. Otherwise applies directly.
   */
  const handleTableConfirm = async (table: string, tableLabel: string, includeRelated: boolean) => {
    const generation = sourceGeneration.current;
    const requestAdapter = adapter;
    const fields = await discoverCached(adapter, adapter.settings, table, includeRelated, false);
    // A newer source change or adapter swap supersedes this discovery.
    if (!isCurrentSourceRequest(generation, requestAdapter)) return;
    if (!isFieldDefinitionArray(fields) || fields.length === 0) {
      await adapter.notify('No fields discovered. Import a schema or add fields manually.', 'info');
      return;
    }
    // Check against current document for rule collisions.
    const diff = diffSourceSwitch(document, fields);
    if (diff.affectedRuleIds.length > 0) {
      setPendingSwitch({ table, tableLabel, includeRelated, fields, diff });
      setDialog('switch');
      return;
    }
    // No affected rules — apply directly.
    applyTableSwitch(table, tableLabel, includeRelated, fields);
  };

  /** Apply a confirmed table switch, with optional rule removal. */
  const applyTableSwitch = (
    table: string,
    tableLabel: string,
    includeRelated: boolean,
    fields: FieldDefinition[],
    removeAffected?: string[],
  ) => {
    setDocument((current) => {
      const base = applySource(
        current,
        { kind: 'dataverse', label: tableLabel, tableLogicalName: table, includeRelated },
        fields,
      );
      return removeAffected?.length ? removeRules(base, removeAffected) : base;
    });
    acceptSourceReplacement();
    loadRelatedSections(table);
  };

  const paletteVars = porcelainTokens[paletteId].cssVariables;

  return (
    <FluentProvider theme={createPorcelainFluentTheme(paletteId)}>
      <div className="eb-root" data-theme={theme} style={paletteVars as CSSProperties}>
        <ShellHeader
          screen={screen}
          onScreenChange={setScreen}
          mode={document.mode}
          onModeChange={updateMode}
          onImport={() => setDialog('importExpression')}
          onExport={() => void exportDocument()}
          hostActions={hostActions}
        />

        <BuilderDragDropProvider
          fields={document.fields}
          root={document.root}
          onInsertField={insertFieldAtPosition}
          onReorderNode={reorderConditionNode}
          onMoveNode={moveConditionNode}
        >
          {/* One main landmark contains every screen. */}
          <main className="eb-builder-main">
            <div
              aria-label="Trigger / Filter"
              hidden={screen !== 'condition'}
              className="eb-builder-panel eb-workspace"
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
                collapsed={workbench.leftDockCollapsed}
                onToggleCollapsed={() =>
                  setWorkbench((current) => toggleDock(current, 'left'))
                }
                onSwitchTable={() => setDialog('tablePicker')}
                onImport={() => setDialog('import')}
                onAddField={() => setDialog('addField')}
                onLoadSamples={loadSampleFields}
                canConnectTable={canConnectTable}
                onManageProfiles={() => setDialog('profiles')}
                onRefresh={() => {
                  const table = document.source?.tableLogicalName;
                  const label = document.source?.label ?? table ?? 'Dataverse';
                  const includeRelated = document.source?.includeRelated ?? false;
                  void runBusy('Refreshing fields…', () =>
                    table ? connectFieldsCached(table, label, includeRelated, true) : connectFields(),
                  );
                }}
                relatedSections={relatedSections}
                relatedStatus={relatedStatus}
                onExpandRelated={handleExpandRelated}
                onCreateRuleFromField={createRuleFromField}
              />
  
              <div className="eb-center-col">
                <ConditionCanvas
                  root={document.root}
                  fields={document.fields}
                  mode={document.mode}
                  selectedRuleId={selectedRule?.id}
                  activeGroupId={document.activeGroupId ?? document.root.id}
                  onFocusGroup={(groupId) =>
                    setDocument((current) => focusGroup(current, groupId))
                  }
                  onRequestRemap={(ruleId) => {
                    setDocument((current) => selectRule(current, ruleId));
                    setDialog('remap');
                  }}
                  onSelectRule={(ruleId) => {
                    setDocument((current) => selectRule(current, ruleId));
                    setImportDiagnostics([]);
                  }}
                  onAddRule={(groupId) =>
                    setDocument((current) =>
                      addRule(current, groupId, {
                        fieldId: current.fields[0]?.id ?? '',
                        operator: 'equals',
                        value: getDefaultValue(current.fields[0]),
                      }),
                    )
                  }
                  onAddGroup={(groupId) =>
                    setDocument((current) => addGroup(current, groupId))
                  }
                  onChangeGroupConjunction={(groupId, conjunction) =>
                    setDocument((current) =>
                      changeGroupConjunction(current, groupId, conjunction),
                    )
                  }
                  onUpdateRule={(ruleId, patch) => {
                    setDocument((current) => updateRule(current, ruleId, patch));
                    setImportDiagnostics([]);
                  }}
                  onDuplicateRule={(ruleId) =>
                    setDocument((current) => duplicateRule(current, ruleId))
                  }
                  onDeleteNode={(nodeId) =>
                    setDocument((current) => deleteNode(current, nodeId))
                  }
                  onReorderNode={reorderConditionNode}
                  onMoveNode={(nodeId, targetGroupId) => moveConditionNode(nodeId, targetGroupId)}
                  onClear={() => setDocument((current) => clearDocument(current))}
                />
  
                <ExpressionDocumentPanel
                  expression={derived.expression}
                  collapsed={workbench.previewCollapsed}
                  copyState={workbench.copyState}
                  onToggleCollapsed={() =>
                    setWorkbench((current) => togglePreview(current))
                  }
                  onCopy={() => void copyExpression()}
                />
              </div>
  
              <SupportPane
                mode={document.mode}
                diagnostics={diagnostics}
                activeTab={workbench.rightTab}
                collapsed={workbench.rightDockCollapsed}
                onTabChange={(rightTab) =>
                  setWorkbench((current) => ({ ...current, rightTab }))
                }
                onToggleCollapsed={() =>
                  setWorkbench((current) => toggleDock(current, 'right'))
                }
              />
            </div>

            <div
              aria-label="Functions"
              hidden={screen !== 'functions'}
              className="eb-builder-panel eb-functions-panel"
            >
              <FunctionsWorkspace
                adapter={adapter}
                sources={parsedSources}
              />
            </div>

            <div
              aria-label="JSON reference"
              hidden={screen !== 'jsonReference'}
              className="eb-builder-panel eb-json-panel"
            >
              <JsonPayloadWorkspace
                adapter={adapter}
                active={screen === 'jsonReference'}
                session={jsonSession}
                dispatch={jsonDispatch}
              />
            </div>
          </main>
        </BuilderDragDropProvider>

        {busy ? (
          <div className="eb-busy-overlay" role="alert" aria-busy="true" aria-live="polite">
            <Spinner label={busy.label} />
          </div>
        ) : null}
      </div>

      <ImportSchemaDialog
        open={dialog === 'import'}
        onDismiss={() => setDialog('none')}
        onImport={(fields, label) => {
          acceptSourceReplacement();
          setDocument((current) => applySource(current, { kind: 'import', label }, fields));
          setDialog('none');
        }}
      />

      <ImportExpressionDialog
        open={dialog === 'importExpression'}
        onDismiss={() => setDialog('none')}
        onImport={importDocument}
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
          acceptSourceReplacement();
          setDocument((current) => applySource(current, { kind: 'profile', label: name }, fields));
          setDialog('none');
        }}
        onNotify={adapter.notify}
      />

      <TablePickerDialog
        open={dialog === 'tablePicker'}
        loadTables={() => adapter.getTables?.() ?? Promise.resolve([])}
        onDismiss={() => setDialog('none')}
        onConfirm={(table, includeRelated) => {
          setDialog('none');
          void runBusy('Loading table fields…', () =>
            handleTableConfirm(table.logicalName, table.displayName, includeRelated),
          );
        }}
      />

      <SourceUpdatedDialog
        open={dialog === 'drift'}
        drift={pendingDrift?.drift ?? { added: [], removed: [], changed: [] }}
        removedInUse={pendingDrift?.removedInUse ?? []}
        onClose={() => {
          setDialog('none');
          setPendingDrift(null);
        }}
      />

      <SwitchSourceDialog
        open={dialog === 'switch'}
        diff={pendingSwitch?.diff ?? { orphanedFieldIds: [], affectedRuleIds: [] }}
        targetLabel={pendingSwitch?.tableLabel ?? ''}
        onDismiss={() => {
          setDialog('none');
          setPendingSwitch(null);
        }}
        onConfirm={(mode) => {
          if (pendingSwitch) {
            applyTableSwitch(
              pendingSwitch.table,
              pendingSwitch.tableLabel,
              pendingSwitch.includeRelated,
              pendingSwitch.fields,
              mode === 'remove' ? pendingSwitch.diff.affectedRuleIds : undefined,
            );
          }
          setDialog('none');
          setPendingSwitch(null);
        }}
      />

      <RemapFieldDialog
        open={dialog === 'remap'}
        rule={selectedRule ?? null}
        fields={document.fields}
        onDismiss={() => setDialog('none')}
        onRemap={(ruleId, patch) => {
          setDocument((current) => updateRule(current, ruleId, patch));
          setDialog('none');
        }}
      />

      <OnboardingPanel settings={adapter.settings} canConnectTable={canConnectTable} />
    </FluentProvider>
  );
}

function normalizePalette(platformTheme: PlatformTheme): PaletteId {
  const mode: PorcelainThemeMode =
    platformTheme === 'dark' || platformTheme === 'highContrast' ? 'dark' : 'light';
  return mode === 'dark' ? 'porcelainDark' : 'porcelainLight';
}
