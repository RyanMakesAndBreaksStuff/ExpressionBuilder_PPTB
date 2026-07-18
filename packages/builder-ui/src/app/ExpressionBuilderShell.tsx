import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FluentProvider } from '@fluentui/react-components';
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
import { WorkbenchHeader } from '../workbench/WorkbenchHeader';
import {
  getDefaultWorkbenchState,
  toggleDock,
  togglePreview,
} from '../workbench/workbenchState';
import '../theme/tokens.css';

const PALETTE_SETTING_KEY = 'eb.workbench.palette';

export interface ExpressionBuilderShellProps {
  adapter: PlatformAdapter;
  initialDocument?: QueryDocument;
  /**
   * Which build is hosting the shell. Table connections require a live Dataverse
   * connection, which the standalone web build does not have — defaults to 'pptb'
   * (full-featured) so existing hosts and tests keep current behavior unless they
   * opt into 'web'.
   */
  platform?: 'web' | 'pptb';
}

export function ExpressionBuilderShell({
  adapter,
  initialDocument = emptyStarterDocument,
  platform = 'pptb',
}: ExpressionBuilderShellProps) {
  const canConnectTable = platform !== 'web';
  const [document, setDocument] = useState<QueryDocument>(initialDocument);
  const [paletteId, setPaletteId] = useState<PaletteId>('porcelainDark');
  // Tracks whether the user has explicitly picked a palette this session.
  // When true, host theme events no longer overwrite the choice.
  // ponytail: session flag + persisted setting; skip a per-user "auto/light/dark" tri-state until asked
  const [paletteOverride, setPaletteOverride] = useState(false);
  const [importDiagnostics, setImportDiagnostics] = useState<
    Array<{ severity: 'error' | 'warning'; message: string }>
  >([]);
  const [workbench, setWorkbench] = useState(getDefaultWorkbenchState);
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
  const [selectedWrappers, setSelectedWrappers] = useState<string[]>([]);

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

  const derived = useMemo(() => deriveBuilderState(document), [document]);
  const selectedRule = findRule(document.root, document.selectedRuleId) ?? findFirstRule(document.root);
  const diagnostics = [...importDiagnostics, ...derived.diagnostics];
  const theme = porcelainTokens[paletteId].mode;

  useEffect(() => {
    let active = true;

    // Prefer persisted palette; fall back to host theme.
    void adapter.settings
      .get(PALETTE_SETTING_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'porcelainDark' || stored === 'porcelainLight') {
          setPaletteId(stored);
          setPaletteOverride(true);
          return;
        }
        void adapter.getTheme().then((platformTheme) => {
          if (active) setPaletteId(normalizePalette(platformTheme));
        });
      })
      .catch(() => {
        // Settings read failed — fall back to host theme silently.
        void adapter.getTheme().then((platformTheme) => {
          if (active) setPaletteId(normalizePalette(platformTheme));
        });
      });

    return () => {
      active = false;
    };
  }, [adapter]);

  useEffect(() => {
    const unsubscribe = adapter.onThemeChanged((platformTheme) => {
      // Host events only apply while the user has NOT locked a palette this session.
      setPaletteId((current) => (paletteOverride ? current : normalizePalette(platformTheme)));
    });
    return unsubscribe;
  }, [adapter, paletteOverride]);


  const updateMode = (mode: ExpressionMode) => {
    setDocument((current) => ({ ...current, mode }));
    setImportDiagnostics([]);
  };

  const copyExpression = async () => {
    try {
      await adapter.copyToClipboard(derived.expression);
      setWorkbench((current) => ({ ...current, copyState: 'copied' }));
      setTimeout(() => {
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
    await adapter.copyToClipboard(serializeSavedExpression(document));
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
  };

  /** Discover fields (cache-first). On refresh, diffs and shows the drift dialog (T19). */
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

    if (adapter.getRelatedTables) {
      void adapter.getRelatedTables(table)
        .then((rels) =>
          setRelatedSections(
            rels.map((r) => ({ navigationProperty: r.navigationProperty, displayName: r.displayName })),
          ),
        )
        .catch((err) => {
          void adapter.notify(
            `Could not load related tables: ${err instanceof Error ? err.message : 'unknown error'}`,
            'warning',
          );
        });
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
    void adapter.discoverRelatedFields(table, navigationProperty)
      .then((result) => {
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
        void adapter.notify(
          `Could not expand related fields: ${err instanceof Error ? err.message : 'unknown error'}`,
          'warning',
        );
      });
  };

  const createRuleFromField = (field: FieldDefinition) => {
    setDocument((current) => {
      const targetGroupId = current.activeGroupId ?? current.root.id;
      return addRule(current, targetGroupId, {
        fieldId: field.id,
        operator: getSafeOperator(field, 'equals'),
        value: getDefaultValue(field),
      });
    });
  };

  const toggleWrapper = (wrapperId: string) =>
    setSelectedWrappers((current) =>
      current.includes(wrapperId) ? current.filter((id) => id !== wrapperId) : [...current, wrapperId],
    );

  const loadSampleFields = () => {
    setDocument((current) =>
      applySource(current, { kind: 'sample', label: 'Sample fields' }, sampleFields),
    );
    setRelatedSections([]);
  };

  /**
   * T18: Intercept table confirmation. Discovers fields first; if existing rules would
   * become orphans, shows SwitchSourceDialog before applying. Otherwise applies directly.
   */
  const handleTableConfirm = async (table: string, tableLabel: string, includeRelated: boolean) => {
    const fields = await discoverCached(adapter, adapter.settings, table, includeRelated, false);
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
    if (adapter.getRelatedTables) {
      void adapter.getRelatedTables(table)
        .then((rels) =>
          setRelatedSections(
            rels.map((r) => ({ navigationProperty: r.navigationProperty, displayName: r.displayName })),
          ),
        )
        .catch((err) => {
          void adapter.notify(
            `Could not load related tables: ${err instanceof Error ? err.message : 'unknown error'}`,
            'warning',
          );
        });
    } else {
      setRelatedSections([]);
    }
  };

  const paletteVars = porcelainTokens[paletteId].cssVariables;

  return (
    <FluentProvider theme={createPorcelainFluentTheme(paletteId)}>
      <div className="eb-root" data-theme={theme} style={paletteVars as CSSProperties}>
        <WorkbenchHeader
          mode={document.mode}
          paletteId={paletteId}
          onModeChange={updateMode}
          onExport={() => void exportDocument()}
          onImport={() => setDialog('importExpression')}
          onToggleTheme={() => {
            setPaletteId((current) => {
              const next = current === 'porcelainDark' ? 'porcelainLight' : 'porcelainDark';
              void adapter.settings.set(PALETTE_SETTING_KEY, next).catch(() => {});
              return next;
            });
            setPaletteOverride(true);
          }}
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
            canConnectTable={canConnectTable}
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
            onCreateRuleFromField={createRuleFromField}
            selectedWrappers={selectedWrappers}
            onToggleWrapper={toggleWrapper}
            onClearWrapperSelection={() => setSelectedWrappers([])}
          />

          <div className="eb-center-col">
            <ConditionCanvas
              root={document.root}
              fields={document.fields}
              mode={document.mode}
              selectedRuleId={selectedRule?.id}
              activeGroupId={document.activeGroupId ?? document.root.id}
              onFocusGroup={(groupId) => setDocument((current) => focusGroup(current, groupId))}
              selectedWrappers={selectedWrappers}
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
              onClear={() => setDocument((current) => clearDocument(current))}
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
          void handleTableConfirm(table.logicalName, table.displayName, includeRelated);
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

      <OnboardingPanel settings={adapter.settings} />
    </FluentProvider>
  );
}

function normalizePalette(platformTheme: PlatformTheme): PaletteId {
  const mode: PorcelainThemeMode =
    platformTheme === 'dark' || platformTheme === 'highContrast' ? 'dark' : 'light';
  return mode === 'dark' ? 'porcelainDark' : 'porcelainLight';
}

