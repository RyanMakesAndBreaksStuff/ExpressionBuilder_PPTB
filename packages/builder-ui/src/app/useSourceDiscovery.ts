import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { diffFields, type FieldDrift } from '../importExport/metadataCache';
import type { QueryDocument } from '../composer/querySchema';
import type { RelatedLoadStatus } from '../workbench/types';
import { isFieldDefinitionArray } from './fieldUtils';
import {
  applySource, diffSourceSwitch, discoverCached, discoverThroughAdapter, removeRules, referencedFieldIds,
  type SourceSwitchDiff,
} from './sourceState';

// Pending state for the switch-source confirmation dialog (T18).
type PendingSwitch = {
  table: string;
  tableLabel: string;
  includeRelated: boolean;
  fields: FieldDefinition[];
  diff: SourceSwitchDiff;
};

// Pending state for the drift summary dialog (T19).
type PendingDrift = { drift: FieldDrift; removedInUse: string[] };

/**
 * Source discovery for the shell: table/field connection, related sections,
 * the switch-source and drift confirmations, and the blocking busy overlay.
 * `openDialog` lets discovery raise the drift/switch dialogs the shell owns.
 */
export function useSourceDiscovery(
  adapter: PlatformAdapter,
  document: QueryDocument,
  setDocument: Dispatch<SetStateAction<QueryDocument>>,
  openDialog: (dialog: 'drift' | 'switch') => void,
) {
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

  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);
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
        openDialog('drift');
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
      openDialog('switch');
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

  return {
    relatedSections,
    relatedStatus,
    busy,
    pendingSwitch,
    setPendingSwitch,
    pendingDrift,
    setPendingDrift,
    runBusy,
    acceptSourceReplacement,
    connectFields,
    connectFieldsCached,
    handleExpandRelated,
    handleTableConfirm,
    applyTableSwitch,
  };
}
