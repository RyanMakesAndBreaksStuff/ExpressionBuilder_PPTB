# Implementation Plan: Data Source Selection & Field Discovery

Merging the data-source-selection research (see `docs/research/data-source-selection-recommendations.md`)
into the existing Expression Builder. This plan turns the recommendations into ordered,
verifiable tasks against the real codebase.

> **Code-complete edition.** Every task below now carries a **`Code`** block. For
> **pre-existing files** the code is given as a *diff/block* (anchored to the real current
> source so it applies cleanly). For **new files** the *complete* contents are given. Treat
> these blocks as the contract: implementers copy them verbatim and only adjust for genuine
> compile/test feedback. Shared types are defined **once** (see *Shared Type Contract* below
> and Tasks 1–4) and **referenced**, never redefined, downstream — this is the anti-drift rule.

## Overview

Today the builder gets fields one way: `PlatformAdapter.getDataverseFields(): Promise<unknown[]>`,
which the PPTB host may bridge and the web host hard-returns as `[]`; on miss the shell silently
keeps `sampleFields` and shows a no-op **Connect** button. This plan replaces that with a
**single, source-agnostic "Data Source"** the builder owns: Dataverse table discovery via the PPTB
host's `dataverseAPI` metadata methods, plus import / manual-add / profiles for non-Dataverse use,
all surfaced through one toolbox source header. Changes are **additive and backward-compatible**;
`getDataverseFields()` is retained as a deprecated shim.

## Architecture Decisions

- **Widen the adapter, don't replace it.** Add optional `discoverFields`/`getTables`/`listDataSources`
  to `PlatformAdapter`; keep `getDataverseFields()` as a shim (`() => discoverFields({}).fields ?? []`).
  Optional methods let the web adapter implement none and degrade to import-only. (Rec §5.3)
- **Consume PPTB `dataverseAPI`, not just `toolboxAPI.getDataverseFields()`.** The host exposes
  `getAllEntitiesMetadata`, `getEntityMetadata`, `getEntityRelatedMetadata` (Attributes / relationships /
  `Attributes(LogicalName='x')/OptionSet`), `getAttributeODataType`, `getCSDLDocument`, and a generic
  `execute(request)` (all v1.0.17+; CSDL v1.0.20). Auth/headers are the host's concern — the builder
  never handles tokens. (Rec §2.8)
- **One primary table at a time; related fields are flattened dotted paths.** The engine formats from
  `path[]` only and has no join model, so multiple active tables are out of scope. (Rec §2.3)
- **Provenance is additive.** New optional fields on `FieldDefinition`; `QueryDocument` bumps to v2 with
  a v1→v2 upgrade-on-load in `parseSavedExpression`. (Rec §5.1–5.2)
- **Schema honesty over silent samples.** Samples become opt-in; source switches preserve rules and flag
  orphans via the engine's existing `UNKNOWN_FIELD` diagnostic rather than clearing the canvas. (Rec §4.6)
- **Time-based metadata cache (default).** PPTB convenience helpers don't expose `ClientVersionStamp`, so
  delta refresh via `RetrieveMetadataChanges` is an optional upgrade through `dataverseAPI.execute`. (Rec §5.5)

## Project Conventions (for verification steps)

| Action | Command |
|---|---|
| Unit tests (Vitest) | `npm run test` (scope: `npx vitest run <path>` or `-t "name"`) |
| Typecheck | `npm run typecheck` (`tsc -b`) |
| Lint | `npm run lint` |
| Full build | `npm run build` |
| E2E (Playwright) | `npm run test:e2e` |
| Manual — web | `npm run dev:web` (http://127.0.0.1:5173) |
| Manual — PPTB | `npm run dev:pptb` (http://127.0.0.1:5174) |

Packages: `@ryanmakes/eb_engine`, `@ryanmakes/eb_platformadapter`, `@ryanmakes/eb_builder-ui`;
apps `@ryanmakes/eb_web`, `@ryanmakes/expresssionbuilder_pptb`. React 19, Fluent UI v9.

## Dependency Graph

```
engine: FieldDefinition provenance (T1)
   │
   ├── platform: AttributeType→FieldType map (T2)
   │        │
   │        └── platform: PPTB discoverFields/getTables (T5) ── web adapter (T6)
   │
   ├── platform: PlatformAdapter contract widening (T3)
   │        │
   │        └── builder-ui: source state + shell wiring (T7)
   │                 │
   │                 ├── toolbox source header (T8) ── empty state/opt-in sample (T9)
   │                 ├── import dialog (T10) ── add field (T11) ── profiles (T12)
   │                 ├── table picker (T13) ── related tables (T14) ── cache+refresh (T15)
   │                 └── orphan detect (T16) ── remap/remove (T17) ── switch dialog (T18) ── drift (T19)
   │
   └── builder-ui: QueryDocument v2 + migration (T4)

Phase 7 importers (T20–T22) depend on T10; onboarding/a11y (T23) depends on T8–T13.
```

---

## Shared Type Contract (single source of truth)

These names are fixed across the plan. Implementers **import** them; they do **not** re-declare them.

| Type | Defined in (task) | Module |
|---|---|---|
| `FieldDefinition.source / .logicalName / .group / .orphaned`, `FieldSourceKind` | T1 | `packages/engine/src/types.ts` |
| `mapDataverseAttribute`, `DataverseAttributeMetadata`, `DataverseOptionLabel` | T2 | `packages/platform/src/dataverseMetadata.ts` |
| `DataSourceRef`, `TableRef`, `DiscoverFieldsOptions`, `DiscoverFieldsResult` | T3 | `packages/platform/src/PlatformAdapter.ts` |
| `DataSourceDescriptor`, `DataSourceKind` | T4 | `packages/builder-ui/src/composer/querySchema.ts` |
| `DataverseApi` (host typing) | T5 | `packages/platform/src/dataverseApi.d.ts` |
| `ActiveSource`, `sourceReducer` | T7 | `packages/builder-ui/src/app/sourceState.ts` |
| `resolveOrphans` | T16 | `packages/builder-ui/src/app/sourceState.ts` |

---

## Phase 1: Foundation (types & contract — no behavior change)

### Task 1: Extend `FieldDefinition` with optional provenance

**Description:** Add optional `source`, `logicalName`, and `group` to `FieldDefinition` so fields can
carry where they came from and a display section, without affecting existing documents.

**Acceptance criteria:**
- [ ] `FieldDefinition` gains optional `source?: 'dataverse' | 'user' | 'json' | 'csv' | 'jsonSchema' | 'sample'`, `logicalName?: string`, `group?: string`.
- [ ] Existing code compiles unchanged; all new fields optional.

**Verification:**
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes (existing engine tests unaffected)

**Dependencies:** None
**Files likely touched:** `packages/engine/src/types.ts`, `packages/engine/src/index.ts` (re-export unchanged)
**Estimated scope:** XS

**Code** — *edit* `packages/engine/src/types.ts`. Add a `FieldSourceKind` union and four optional
props. `orphaned?` is included here (used by T16/T19) so the type only changes once.

```diff
 export type ExpressionMode = 'triggerCondition' | 'filterArray';
 export type FieldType = 'string' | 'number' | 'boolean' | 'dateTime' | 'choice';
 export type ValueType = FieldType | 'null' | 'unknown';
 export type PredicateType = 'boolean';
 export type Conjunction = 'and' | 'or';
+
+/** Where a field's schema originated. Additive provenance — never affects expression semantics. */
+export type FieldSourceKind = 'dataverse' | 'user' | 'json' | 'csv' | 'jsonSchema' | 'sample';

 export interface FieldDefinition {
   id: string;
   label: string;
   type: FieldType;
   path: string[];
   choices?: string[];
   nullable?: boolean;
+  /** Provenance: which kind of source produced this field. */
+  source?: FieldSourceKind;
+  /** Source-native logical name (e.g. Dataverse attribute LogicalName) for round-trips/diagnostics. */
+  logicalName?: string;
+  /** Display section for grouped rendering (e.g. a related table's display name). */
+  group?: string;
+  /** Set when a field no longer exists in the active source but is retained for orphan handling (T16/T19). */
+  orphaned?: boolean;
 }
```

*edit* `packages/engine/src/index.ts` — export the new union alongside the existing type exports
(the `FieldDefinition` export itself is unchanged):

```diff
 export type {
   Conjunction,
   ExpressionNode,
   ExpressionMode,
   FieldDefinition,
+  FieldSourceKind,
   FieldReferenceNode,
   FieldType,
   FormatDiagnostic,
```

### Task 2: `AttributeType → FieldType` mapping module

**Description:** Pure function mapping a Dataverse `AttributeType`/`AttributeTypeName` (+ optional option-set
labels) to a `FieldDefinition`, per Rec §6.1. Lives in platform; no host calls.

**Acceptance criteria:**
- [ ] `mapDataverseAttribute(attr, optionLabels?)` returns `FieldDefinition` or `null` (for unsupported File/Image/EntityName).
- [ ] String/Memo→`string`; Integer/BigInt/Decimal/Double/Money→`number`; Boolean→`boolean`; DateTime→`dateTime`; Picklist/State/Status→`choice` (labels→`choices`); MultiSelectPicklist→`choice` with `nullable` note; Lookup/Customer/Owner/Uniqueidentifier→`string`.
- [ ] `nullable` derived from `RequiredLevel` (`SystemRequired`/`ApplicationRequired` → not nullable).

**Verification:**
- [ ] `npx vitest run packages/platform` — new unit tests cover each branch + unsupported→null
- [ ] `npm run typecheck` clean

**Dependencies:** T1
**Files likely touched:** `packages/platform/src/dataverseMetadata.ts` (new), `packages/platform/src/dataverseMetadata.test.ts` (new), `packages/platform/src/index.ts`
**Estimated scope:** S

**Code** — *new file* `packages/platform/src/dataverseMetadata.ts`:

```ts
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

/**
 * Minimal shape of a Dataverse attribute as returned by the PPTB
 * `dataverseAPI.getEntityRelatedMetadata(table, 'Attributes', ...)` call.
 * Only the properties the mapper reads are modeled.
 */
export interface DataverseAttributeMetadata {
  LogicalName: string;
  /** Legacy enum string, e.g. 'String' | 'Picklist' | 'Money' | 'Lookup'. */
  AttributeType?: string;
  /** v9 structured type name; preferred when present (e.g. 'MoneyType'). */
  AttributeTypeName?: { Value?: string } | null;
  DisplayName?: { UserLocalizedLabel?: { Label?: string } | null } | null;
  RequiredLevel?: { Value?: string } | null;
  /** Present for choice-like attributes after OptionSet expansion. */
  OptionSet?: { Options?: DataverseOptionLabel[] } | null;
  IsValidForRead?: boolean;
}

export interface DataverseOptionLabel {
  Value: number;
  Label?: { UserLocalizedLabel?: { Label?: string } | null } | null;
}

const STRING_TYPES = new Set(['String', 'Memo']);
const NUMBER_TYPES = new Set(['Integer', 'BigInt', 'Decimal', 'Double', 'Money']);
const STRING_LIKE_REF_TYPES = new Set([
  'Lookup',
  'Customer',
  'Owner',
  'Uniqueidentifier',
  'PartyList',
]);
const CHOICE_SINGLE_TYPES = new Set(['Picklist', 'State', 'Status']);
/** Types we deliberately drop — the engine has no representation for them. */
const UNSUPPORTED_TYPES = new Set(['File', 'Image', 'EntityName', 'Virtual', 'CalendarRules']);

function attrTypeOf(attr: DataverseAttributeMetadata): string | undefined {
  return attr.AttributeTypeName?.Value?.replace(/Type$/, '') ?? attr.AttributeType;
}

function labelOf(attr: DataverseAttributeMetadata): string {
  return attr.DisplayName?.UserLocalizedLabel?.Label?.trim() || attr.LogicalName;
}

function choicesOf(attr: DataverseAttributeMetadata): string[] | undefined {
  const options = attr.OptionSet?.Options;
  if (!options?.length) {
    return undefined;
  }
  return options.map(
    (option) => option.Label?.UserLocalizedLabel?.Label?.trim() || String(option.Value),
  );
}

function isRequired(attr: DataverseAttributeMetadata): boolean {
  const level = attr.RequiredLevel?.Value;
  return level === 'SystemRequired' || level === 'ApplicationRequired';
}

function fieldTypeFor(dvType: string | undefined): FieldType | null {
  if (!dvType) {
    return null;
  }
  if (STRING_TYPES.has(dvType) || STRING_LIKE_REF_TYPES.has(dvType)) {
    return 'string';
  }
  if (NUMBER_TYPES.has(dvType)) {
    return 'number';
  }
  if (dvType === 'Boolean') {
    return 'boolean';
  }
  if (dvType === 'DateTime') {
    return 'dateTime';
  }
  if (CHOICE_SINGLE_TYPES.has(dvType) || dvType === 'MultiSelectPicklist') {
    return 'choice';
  }
  return null;
}

/**
 * Map a single Dataverse attribute to a builder `FieldDefinition`.
 * Returns `null` for unsupported types (File/Image/EntityName/Virtual).
 *
 * @param attr Attribute metadata (OptionSet already expanded for choice types).
 * @param pathPrefix Optional navigation prefix for related/flattened fields (T14).
 */
export function mapDataverseAttribute(
  attr: DataverseAttributeMetadata,
  pathPrefix: string[] = [],
): FieldDefinition | null {
  const dvType = attrTypeOf(attr);
  if (!dvType || UNSUPPORTED_TYPES.has(dvType)) {
    return null;
  }

  const type = fieldTypeFor(dvType);
  if (type === null) {
    return null;
  }

  const path = [...pathPrefix, attr.LogicalName];
  const field: FieldDefinition = {
    id: path.join('.'),
    label: labelOf(attr),
    type,
    path,
    source: 'dataverse',
    logicalName: attr.LogicalName,
    nullable: !isRequired(attr),
  };

  if (type === 'choice') {
    const choices = choicesOf(attr);
    if (choices) {
      field.choices = choices;
    }
    // MultiSelectPicklist holds zero-or-more values; treat as nullable regardless of RequiredLevel.
    if (dvType === 'MultiSelectPicklist') {
      field.nullable = true;
    }
  }

  return field;
}

/** Map a list of attributes, dropping unsupported ones. */
export function mapDataverseAttributes(
  attrs: DataverseAttributeMetadata[],
  pathPrefix: string[] = [],
): FieldDefinition[] {
  return attrs
    .filter((attr) => attr.IsValidForRead !== false)
    .map((attr) => mapDataverseAttribute(attr, pathPrefix))
    .filter((field): field is FieldDefinition => field !== null);
}
```

*new file* `packages/platform/src/dataverseMetadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapDataverseAttribute, type DataverseAttributeMetadata } from './dataverseMetadata';

const base = (over: Partial<DataverseAttributeMetadata>): DataverseAttributeMetadata => ({
  LogicalName: 'name',
  AttributeType: 'String',
  DisplayName: { UserLocalizedLabel: { Label: 'Name' } },
  RequiredLevel: { Value: 'None' },
  ...over,
});

describe('mapDataverseAttribute', () => {
  it('maps String/Memo to string', () => {
    expect(mapDataverseAttribute(base({ AttributeType: 'String' }))?.type).toBe('string');
    expect(mapDataverseAttribute(base({ AttributeType: 'Memo' }))?.type).toBe('string');
  });

  it('maps numeric families to number', () => {
    for (const t of ['Integer', 'BigInt', 'Decimal', 'Double', 'Money']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))?.type).toBe('number');
    }
  });

  it('maps Boolean and DateTime', () => {
    expect(mapDataverseAttribute(base({ AttributeType: 'Boolean' }))?.type).toBe('boolean');
    expect(mapDataverseAttribute(base({ AttributeType: 'DateTime' }))?.type).toBe('dateTime');
  });

  it('maps Picklist/State/Status to choice with labels', () => {
    const field = mapDataverseAttribute(
      base({
        AttributeType: 'Picklist',
        OptionSet: {
          Options: [
            { Value: 1, Label: { UserLocalizedLabel: { Label: 'Open' } } },
            { Value: 2, Label: { UserLocalizedLabel: { Label: 'Closed' } } },
          ],
        },
      }),
    );
    expect(field?.type).toBe('choice');
    expect(field?.choices).toEqual(['Open', 'Closed']);
  });

  it('treats MultiSelectPicklist as nullable choice', () => {
    const field = mapDataverseAttribute(
      base({ AttributeType: 'MultiSelectPicklist', RequiredLevel: { Value: 'ApplicationRequired' } }),
    );
    expect(field?.type).toBe('choice');
    expect(field?.nullable).toBe(true);
  });

  it('maps Lookup/Customer/Owner/Uniqueidentifier to string', () => {
    for (const t of ['Lookup', 'Customer', 'Owner', 'Uniqueidentifier']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))?.type).toBe('string');
    }
  });

  it('derives nullable from RequiredLevel', () => {
    expect(mapDataverseAttribute(base({ RequiredLevel: { Value: 'None' } }))?.nullable).toBe(true);
    expect(mapDataverseAttribute(base({ RequiredLevel: { Value: 'SystemRequired' } }))?.nullable).toBe(false);
  });

  it('returns null for unsupported File/Image/EntityName', () => {
    for (const t of ['File', 'Image', 'EntityName']) {
      expect(mapDataverseAttribute(base({ AttributeType: t }))).toBeNull();
    }
  });

  it('prefers AttributeTypeName.Value when present', () => {
    const field = mapDataverseAttribute(
      base({ AttributeType: undefined, AttributeTypeName: { Value: 'MoneyType' } }),
    );
    expect(field?.type).toBe('number');
  });
});
```

*edit* `packages/platform/src/index.ts` — re-export the mapper and its types:

```diff
 export type {
   PptbToolboxApi,
 } from './pptbAdapter';
+
+export type {
+  DataverseAttributeMetadata,
+  DataverseOptionLabel,
+} from './dataverseMetadata';
+export { mapDataverseAttribute, mapDataverseAttributes } from './dataverseMetadata';
```

### Task 3: Widen the `PlatformAdapter` contract

**Description:** Add optional discovery methods and supporting types; keep `getDataverseFields` and
re-document the contract. No adapter behavior change yet beyond type surface.

**Acceptance criteria:**
- [ ] New exported types: `DataSourceRef`, `TableRef`, `DiscoverFieldsOptions`, `DiscoverFieldsResult` (Rec §5.3).
- [ ] `PlatformAdapter` gains optional `listDataSources?`, `getTables?`, `discoverFields?`; `getDataverseFields` annotated `@deprecated`.
- [ ] `docs/adapter-contract.md` updated to describe the new surface and the shim semantics.

**Verification:**
- [ ] `npm run typecheck` clean across all packages
- [ ] `npm run test` passes (no behavior change)

**Dependencies:** T1
**Files likely touched:** `packages/platform/src/PlatformAdapter.ts`, `packages/platform/src/index.ts`, `docs/adapter-contract.md`
**Estimated scope:** S

**Code** — *edit* `packages/platform/src/PlatformAdapter.ts`. Import `FieldDefinition`, add the four
discovery types, and widen the interface with optional methods:

```diff
+import type { FieldDefinition } from '@ryanmakes/eb_engine';
+
 export type PlatformTheme = 'light' | 'dark' | 'highContrast';
 export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

 export interface PlatformSettings {
   get(key: string): Promise<string | null>;
   set(key: string, value: string): Promise<void>;
   remove(key: string): Promise<void>;
 }
+
+/** A selectable data source the host can enumerate (e.g. a Dataverse connection). */
+export interface DataSourceRef {
+  id: string;
+  label: string;
+  kind: 'dataverse' | 'sharepoint' | 'sql';
+}
+
+/** A table/entity within a data source. */
+export interface TableRef {
+  /** Logical/internal name used for discovery calls. */
+  logicalName: string;
+  /** Human-readable display name. */
+  displayName: string;
+  /** OData entity set name when known (Dataverse). */
+  entitySetName?: string;
+  /** True for system/managed tables, hidden by default in pickers. */
+  isSystem?: boolean;
+}
+
+export interface DiscoverFieldsOptions {
+  /** Source id from `listDataSources`; omit for the host default. */
+  sourceId?: string;
+  /** Logical name of the table to discover; omit to use host's current table. */
+  table?: string;
+  /** When true, also surface one-hop related navigation properties (T14). */
+  includeRelated?: boolean;
+  /** Bypass any adapter-side cache. */
+  refresh?: boolean;
+}
+
+export interface DiscoverFieldsResult {
+  fields: FieldDefinition[];
+  /** Echo of the table the fields belong to, when applicable. */
+  table?: TableRef;
+  /** Epoch ms the metadata was produced/fetched. */
+  fetchedAt?: number;
+}

 export interface PlatformAdapter {
   copyToClipboard(text: string): Promise<void>;
   notify(message: string, level: NotificationLevel): Promise<void>;
   getTheme(): Promise<PlatformTheme>;
   onThemeChanged(handler: (theme: PlatformTheme) => void): () => void;
   settings: PlatformSettings;
-  getDataverseFields(): Promise<unknown[]>;
+
+  /** Enumerate selectable sources. Optional — absent hosts are import-only. */
+  listDataSources?(): Promise<DataSourceRef[]>;
+  /** List tables for a source. Optional — absent hosts hide the table picker. */
+  getTables?(sourceId?: string): Promise<TableRef[]>;
+  /** Source-agnostic field discovery. Optional — absent hosts degrade to import/manual. */
+  discoverFields?(options?: DiscoverFieldsOptions): Promise<DiscoverFieldsResult>;
+
+  /**
+   * @deprecated Use `discoverFields({})` instead. Retained as a shim:
+   * `getDataverseFields = async () => (await discoverFields({})).fields ?? []`.
+   */
+  getDataverseFields(): Promise<unknown[]>;
 }
```

*edit* `packages/platform/src/index.ts` — export the new contract types:

```diff
 export type {
   NotificationLevel,
   PlatformAdapter,
   PlatformSettings,
   PlatformTheme,
+  DataSourceRef,
+  TableRef,
+  DiscoverFieldsOptions,
+  DiscoverFieldsResult,
 } from './PlatformAdapter';
```

*edit* `docs/adapter-contract.md` — append after the interface block:

~~~md
## Discovery surface (added)

`PlatformAdapter` now carries three **optional** discovery methods plus four supporting types
(`DataSourceRef`, `TableRef`, `DiscoverFieldsOptions`, `DiscoverFieldsResult`):

- `listDataSources?()` — enumerate selectable sources; absent ⇒ import-only host.
- `getTables?(sourceId?)` — list tables; absent ⇒ table picker hidden.
- `discoverFields?(options?)` — source-agnostic field discovery returning mapped `FieldDefinition[]`.

`getDataverseFields()` is **deprecated** and reimplemented as a shim over `discoverFields({})`:

```ts
getDataverseFields: async () => (await adapter.discoverFields?.({}))?.fields ?? []
```

Optional methods mean the web adapter can implement none and the builder degrades to
import/manual/profile flows without throwing.
~~~

### Task 4: `QueryDocument` v2 + `DataSourceDescriptor` + migration

**Description:** Add optional `source?: DataSourceDescriptor` to `QueryDocument`, bump `version` to `1 | 2`,
and upgrade v1→v2 on load in `parseSavedExpression` (attach `source:{kind:'unknown'}`). Serialize v2.

**Acceptance criteria:**
- [ ] `DataSourceDescriptor` defined per Rec §5.2; `QueryDocument.source?` optional.
- [ ] `parseSavedExpression` accepts `version` 1 or 2; a v1 fixture loads and is upgraded to v2.
- [ ] `validateField` accepts (does not require) the new optional `FieldDefinition` props.
- [ ] Round-trip: serialize→parse of a v2 doc is stable.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — new tests for v1 fixture upgrade + v2 round-trip
- [ ] `npm run typecheck` clean

**Dependencies:** T1
**Files likely touched:** `packages/builder-ui/src/composer/querySchema.ts`, `packages/builder-ui/src/importExport/savedExpressionSchema.ts`, `*.test.ts` (new)
**Estimated scope:** M

**Code** — *edit* `packages/builder-ui/src/composer/querySchema.ts`. Define the descriptor and bump
the version union:

```diff
 import type { Conjunction, ExpressionMode, FieldDefinition } from '@ryanmakes/eb_engine';

+export type DataSourceKind =
+  | 'dataverse'
+  | 'import'
+  | 'profile'
+  | 'sample'
+  | 'unknown';
+
+/** Describes where the document's active fields came from. Additive, optional. */
+export interface DataSourceDescriptor {
+  kind: DataSourceKind;
+  /** Human-readable name shown in the source chip. */
+  label?: string;
+  /** Dataverse table logical name when kind === 'dataverse'. */
+  tableLogicalName?: string;
+  /** Whether related (one-hop) fields are included. */
+  includeRelated?: boolean;
+  /** Epoch ms of last discovery/import for cache + drift. */
+  fetchedAt?: number;
+}
+
 export interface QueryDocument {
-  version: 1;
+  version: 1 | 2;
   mode: ExpressionMode;
   fields: FieldDefinition[];
   root: QueryGroup;
   selectedRuleId?: string;
+  /** Provenance for the active field set (v2+). */
+  source?: DataSourceDescriptor;
 }
```

*edit* `packages/builder-ui/src/importExport/savedExpressionSchema.ts`. Accept v1 **or** v2, upgrade
v1 on load, and accept (not require) the new optional field props. Replace the version check:

```diff
-  if (value.version !== 1) {
-    errors.push('Import failed: version must be 1.');
-  }
+  if (value.version !== 1 && value.version !== 2) {
+    errors.push('Import failed: version must be 1 or 2.');
+  }
```

Replace the final return and add the upcaster:

```diff
   if (errors.length > 0) {
     return { ok: false, errors };
   }

-  return { ok: true, document: value as unknown as QueryDocument };
+  return { ok: true, document: upgradeDocument(value as unknown as QueryDocument) };
 }
+
+/** v1 → v2 upcaster. Idempotent: a v2 doc with a source is returned unchanged. */
+export function upgradeDocument(document: QueryDocument): QueryDocument {
+  if (document.version === 2 && document.source) {
+    return document;
+  }
+  return {
+    ...document,
+    version: 2,
+    source: document.source ?? { kind: 'unknown' },
+  };
+}
```

Extend `validateField` to tolerate the optional provenance props (insert before its `return true`):

```diff
   if ('choices' in value && value.choices !== undefined) {
     if (!Array.isArray(value.choices) || value.choices.some((choice) => typeof choice !== 'string')) {
       errors.push(`Import failed: ${path}.choices must be strings.`);
     }
   }

+  if ('source' in value && value.source !== undefined && typeof value.source !== 'string') {
+    errors.push(`Import failed: ${path}.source must be a string.`);
+  }
+  if ('logicalName' in value && value.logicalName !== undefined && typeof value.logicalName !== 'string') {
+    errors.push(`Import failed: ${path}.logicalName must be a string.`);
+  }
+  if ('group' in value && value.group !== undefined && typeof value.group !== 'string') {
+    errors.push(`Import failed: ${path}.group must be a string.`);
+  }
+
   return true;
 }
```

*edit* `packages/builder-ui/src/index.ts` — re-export the descriptor types:

```diff
 export type {
   QueryDocument,
+  DataSourceDescriptor,
+  DataSourceKind,
   QueryGroup,
   QueryNode,
   QueryRule,
   RulePatch,
 } from './composer/querySchema';
```

*new file* `packages/builder-ui/src/importExport/savedExpressionSchema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSavedExpression, serializeSavedExpression, upgradeDocument } from './savedExpressionSchema';
import type { QueryDocument } from '../composer/querySchema';

const v1Fixture = JSON.stringify({
  version: 1,
  mode: 'triggerCondition',
  fields: [{ id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['A', 'B'] }],
  root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
});

describe('saved expression v1→v2 migration', () => {
  it('loads a v1 document and upgrades it to v2', () => {
    const result = parseSavedExpression(v1Fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.version).toBe(2);
      expect(result.document.source).toEqual({ kind: 'unknown' });
    }
  });

  it('round-trips a v2 document unchanged', () => {
    const doc: QueryDocument = {
      version: 2,
      mode: 'filterArray',
      fields: [{ id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'], source: 'user' }],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
      source: { kind: 'import', label: 'Pasted JSON' },
    };
    const reparsed = parseSavedExpression(serializeSavedExpression(doc));
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.document).toEqual(doc);
    }
  });

  it('upgradeDocument is idempotent', () => {
    const doc = upgradeDocument({
      version: 1,
      mode: 'triggerCondition',
      fields: [],
      root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
    });
    expect(upgradeDocument(doc)).toEqual(doc);
  });

  it('rejects version 3', () => {
    const result = parseSavedExpression(v1Fixture.replace('"version": 1', '"version": 3'));
    expect(result.ok).toBe(false);
  });
});
```

### Checkpoint: Foundation (after T1–T4)
- [ ] `npm run build` clean; `npm run test`, `npm run typecheck`, `npm run lint` all pass
- [ ] Existing app behavior unchanged (sample fields still load) — pure type/contract groundwork
- [ ] Review with human before wiring behavior

---

## Phase 2: Adapters

### Task 5: PPTB adapter — implement `getTables` / `discoverFields`

**Description:** Bridge the host `dataverseAPI` (separate from `toolboxAPI`) to the new contract:
`getTables` via `getAllEntitiesMetadata`; `discoverFields` via `getEntityRelatedMetadata(table,'Attributes',…)`
plus per-choice `Attributes(LogicalName='x')/OptionSet`, mapped through T2. Degrade to the existing empty-list +
notification when `dataverseAPI` or its methods are absent (feature-detect host version ≥ v1.0.17).

**Acceptance criteria:**
- [ ] `createPptbAdapter` accepts/locates `window.dataverseAPI`; `getTables()` returns mapped `TableRef[]` (DisplayName, LogicalName, isSystem).
- [ ] `discoverFields({table, includeRelated})` returns mapped `FieldDefinition[]` with `source:'dataverse'` and choice labels populated.
- [ ] When the API is missing, methods resolve to empty results and the existing *"Using sample fields…"* notification still fires; no throw.
- [ ] `getDataverseFields()` re-implemented as a shim over `discoverFields({})`.

**Verification:**
- [ ] `npx vitest run packages/platform` — tests with a mocked `dataverseAPI` (happy path, missing API, choice expansion)
- [ ] `npm run typecheck` clean
- [ ] Manual: `npm run dev:pptb` with a stubbed `window.dataverseAPI` returns fields

**Dependencies:** T2, T3
**Files likely touched:** `packages/platform/src/pptbAdapter.ts`, `packages/platform/src/dataverseApi.d.ts` (new typings), `apps/pptb/src/toolboxApi.d.ts`, `*.test.ts`
**Estimated scope:** M

**Code** — *new file* `packages/platform/src/dataverseApi.d.ts` (host typings; the builder never sends
auth — the host owns tokens/headers):

```ts
import type { DataverseAttributeMetadata } from './dataverseMetadata';

/** Minimal entity metadata as returned by getAllEntitiesMetadata / getEntityMetadata. */
export interface DataverseEntityMetadata {
  LogicalName: string;
  EntitySetName?: string;
  DisplayName?: { UserLocalizedLabel?: { Label?: string } | null } | null;
  IsManaged?: boolean;
  IsCustomEntity?: boolean;
  /** Present after a getEntityRelatedMetadata(..,'Attributes') expansion. */
  Attributes?: DataverseAttributeMetadata[];
}

export interface DataverseRelationshipMetadata {
  SchemaName: string;
  ReferencingEntity?: string;
  ReferencedEntity?: string;
  ReferencingEntityNavigationPropertyName?: string;
  ReferencedEntityNavigationPropertyName?: string;
  RelationshipType?: 'OneToManyRelationship' | 'ManyToManyRelationship';
}

export interface DataverseExecuteRequest {
  operationName: string;
  operationType: 'function' | 'action';
  parameters?: Record<string, unknown>;
}

/**
 * PPTB host bridge for Dataverse metadata. All methods are v1.0.17+ convenience
 * helpers except `getCSDLDocument` (v1.0.20). Auth/headers are the host's concern.
 */
export interface DataverseApi {
  getAllEntitiesMetadata?: () => Promise<DataverseEntityMetadata[]>;
  getEntityMetadata?: (logicalName: string) => Promise<DataverseEntityMetadata>;
  getEntityRelatedMetadata?: (
    logicalName: string,
    relatedPath: string,
    query?: string,
  ) => Promise<unknown>;
  getAttributeODataType?: (logicalName: string, attribute: string) => Promise<string>;
  getCSDLDocument?: () => Promise<string>;
  execute?: (request: DataverseExecuteRequest) => Promise<unknown>;
}

declare global {
  interface Window {
    dataverseAPI?: DataverseApi;
  }
}
```

*edit* `packages/platform/src/pptbAdapter.ts`. Add imports, a `dataverseAPI` locator parameter, and the
three discovery methods; rewrite `getDataverseFields` as a shim. Changes:

```diff
 import type {
   NotificationLevel,
   PlatformAdapter,
   PlatformTheme,
+  TableRef,
+  DiscoverFieldsOptions,
+  DiscoverFieldsResult,
 } from './PlatformAdapter';
+import type {
+  DataverseApi,
+  DataverseEntityMetadata,
+} from './dataverseApi';
+import { mapDataverseAttributes, type DataverseAttributeMetadata } from './dataverseMetadata';
```

Add a window locator next to `getWindowToolboxApi`:

```diff
 function getWindowToolboxApi(): PptbToolboxApi | undefined {
   if (typeof window === 'undefined') {
     return undefined;
   }

   return (window as PptbWindow).toolboxAPI;
 }
+
+function getWindowDataverseApi(): DataverseApi | undefined {
+  if (typeof window === 'undefined') {
+    return undefined;
+  }
+  return (window as Window & { dataverseAPI?: DataverseApi }).dataverseAPI;
+}
+
+function entityToTableRef(entity: DataverseEntityMetadata): TableRef {
+  return {
+    logicalName: entity.LogicalName,
+    displayName: entity.DisplayName?.UserLocalizedLabel?.Label?.trim() || entity.LogicalName,
+    entitySetName: entity.EntitySetName,
+    isSystem: entity.IsCustomEntity === false || entity.IsManaged === true,
+  };
+}
```

Change the factory signature to also accept the dataverse bridge, and add the methods inside the
returned `adapter` object (before `getDataverseFields`):

```diff
 export function createPptbAdapter(
   toolboxApi: PptbToolboxApi | undefined = getWindowToolboxApi(),
+  dataverseApi: DataverseApi | undefined = getWindowDataverseApi(),
 ): PlatformAdapter {
   const api = toolboxApi;
+  const dv = dataverseApi;
```

```diff
+    async getTables() {
+      if (!dv?.getAllEntitiesMetadata) {
+        return [];
+      }
+      const entities = await dv.getAllEntitiesMetadata();
+      return Array.isArray(entities) ? entities.map(entityToTableRef) : [];
+    },
+
+    async discoverFields(options: DiscoverFieldsOptions = {}): Promise<DiscoverFieldsResult> {
+      const table = options.table;
+      if (!dv?.getEntityRelatedMetadata || !table) {
+        // No host bridge (or no table) — preserve legacy notification behavior.
+        await adapter.notify(
+          'Using sample fields because no Dataverse connection is available.',
+          'info',
+        );
+        return { fields: [] };
+      }
+
+      // Attributes (+ OptionSet expansion for choice labels in one query when the host supports $expand).
+      const raw = (await dv.getEntityRelatedMetadata(
+        table,
+        'Attributes',
+        '$expand=OptionSet',
+      )) as { value?: DataverseAttributeMetadata[] } | DataverseAttributeMetadata[] | undefined;
+
+      const attrs = Array.isArray(raw) ? raw : (raw?.value ?? []);
+      const fields = mapDataverseAttributes(attrs);
+
+      return {
+        fields,
+        table: { logicalName: table, displayName: table },
+        fetchedAt: Date.now(),
+      };
+    },
+
```

Rewrite `getDataverseFields` as a shim:

```diff
-    async getDataverseFields() {
-      const fields = api?.getDataverseFields
-        ? await api.getDataverseFields()
-        : await api?.listDataverseFields?.();
-
-      if (Array.isArray(fields)) {
-        return fields;
-      }
-
-      await adapter.notify(
-        'Using sample fields because no Dataverse connection is available.',
-        'info',
-      );
-
-      return [];
-    },
+    /** @deprecated shim over discoverFields — prefers the new bridge, falls back to legacy toolboxAPI. */
+    async getDataverseFields() {
+      if (dv?.getEntityRelatedMetadata) {
+        const result = await adapter.discoverFields?.({});
+        return result?.fields ?? [];
+      }
+
+      const legacy = api?.getDataverseFields
+        ? await api.getDataverseFields()
+        : await api?.listDataverseFields?.();
+
+      if (Array.isArray(legacy)) {
+        return legacy;
+      }
+
+      await adapter.notify(
+        'Using sample fields because no Dataverse connection is available.',
+        'info',
+      );
+      return [];
+    },
```

> Note: `discoverFields({})` with no `table` intentionally returns `{ fields: [] }` and fires the
> legacy notification, so the shim degrades exactly as the old `getDataverseFields` did.

*edit* `apps/pptb/src/toolboxApi.d.ts` — make the host typings visible to the app:

```diff
 import type { PptbToolboxApi } from '@ryanmakes/eb_platformadapter';

 declare global {
   interface Window {
     toolboxAPI?: PptbToolboxApi;
   }
 }

 export {};
```
↳ no change needed beyond ensuring `@ryanmakes/eb_platformadapter` re-exports `DataverseApi`. Add to
`packages/platform/src/index.ts`:

```diff
+export type {
+  DataverseApi,
+  DataverseEntityMetadata,
+  DataverseRelationshipMetadata,
+  DataverseExecuteRequest,
+} from './dataverseApi';
```

*new file* `packages/platform/test/dataverseDiscovery.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPptbAdapter } from '../src/pptbAdapter';
import type { DataverseApi } from '../src/dataverseApi';

const entities = [
  { LogicalName: 'account', DisplayName: { UserLocalizedLabel: { Label: 'Account' } }, IsCustomEntity: false },
  { LogicalName: 'new_widget', DisplayName: { UserLocalizedLabel: { Label: 'Widget' } }, IsCustomEntity: true },
];

const attributes = [
  { LogicalName: 'name', AttributeType: 'String', DisplayName: { UserLocalizedLabel: { Label: 'Name' } } },
  {
    LogicalName: 'statuscode',
    AttributeType: 'Status',
    DisplayName: { UserLocalizedLabel: { Label: 'Status' } },
    OptionSet: { Options: [{ Value: 1, Label: { UserLocalizedLabel: { Label: 'Active' } } }] },
  },
];

function mockDv(over: Partial<DataverseApi> = {}): DataverseApi {
  return {
    getAllEntitiesMetadata: vi.fn().mockResolvedValue(entities),
    getEntityRelatedMetadata: vi.fn().mockResolvedValue({ value: attributes }),
    ...over,
  };
}

describe('PPTB adapter discovery', () => {
  it('getTables maps entities to TableRef with isSystem', async () => {
    const adapter = createPptbAdapter(undefined, mockDv());
    const tables = await adapter.getTables?.();
    expect(tables?.map((t) => t.displayName)).toEqual(['Account', 'Widget']);
    expect(tables?.[0].isSystem).toBe(true);
    expect(tables?.[1].isSystem).toBe(false);
  });

  it('discoverFields maps attributes incl. choice labels', async () => {
    const adapter = createPptbAdapter(undefined, mockDv());
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields.map((f) => f.type)).toEqual(['string', 'choice']);
    expect(result?.fields[1].choices).toEqual(['Active']);
    expect(result?.fields[0].source).toBe('dataverse');
  });

  it('degrades to empty + notify when bridge missing', async () => {
    const notify = vi.fn().mockResolvedValue(undefined);
    const adapter = createPptbAdapter({ notify } as never, undefined);
    const result = await adapter.discoverFields?.({ table: 'account' });
    expect(result?.fields).toEqual([]);
    expect(notify).toHaveBeenCalled();
  });
});
```

### Task 6: Web adapter — discovery no-ops cleanly

**Description:** Implement the optional methods on the web adapter as empty/import-driven: `listDataSources()`
returns `[]`, `getTables()` returns `[]`, `discoverFields()` returns `{ fields: [] }`. Keeps the web host
fully usable through import/manual flows.

**Acceptance criteria:**
- [ ] Web adapter compiles against the widened contract; methods return empty results (no throw).
- [ ] `getDataverseFields()` still returns `[]` (unchanged).

**Verification:**
- [ ] `npx vitest run packages/platform`
- [ ] `npm run typecheck` clean

**Dependencies:** T3
**Files likely touched:** `packages/platform/src/webAdapter.ts`, `*.test.ts`
**Estimated scope:** XS

**Code** — *edit* `packages/platform/src/webAdapter.ts`. Add the three optional methods just before the
existing `getDataverseFields`:

```diff
+    async listDataSources() {
+      return [];
+    },
+
+    async getTables() {
+      return [];
+    },
+
+    async discoverFields() {
+      return { fields: [] };
+    },
+
     async getDataverseFields() {
       return [];
     },
```

*edit* `packages/platform/test/webAdapter.test.ts` — add a case (append within the existing describe):

```ts
  it('exposes empty discovery results without throwing', async () => {
    const adapter = createWebAdapter();
    expect(await adapter.listDataSources?.()).toEqual([]);
    expect(await adapter.getTables?.()).toEqual([]);
    expect(await adapter.discoverFields?.()).toEqual({ fields: [] });
  });
```

### Checkpoint: Adapters (after T5–T6)
- [ ] Both adapters satisfy the widened contract; `npm run build`/`test`/`typecheck` pass
- [ ] PPTB returns real mapped fields against a mocked `dataverseAPI`

---

## Phase 3: Source state + honest empty state (core UI)

### Task 7: Source state model + shell wiring

**Description:** Introduce an active-source concept in the shell: track `DataSourceDescriptor` and the
current `fields`; replace `connectFields()` to call `discoverFields` when available, fall back to
`getDataverseFields`, and route web hosts to import/add. Stop silently injecting samples.

**Acceptance criteria:**
- [ ] Shell holds `activeSource` and updates `document.fields` + `document.source` on discovery.
- [ ] `connectFields` uses `adapter.discoverFields ?? getDataverseFields`; no silent sample fallback.
- [ ] Existing rule editing still works with whatever fields are active (`findField` unchanged).

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — shell/source-state tests with a mock adapter
- [ ] `npm run typecheck` clean
- [ ] Manual: `npm run dev:web` loads with empty source (no phantom sample fields)

**Dependencies:** T4, T5, T6
**Files likely touched:** `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`, `packages/builder-ui/src/app/sourceState.ts` (new), `*.test.ts`
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/app/sourceState.ts`. Pure, framework-free helpers the
shell, dialogs (T13/T18), and orphan logic (T16) all share:

```ts
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type {
  DiscoverFieldsResult,
  PlatformAdapter,
} from '@ryanmakes/eb_platformadapter';
import type {
  DataSourceDescriptor,
  QueryDocument,
  QueryGroup,
  QueryNode,
} from '../composer/querySchema';

/** The runtime view of the active source: the descriptor plus its resolved fields. */
export interface ActiveSource {
  descriptor: DataSourceDescriptor;
  fields: FieldDefinition[];
}

const EMPTY_SOURCE: ActiveSource = {
  descriptor: { kind: 'unknown' },
  fields: [],
};

export function emptySource(): ActiveSource {
  return EMPTY_SOURCE;
}

/** Apply a discovered/imported field set to a document, recording provenance. */
export function applySource(
  document: QueryDocument,
  descriptor: DataSourceDescriptor,
  fields: FieldDefinition[],
): QueryDocument {
  return {
    ...document,
    version: 2,
    fields,
    source: { ...descriptor, fetchedAt: descriptor.fetchedAt ?? Date.now() },
  };
}

/**
 * Discover fields through the adapter, preferring the new contract and falling back to the
 * deprecated `getDataverseFields`. Never injects samples; returns an empty set on miss.
 */
export async function discoverThroughAdapter(
  adapter: PlatformAdapter,
  table?: string,
  includeRelated?: boolean,
): Promise<DiscoverFieldsResult> {
  if (adapter.discoverFields) {
    return adapter.discoverFields({ table, includeRelated });
  }

  const legacy = await adapter.getDataverseFields();
  const fields = Array.isArray(legacy) ? (legacy as FieldDefinition[]) : [];
  return { fields };
}

/** Collect every fieldId referenced by rules in the tree. */
export function referencedFieldIds(node: QueryNode, into = new Set<string>()): Set<string> {
  if (node.kind === 'rule') {
    if (node.fieldId) {
      into.add(node.fieldId);
    }
    return into;
  }
  for (const child of node.children) {
    referencedFieldIds(child, into);
  }
  return into;
}

/**
 * Compute orphaned field ids: those referenced by rules but absent from `fields`.
 * Shared by T16 (rendering) and T18 (switch diff).
 */
export function resolveOrphans(root: QueryGroup, fields: FieldDefinition[]): Set<string> {
  const known = new Set(fields.map((field) => field.id));
  const orphans = new Set<string>();
  for (const id of referencedFieldIds(root)) {
    if (!known.has(id)) {
      orphans.add(id);
    }
  }
  return orphans;
}
```

*edit* `packages/builder-ui/src/app/ExpressionBuilderShell.tsx`. Replace the silent-sample
`connectFields` and pass a `source` descriptor down. Key changes:

```diff
-import { deriveBuilderState, findFirstRule, findRule } from './builderState';
+import { deriveBuilderState, findFirstRule, findRule } from './builderState';
+import { applySource, discoverThroughAdapter } from './sourceState';
```

```diff
-  const connectFields = async () => {
-    const fields = await adapter.getDataverseFields();
-    if (!isFieldDefinitionArray(fields) || fields.length === 0) {
-      await adapter.notify('Using sample fields because no Dataverse connection is available.', 'info');
-      return;
-    }
-
-    setDocument((current) => ({ ...current, fields }));
-  };
+  const connectFields = async (table?: string, includeRelated?: boolean) => {
+    const result = await discoverThroughAdapter(adapter, table, includeRelated);
+    if (!isFieldDefinitionArray(result.fields) || result.fields.length === 0) {
+      // Honest empty state — no silent sample injection (T9 owns the get-started UI).
+      await adapter.notify('No fields discovered. Import a schema or add fields manually.', 'info');
+      return;
+    }
+    setDocument((current) =>
+      applySource(
+        current,
+        {
+          kind: 'dataverse',
+          label: result.table?.displayName ?? 'Dataverse',
+          tableLogicalName: result.table?.logicalName ?? table,
+          includeRelated,
+        },
+        result.fields,
+      ),
+    );
+  };
+
+  const loadSampleFields = () => {
+    setDocument((current) => applySource(current, { kind: 'sample', label: 'Sample fields' }, sampleFields));
+  };
```

Add the `sampleFields` import (used by T9 too):

```diff
-import { emptyStarterDocument } from './sampleData';
+import { emptyStarterDocument, sampleFields } from './sampleData';
```

Pass the source + handlers to the toolbox (the prop wiring is finalized in T8):

```diff
           <FieldToolboxPane
             fields={document.fields}
+            source={document.source ?? { kind: 'unknown' }}
             activeTab={workbench.leftTab}
             collapsed={workbench.leftDockCollapsed}
             onTabChange={(leftTab) => setWorkbench((current) => ({ ...current, leftTab }))}
             onToggleCollapsed={() => setWorkbench((current) => toggleDock(current, 'left'))}
-            onConnect={() => void connectFields()}
+            onConnect={() => void connectFields()}
+            onLoadSamples={loadSampleFields}
           />
```

> The full `FieldToolboxPaneProps` (replacing `onConnect` with the source-chip handler set) lands in
> T8; T7 keeps `onConnect` so the app compiles between tasks.

*new file* `packages/builder-ui/test/sourceState.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { applySource, discoverThroughAdapter, resolveOrphans } from '../src/app/sourceState';
import type { QueryDocument, QueryGroup } from '../src/composer/querySchema';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';

const root: QueryGroup = {
  id: 'root',
  kind: 'group',
  conjunction: 'and',
  children: [{ id: 'r1', kind: 'rule', fieldId: 'Amount', operator: 'greater', value: 1 }],
};

const doc: QueryDocument = { version: 2, mode: 'triggerCondition', fields: [], root };

describe('sourceState', () => {
  it('applySource records provenance + fetchedAt', () => {
    const next = applySource(doc, { kind: 'import', label: 'JSON' }, [
      { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
    ]);
    expect(next.source?.kind).toBe('import');
    expect(typeof next.source?.fetchedAt).toBe('number');
    expect(next.fields).toHaveLength(1);
  });

  it('discoverThroughAdapter prefers discoverFields', async () => {
    const adapter = {
      discoverFields: vi.fn().mockResolvedValue({ fields: [{ id: 'x' }] }),
      getDataverseFields: vi.fn(),
    } as unknown as PlatformAdapter;
    const result = await discoverThroughAdapter(adapter, 'account');
    expect(result.fields).toHaveLength(1);
    expect(adapter.getDataverseFields).not.toHaveBeenCalled();
  });

  it('resolveOrphans flags referenced-but-missing fields', () => {
    expect([...resolveOrphans(root, [])]).toEqual(['Amount']);
    expect([...resolveOrphans(root, [{ id: 'Amount', label: 'A', type: 'number', path: ['Amount'] }])]).toEqual([]);
  });
});
```

### Task 8: Toolbox source header / chip + connection state

**Description:** Replace the `FieldToolboxPane` *Connect* button with a source chip showing name + connection
dot + a `▾` menu (Switch table / Import / Add field / Load samples / Manage profiles / Refresh) and a refresh
affordance (Dataverse only). Build on Fluent v9 menu primitives. (Wireframe B)

**Acceptance criteria:**
- [ ] `FieldToolboxPaneProps` updated: replace `onConnect` with `source` + handlers (`onSwitchTable`, `onImport`, `onAddField`, `onLoadSamples`, `onRefresh`, `onManageProfiles`).
- [ ] Header renders source name, connection state (green/grey/amber), and a working Fluent `Menu`.
- [ ] Refresh shown only when source kind is `dataverse`.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — render test asserts chip + menu items + conditional refresh
- [ ] `npm run lint` clean
- [ ] Manual: menu opens, items dispatch handlers

**Dependencies:** T7
**Files likely touched:** `packages/builder-ui/src/workbench/FieldToolboxPane.tsx`, `packages/builder-ui/src/workbench/types.ts`, `packages/builder-ui/src/workbench/SourceChip.tsx` (new)
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/workbench/SourceChip.tsx`. Fluent v9 `Menu` +
`makeStyles`/`tokens` per the fluent2 design system (no hardcoded colors, longhand properties only):

```tsx
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
  Text,
  makeStyles,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ArrowSyncRegular,
  DatabaseRegular,
  ArrowImportRegular,
  AddRegular,
  BeakerRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import type { DataSourceDescriptor } from '../composer/querySchema';

export interface SourceChipProps {
  source: DataSourceDescriptor;
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
  onManageProfiles: () => void;
  onRefresh: () => void;
}

type ConnectionState = 'connected' | 'none' | 'stale';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  connected: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  none: { backgroundColor: tokens.colorNeutralForeground4 },
  stale: { backgroundColor: tokens.colorPaletteYellowBackground3 },
  name: { flexGrow: 1, minWidth: 0 },
});

function connectionStateOf(source: DataSourceDescriptor): ConnectionState {
  if (source.kind === 'unknown') return 'none';
  if (source.kind === 'sample') return 'stale';
  return 'connected';
}

function labelOf(source: DataSourceDescriptor): string {
  if (source.label) return source.label;
  return source.kind === 'unknown' ? 'No source' : source.kind;
}

export function SourceChip({
  source,
  onSwitchTable,
  onImport,
  onAddField,
  onLoadSamples,
  onManageProfiles,
  onRefresh,
}: SourceChipProps) {
  const styles = useStyles();
  const state = connectionStateOf(source);
  const isDataverse = source.kind === 'dataverse';

  return (
    <div className={styles.root}>
      <span
        className={mergeClasses(styles.dot, styles[state])}
        role="img"
        aria-label={`Connection: ${state}`}
      />
      <Text className={styles.name} weight="semibold" truncate wrap={false}>
        {labelOf(source)}
      </Text>

      {isDataverse ? (
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowSyncRegular />}
          aria-label="Refresh fields"
          title="Refresh fields"
          onClick={onRefresh}
        />
      ) : null}

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronDownRegular />}
            aria-label="Data source menu"
          />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem icon={<DatabaseRegular />} onClick={onSwitchTable}>
              Switch table…
            </MenuItem>
            <MenuItem icon={<ArrowImportRegular />} onClick={onImport}>
              Import schema…
            </MenuItem>
            <MenuItem icon={<AddRegular />} onClick={onAddField}>
              Add field…
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<SaveRegular />} onClick={onManageProfiles}>
              Manage profiles…
            </MenuItem>
            <MenuItem icon={<BeakerRegular />} onClick={onLoadSamples}>
              Load sample fields
            </MenuItem>
            {isDataverse ? (
              <>
                <MenuDivider />
                <MenuItem icon={<ArrowSyncRegular />} onClick={onRefresh}>
                  Refresh
                </MenuItem>
              </>
            ) : null}
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  );
}
```

*edit* `packages/builder-ui/src/workbench/types.ts` — replace `onConnect` on `FieldToolboxPaneProps`
with the source + handler set:

```diff
+import type { DataSourceDescriptor } from '../composer/querySchema';
+
 export interface FieldToolboxPaneProps {
   fields: FieldDefinition[];
+  source: DataSourceDescriptor;
   activeTab: LeftWorkbenchTab;
   collapsed: boolean;
   onTabChange: (tab: LeftWorkbenchTab) => void;
   onToggleCollapsed: () => void;
-  onConnect: () => void;
+  onSwitchTable: () => void;
+  onImport: () => void;
+  onAddField: () => void;
+  onLoadSamples: () => void;
+  onManageProfiles: () => void;
+  onRefresh: () => void;
 }
```

*edit* `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` — swap the old connect button for the
chip. Destructure the new props and replace the `eb-toolbox-actions` block:

```diff
 export function FieldToolboxPane({
   activeTab,
   collapsed,
   fields,
-  onConnect,
+  source,
+  onSwitchTable,
+  onImport,
+  onAddField,
+  onLoadSamples,
+  onManageProfiles,
+  onRefresh,
   onTabChange,
   onToggleCollapsed,
 }: FieldToolboxPaneProps) {
```

```diff
-          <div className="eb-toolbox-actions">
-            <button type="button" className="eb-text-btn" onClick={onConnect}>
-              Connect
-            </button>
-            <span className="eb-muted">No Dataverse connection</span>
-          </div>
+          <SourceChip
+            source={source}
+            onSwitchTable={onSwitchTable}
+            onImport={onImport}
+            onAddField={onAddField}
+            onLoadSamples={onLoadSamples}
+            onManageProfiles={onManageProfiles}
+            onRefresh={onRefresh}
+          />
```

Add the import:

```diff
 import { WrapperChips } from './WrapperChips';
+import { SourceChip } from './SourceChip';
```

*edit* `ExpressionBuilderShell.tsx` — finalize the toolbox wiring now that the props exist (the dialog
open handlers are stubbed here and filled in by T10–T13/T18; until then point them at the existing
flows):

```diff
           <FieldToolboxPane
             fields={document.fields}
             source={document.source ?? { kind: 'unknown' }}
             activeTab={workbench.leftTab}
             collapsed={workbench.leftDockCollapsed}
             onTabChange={(leftTab) => setWorkbench((current) => ({ ...current, leftTab }))}
             onToggleCollapsed={() => setWorkbench((current) => toggleDock(current, 'left'))}
-            onConnect={() => void connectFields()}
-            onLoadSamples={loadSampleFields}
+            onSwitchTable={() => setDialog('tablePicker')}
+            onImport={() => setDialog('import')}
+            onAddField={() => setDialog('addField')}
+            onLoadSamples={loadSampleFields}
+            onManageProfiles={() => setDialog('profiles')}
+            onRefresh={() => void connectFields(document.source?.tableLogicalName, document.source?.includeRelated)}
           />
```

Add a single dialog-routing state near the other `useState` hooks (consumed by Phase 4/5 dialogs):

```diff
+  type OpenDialog = 'none' | 'tablePicker' | 'import' | 'addField' | 'profiles' | 'remap' | 'switch' | 'drift';
+  const [dialog, setDialog] = useState<OpenDialog>('none');
```

*new file* `packages/builder-ui/test/sourceChip.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SourceChip } from '../src/workbench/SourceChip';

const handlers = {
  onSwitchTable: vi.fn(),
  onImport: vi.fn(),
  onAddField: vi.fn(),
  onLoadSamples: vi.fn(),
  onManageProfiles: vi.fn(),
  onRefresh: vi.fn(),
};

function renderChip(kind: 'dataverse' | 'unknown') {
  return render(
    <FluentProvider theme={webLightTheme}>
      <SourceChip source={{ kind, label: kind === 'dataverse' ? 'Account' : undefined }} {...handlers} />
    </FluentProvider>,
  );
}

describe('SourceChip', () => {
  it('shows refresh only for dataverse', () => {
    const { rerender } = renderChip('unknown');
    expect(screen.queryByRole('button', { name: 'Refresh fields' })).toBeNull();
    rerender(
      <FluentProvider theme={webLightTheme}>
        <SourceChip source={{ kind: 'dataverse', label: 'Account' }} {...handlers} />
      </FluentProvider>,
    );
    expect(screen.getByRole('button', { name: 'Refresh fields' })).toBeTruthy();
  });

  it('dispatches menu actions', async () => {
    renderChip('dataverse');
    await userEvent.click(screen.getByRole('button', { name: 'Data source menu' }));
    await userEvent.click(screen.getByText('Import schema…'));
    expect(handlers.onImport).toHaveBeenCalled();
  });
});
```

### Task 9: Honest empty state + opt-in samples

**Description:** When no source is active, show the get-started panel (Connect / Import / Add / Load samples)
instead of silent samples; make "Load sample fields" an explicit action that labels the source as "Sample fields".
(Rec §3.4, Wireframe A.0)

**Acceptance criteria:**
- [ ] Empty toolbox shows the get-started actions; list is empty until a source is chosen.
- [ ] "Load sample fields" sets `source:{kind:'sample'}` and loads `sampleFields`.
- [ ] Panel dismissal persists via `settings`.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — empty-state render + load-samples action tests
- [ ] Manual: `npm run dev:web` shows empty state, then samples on click

**Dependencies:** T7, T8
**Files likely touched:** `packages/builder-ui/src/workbench/FieldToolboxPane.tsx`, `packages/builder-ui/src/workbench/GetStartedPanel.tsx` (new), `packages/builder-ui/src/app/sampleData.ts`
**Estimated scope:** S

**Code** — *new file* `packages/builder-ui/src/workbench/GetStartedPanel.tsx`:

```tsx
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  DatabaseRegular,
  ArrowImportRegular,
  AddRegular,
  BeakerRegular,
} from '@fluentui/react-icons';

export interface GetStartedPanelProps {
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  hint: { color: tokens.colorNeutralForeground3 },
});

export function GetStartedPanel({ onSwitchTable, onImport, onAddField, onLoadSamples }: GetStartedPanelProps) {
  const styles = useStyles();
  return (
    <div className={styles.root} role="region" aria-label="Get started choosing a data source">
      <Text weight="semibold">No fields yet</Text>
      <Text className={styles.hint} size={200}>
        Choose where your fields come from to start building.
      </Text>
      <div className={styles.actions}>
        <Button appearance="primary" icon={<DatabaseRegular />} onClick={onSwitchTable}>
          Connect a table
        </Button>
        <Button icon={<ArrowImportRegular />} onClick={onImport}>
          Import a schema
        </Button>
        <Button icon={<AddRegular />} onClick={onAddField}>
          Add a field manually
        </Button>
        <Button appearance="subtle" icon={<BeakerRegular />} onClick={onLoadSamples}>
          Load sample fields
        </Button>
      </div>
    </div>
  );
}
```

*edit* `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` — when there are no fields, render the
get-started panel instead of the (now empty) search list:

```diff
       {activeTab === 'dynamicContent' ? (
         <div className="eb-toolbox-stack">
           <SourceChip ... />
-          <input className="eb-search-box" ... />
-          <ul className="eb-field-list" ...>
-            {filteredFields.map((field) => ( ... ))}
-          </ul>
+          {fields.length === 0 ? (
+            <GetStartedPanel
+              onSwitchTable={onSwitchTable}
+              onImport={onImport}
+              onAddField={onAddField}
+              onLoadSamples={onLoadSamples}
+            />
+          ) : (
+            <>
+              <input className="eb-search-box" ... />
+              <ul className="eb-field-list" ...>
+                {filteredFields.map((field) => ( ... ))}
+              </ul>
+            </>
+          )}
         </div>
       ) : (
         <WrapperChips />
       )}
```

Add the import:

```diff
 import { SourceChip } from './SourceChip';
+import { GetStartedPanel } from './GetStartedPanel';
```

*edit* `packages/builder-ui/src/app/sampleData.ts` — tag the sample set's provenance so callers don't
have to. Add a tagged export (the existing `sampleFields` stays for back-compat):

```diff
 export const sampleFields: QueryDocument['fields'] = [
   {
     id: 'Status',
     label: 'Status',
     type: 'choice',
     path: ['Status'],
     choices: ['Approved', 'Rejected', 'Pending'],
+    source: 'sample',
   },
-  { id: 'Approver', label: 'Approver', type: 'string', path: ['Approver'], nullable: true },
-  { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] },
-  { id: 'Region', label: 'Region', type: 'choice', path: ['Region'], choices: ['EMEA', 'APAC', 'AMER'] },
-  { id: 'DueDate', label: 'Due date', type: 'dateTime', path: ['DueDate'] },
-  { id: 'Submitted', label: 'Submitted', type: 'boolean', path: ['Submitted'] },
-  { id: 'RequestId', label: 'Request ID', type: 'string', path: ['RequestId'] },
-  { id: 'Department', label: 'Department', type: 'string', path: ['Department'] },
+  { id: 'Approver', label: 'Approver', type: 'string', path: ['Approver'], nullable: true, source: 'sample' },
+  { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'], source: 'sample' },
+  { id: 'Region', label: 'Region', type: 'choice', path: ['Region'], choices: ['EMEA', 'APAC', 'AMER'], source: 'sample' },
+  { id: 'DueDate', label: 'Due date', type: 'dateTime', path: ['DueDate'], source: 'sample' },
+  { id: 'Submitted', label: 'Submitted', type: 'boolean', path: ['Submitted'], source: 'sample' },
+  { id: 'RequestId', label: 'Request ID', type: 'string', path: ['RequestId'], source: 'sample' },
+  { id: 'Department', label: 'Department', type: 'string', path: ['Department'], source: 'sample' },
 ];
```

> Persisting panel dismissal: store a boolean under `settings.set('eb.getStarted.dismissed', '1')` from
> the shell; the shell already holds the `adapter`. This is a one-line read on mount and a write on a
> "Don't show again" affordance (optional within T9).

### Checkpoint: Core UI (after T7–T9)
- [ ] End-to-end on web: empty state → Load samples → author a rule → export; `build`/`test`/`lint` pass
- [ ] No silent sample injection anywhere
- [ ] Review with human

---

## Phase 4: Non-Dataverse content introduction

### Task 10: Import dialog — native `FieldDefinition[]` JSON

**Description:** Dialog to paste/load a `FieldDefinition[]` JSON, validated with the existing `validateField`
discipline, with a live preview and per-field diagnostics; on import set `source:{kind:'import'}`. (Wireframe A.2)

**Acceptance criteria:**
- [ ] Valid JSON shows a preview (label, type, choices) and an enabled Import button.
- [ ] Invalid types/shapes show diagnostics (severity + message); nothing silently dropped.
- [ ] Imported fields populate the toolbox and `document.fields`.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — valid import, invalid-type rejection, mixed map-or-warn
- [ ] Manual: paste sample JSON → fields appear

**Dependencies:** T8, T9
**Files likely touched:** `packages/builder-ui/src/importExport/fieldImport.ts` (new), `packages/builder-ui/src/workbench/ImportSchemaDialog.tsx` (new), reuse `savedExpressionSchema.ts`
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/importExport/fieldImport.ts`. Reuses the same validation
discipline as `validateField` but for a bare `FieldDefinition[]`:

```ts
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

export interface FieldImportDiagnostic {
  severity: 'error' | 'warning';
  message: string;
}

export type FieldImportResult =
  | { ok: true; fields: FieldDefinition[]; warnings: FieldImportDiagnostic[] }
  | { ok: false; diagnostics: FieldImportDiagnostic[] };

const FIELD_TYPES = new Set<FieldType>(['string', 'number', 'boolean', 'dateTime', 'choice']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse and validate a pasted `FieldDefinition[]` JSON string. */
export function parseFieldImport(source: string): FieldImportResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, diagnostics: [{ severity: 'error', message: 'JSON is not valid.' }] };
  }

  const list = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.fields) ? value.fields : null;
  if (!list) {
    return {
      ok: false,
      diagnostics: [{ severity: 'error', message: 'Expected a JSON array of fields (or an object with a "fields" array).' }],
    };
  }

  const diagnostics: FieldImportDiagnostic[] = [];
  const warnings: FieldImportDiagnostic[] = [];
  const fields: FieldDefinition[] = [];
  const seen = new Set<string>();

  list.forEach((raw, index) => {
    const at = `fields[${index}]`;
    if (!isRecord(raw)) {
      diagnostics.push({ severity: 'error', message: `${at} must be an object.` });
      return;
    }
    const id = typeof raw.id === 'string' ? raw.id : '';
    const label = typeof raw.label === 'string' ? raw.label : '';
    const type = raw.type as FieldType;

    if (!id) diagnostics.push({ severity: 'error', message: `${at}.id is required.` });
    if (!label) diagnostics.push({ severity: 'error', message: `${at}.label is required.` });
    if (!FIELD_TYPES.has(type)) diagnostics.push({ severity: 'error', message: `${at}.type is invalid.` });
    if (id && seen.has(id)) diagnostics.push({ severity: 'error', message: `${at}.id "${id}" is duplicated.` });
    seen.add(id);

    const path = Array.isArray(raw.path) && raw.path.every((s) => typeof s === 'string')
      ? (raw.path as string[])
      : id
        ? [id]
        : [];
    if (!Array.isArray(raw.path)) {
      warnings.push({ severity: 'warning', message: `${at}.path missing — defaulted to [id].` });
    }

    if (id && label && FIELD_TYPES.has(type)) {
      const field: FieldDefinition = { id, label, type, path, source: 'json' };
      if (Array.isArray(raw.choices) && raw.choices.every((c) => typeof c === 'string')) {
        field.choices = raw.choices as string[];
      }
      if (typeof raw.nullable === 'boolean') field.nullable = raw.nullable;
      fields.push(field);
    }
  });

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }
  return { ok: true, fields, warnings };
}
```

*new file* `packages/builder-ui/src/workbench/ImportSchemaDialog.tsx`:

```tsx
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Textarea,
  Text,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { parseFieldImport, type FieldImportDiagnostic } from '../importExport/fieldImport';

export interface ImportSchemaDialogProps {
  open: boolean;
  onDismiss: () => void;
  onImport: (fields: FieldDefinition[], label: string) => void;
}

const useStyles = makeStyles({
  editor: { width: '100%', minHeight: '180px', fontFamily: tokens.fontFamilyMonospace },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    marginTop: tokens.spacingVerticalS,
    maxHeight: '180px',
    overflowY: 'auto',
  },
  diag: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, marginTop: tokens.spacingVerticalS },
});

export function ImportSchemaDialog({ open, onDismiss, onImport }: ImportSchemaDialogProps) {
  const styles = useStyles();
  const [text, setText] = useState('');
  const result = useMemo(() => (text.trim() ? parseFieldImport(text) : null), [text]);
  const diagnostics: FieldImportDiagnostic[] =
    result == null ? [] : result.ok ? result.warnings : result.diagnostics;

  return (
    <Dialog open={open} onOpenChange={(_, data) => (!data.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Import field schema</DialogTitle>
          <DialogContent>
            <Text size={200}>Paste a JSON array of field definitions.</Text>
            <Textarea
              className={styles.editor}
              value={text}
              onChange={(_, data) => setText(data.value)}
              placeholder='[{ "id": "Status", "label": "Status", "type": "choice", "path": ["Status"], "choices": ["Open","Closed"] }]'
              aria-label="Field definition JSON"
            />
            {diagnostics.length > 0 ? (
              <div className={styles.diag}>
                {diagnostics.map((d, i) => (
                  <MessageBar key={i} intent={d.severity === 'error' ? 'error' : 'warning'}>
                    <MessageBarBody>{d.message}</MessageBarBody>
                  </MessageBar>
                ))}
              </div>
            ) : null}
            {result?.ok ? (
              <div className={styles.preview} aria-label="Import preview">
                {result.fields.map((f) => (
                  <Text key={f.id} size={200}>
                    {f.label} · {f.type}
                    {f.choices ? ` (${f.choices.join(', ')})` : ''}
                  </Text>
                ))}
              </div>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!result?.ok || result.fields.length === 0}
              onClick={() => {
                if (result?.ok) {
                  onImport(result.fields, 'Imported JSON');
                  setText('');
                }
              }}
            >
              Import
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx` — mount the dialog and apply the import via `applySource`:

```diff
+import { ImportSchemaDialog } from '../workbench/ImportSchemaDialog';
```

```diff
+      <ImportSchemaDialog
+        open={dialog === 'import'}
+        onDismiss={() => setDialog('none')}
+        onImport={(fields, label) => {
+          setDocument((current) => applySource(current, { kind: 'import', label }, fields));
+          setDialog('none');
+        }}
+      />
```

### Task 11: Manual "Add field" form

**Description:** Inline form (label, type, choices when `choice`, nullable; advanced id/path override) that
appends a `FieldDefinition` with `source:'user'`. (Wireframe A.3)

**Acceptance criteria:**
- [ ] Adding a field appends it with id/path slugified from label unless overridden.
- [ ] Choices editor shows only for `type==='choice'`; validation prevents empty label/duplicate id.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — add string field, add choice field, duplicate-id guard
- [ ] Manual: add a field, use it in a rule

**Dependencies:** T8, T9
**Files likely touched:** `packages/builder-ui/src/workbench/AddFieldForm.tsx` (new), `packages/builder-ui/src/app/sourceState.ts`
**Estimated scope:** S

**Code** — *edit* `packages/builder-ui/src/app/sourceState.ts` — add a slug helper and an append helper:

```ts
// append to sourceState.ts

import type { FieldType } from '@ryanmakes/eb_engine';

export function slugifyFieldId(label: string): string {
  return label.trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
}

export interface NewFieldInput {
  label: string;
  type: FieldType;
  choices?: string[];
  nullable?: boolean;
  idOverride?: string;
  pathOverride?: string[];
}

/** Build a user `FieldDefinition`; returns null if label is empty or the id collides. */
export function buildUserField(input: NewFieldInput, existing: FieldDefinition[]): FieldDefinition | null {
  const label = input.label.trim();
  if (!label) return null;

  const id = (input.idOverride?.trim() || slugifyFieldId(label));
  if (!id || existing.some((f) => f.id === id)) return null;

  const field: FieldDefinition = {
    id,
    label,
    type: input.type,
    path: input.pathOverride?.length ? input.pathOverride : [id],
    source: 'user',
  };
  if (input.type === 'choice' && input.choices?.length) field.choices = input.choices;
  if (typeof input.nullable === 'boolean') field.nullable = input.nullable;
  return field;
}
```

*new file* `packages/builder-ui/src/workbench/AddFieldForm.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Dropdown,
  Option,
  Switch,
  Field,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';
import { buildUserField } from '../app/sourceState';

export interface AddFieldFormProps {
  open: boolean;
  existing: FieldDefinition[];
  onDismiss: () => void;
  onAdd: (field: FieldDefinition) => void;
}

const TYPES: FieldType[] = ['string', 'number', 'boolean', 'dateTime', 'choice'];

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
});

export function AddFieldForm({ open, existing, onDismiss, onAdd }: AddFieldFormProps) {
  const styles = useStyles();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('string');
  const [choicesText, setChoicesText] = useState('');
  const [nullable, setNullable] = useState(false);
  const [idOverride, setIdOverride] = useState('');

  const reset = () => {
    setLabel('');
    setType('string');
    setChoicesText('');
    setNullable(false);
    setIdOverride('');
  };

  const choices = choicesText.split('\n').map((c) => c.trim()).filter(Boolean);
  const candidate = buildUserField({ label, type, choices, nullable, idOverride: idOverride || undefined }, existing);
  const invalidReason = !label.trim()
    ? 'Label is required.'
    : candidate === null
      ? 'Field id is empty or already exists.'
      : undefined;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add field</DialogTitle>
          <DialogContent className={styles.body}>
            <Field label="Label" required validationMessage={invalidReason} validationState={invalidReason ? 'error' : 'none'}>
              <Input value={label} onChange={(_, d) => setLabel(d.value)} />
            </Field>
            <Field label="Type">
              <Dropdown
                value={type}
                selectedOptions={[type]}
                onOptionSelect={(_, d) => setType((d.optionValue as FieldType) ?? 'string')}
              >
                {TYPES.map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            {type === 'choice' ? (
              <Field label="Choices (one per line)">
                <Textarea value={choicesText} onChange={(_, d) => setChoicesText(d.value)} />
              </Field>
            ) : null}
            <Switch label="Nullable" checked={nullable} onChange={(_, d) => setNullable(d.checked)} />
            <Field label="Advanced: id override">
              <Input value={idOverride} onChange={(_, d) => setIdOverride(d.value)} placeholder="auto from label" />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={candidate === null}
              onClick={() => {
                if (candidate) {
                  onAdd(candidate);
                  reset();
                }
              }}
            >
              Add field
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx` — mount + append (preserving source kind, appending to fields):

```diff
+import { AddFieldForm } from '../workbench/AddFieldForm';
```

```diff
+      <AddFieldForm
+        open={dialog === 'addField'}
+        existing={document.fields}
+        onDismiss={() => setDialog('none')}
+        onAdd={(field) => {
+          setDocument((current) => ({
+            ...current,
+            version: 2,
+            fields: [...current.fields, field],
+            source: current.source?.kind && current.source.kind !== 'unknown'
+              ? current.source
+              : { kind: 'import', label: 'Manual fields' },
+          }));
+          setDialog('none');
+        }}
+      />
```

### Task 12: Field profiles (save/load via `settings`)

**Description:** Save the current `fields` as a named profile through the `settings` adapter; list/load/delete
profiles. Schema only — never expression content. (Rec §3.3)

**Acceptance criteria:**
- [ ] Save prompts for a name and persists `{name, fields}` via `settings`.
- [ ] Loading a profile replaces active fields and sets `source:{kind:'profile', label}`.
- [ ] Works on web (`localStorage`) and PPTB (host settings) through the same adapter API.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — save/list/load/delete against a mock `settings`
- [ ] Manual: save a profile, reload page, load it back

**Dependencies:** T10 or T11 (needs fields to save)
**Files likely touched:** `packages/builder-ui/src/importExport/fieldProfiles.ts` (new), `packages/builder-ui/src/workbench/ManageProfilesDialog.tsx` (new)
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/importExport/fieldProfiles.ts`. Storage-agnostic
(uses `PlatformSettings`). Note: `DataSourceKind` does not include `'profile'` in T4's union — when a
profile loads we set `kind:'import'` with a profile label, OR extend the union. To keep the chip
honest, **extend the T4 union** with `'profile'` (one-line addition shown below).

```ts
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const INDEX_KEY = 'eb.profiles.index.v1';
const profileKey = (name: string) => `eb.profile.v1.${name}`;

export interface FieldProfile {
  name: string;
  fields: FieldDefinition[];
}

async function readIndex(settings: PlatformSettings): Promise<string[]> {
  const raw = await settings.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

export async function listProfiles(settings: PlatformSettings): Promise<string[]> {
  return readIndex(settings);
}

export async function saveProfile(settings: PlatformSettings, profile: FieldProfile): Promise<void> {
  await settings.set(profileKey(profile.name), JSON.stringify(profile.fields));
  const index = await readIndex(settings);
  if (!index.includes(profile.name)) {
    await settings.set(INDEX_KEY, JSON.stringify([...index, profile.name]));
  }
}

export async function loadProfile(settings: PlatformSettings, name: string): Promise<FieldProfile | null> {
  const raw = await settings.get(profileKey(name));
  if (!raw) return null;
  try {
    const fields = JSON.parse(raw) as FieldDefinition[];
    return Array.isArray(fields) ? { name, fields } : null;
  } catch {
    return null;
  }
}

export async function deleteProfile(settings: PlatformSettings, name: string): Promise<void> {
  await settings.remove(profileKey(name));
  const index = await readIndex(settings);
  await settings.set(INDEX_KEY, JSON.stringify(index.filter((n) => n !== name)));
}
```

*edit* `packages/builder-ui/src/composer/querySchema.ts` — add `'profile'` to the union (the only
change T12 makes to T4's type):

```diff
 export type DataSourceKind =
   | 'dataverse'
   | 'import'
+  | 'profile'
   | 'sample'
   | 'unknown';
```
> (If you adopted the union exactly as shown in T4, it already lists `'profile'`. This note exists so
> implementers verify the value is present before T12 references it.)

*new file* `packages/builder-ui/src/workbench/ManageProfilesDialog.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';
import { deleteProfile, listProfiles, loadProfile, saveProfile } from '../importExport/fieldProfiles';

export interface ManageProfilesDialogProps {
  open: boolean;
  settings: PlatformSettings;
  currentFields: FieldDefinition[];
  onDismiss: () => void;
  onLoad: (name: string, fields: FieldDefinition[]) => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: '360px' },
  row: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  saveRow: { display: 'flex', gap: tokens.spacingHorizontalS },
  grow: { flexGrow: 1 },
});

export function ManageProfilesDialog({ open, settings, currentFields, onDismiss, onLoad }: ManageProfilesDialogProps) {
  const styles = useStyles();
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState('');

  const refresh = () => {
    void listProfiles(settings).then(setNames);
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Field profiles</DialogTitle>
          <DialogContent className={styles.body}>
            <div className={styles.saveRow}>
              <Input
                className={styles.grow}
                value={newName}
                placeholder="New profile name"
                onChange={(_, d) => setNewName(d.value)}
              />
              <Button
                appearance="primary"
                disabled={!newName.trim() || currentFields.length === 0}
                onClick={async () => {
                  await saveProfile(settings, { name: newName.trim(), fields: currentFields });
                  setNewName('');
                  refresh();
                }}
              >
                Save current
              </Button>
            </div>
            <div className={styles.list}>
              {names.length === 0 ? <Text size={200}>No saved profiles.</Text> : null}
              {names.map((name) => (
                <div key={name} className={styles.row}>
                  <Text className={styles.grow}>{name}</Text>
                  <Button
                    size="small"
                    onClick={async () => {
                      const profile = await loadProfile(settings, name);
                      if (profile) onLoad(profile.name, profile.fields);
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    aria-label={`Delete ${name}`}
                    onClick={async () => {
                      await deleteProfile(settings, name);
                      refresh();
                    }}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx`:

```diff
+import { ManageProfilesDialog } from '../workbench/ManageProfilesDialog';
```

```diff
+      <ManageProfilesDialog
+        open={dialog === 'profiles'}
+        settings={adapter.settings}
+        currentFields={document.fields}
+        onDismiss={() => setDialog('none')}
+        onLoad={(name, fields) => {
+          setDocument((current) => applySource(current, { kind: 'profile', label: name }, fields));
+          setDialog('none');
+        }}
+      />
```

### Checkpoint: Non-Dataverse (after T10–T12)
- [ ] Web host is fully usable with zero Dataverse: import, add, save/load profiles
- [ ] `build`/`test`/`lint`/`typecheck` pass

---

## Phase 5: Dataverse discovery UX (PPTB)

### Task 13: Table picker dialog

**Description:** Search-first table picker fed by `getTables()` (`getAllEntitiesMetadata`): primary/trigger
table pinned + preselected, recently-used shortlist, lazy "All tables", system tables hidden by default, and
an "Include related (one hop)" toggle. On confirm, call `discoverFields`. (Wireframe A.1)

**Acceptance criteria:**
- [ ] Picker lists tables with display + logical name; search filters; system tables hidden unless toggled.
- [ ] Confirm triggers `discoverFields({table, includeRelated})` and sets `source:{kind:'dataverse', tableLogicalName, label}`.
- [ ] Empty/just-text states handled (no crash when `getTables` returns `[]`).

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — render + select + confirm with a mock adapter
- [ ] Manual: `npm run dev:pptb` (mock `dataverseAPI`) → pick table → fields load

**Dependencies:** T5, T8
**Files likely touched:** `packages/builder-ui/src/workbench/TablePickerDialog.tsx` (new), `packages/builder-ui/src/app/sourceState.ts`
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/workbench/TablePickerDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Switch,
  Text,
  Spinner,
  makeStyles,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import type { TableRef } from '@ryanmakes/eb_platformadapter';

export interface TablePickerDialogProps {
  open: boolean;
  /** Resolves the table list lazily on open. */
  loadTables: () => Promise<TableRef[]>;
  onDismiss: () => void;
  onConfirm: (table: TableRef, includeRelated: boolean) => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '420px' },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, maxHeight: '320px', overflowY: 'auto' },
  row: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
  },
  selected: { backgroundColor: tokens.colorBrandBackground2 },
  logical: { color: tokens.colorNeutralForeground3 },
});

export function TablePickerDialog({ open, loadTables, onDismiss, onConfirm }: TablePickerDialogProps) {
  const styles = useStyles();
  const [tables, setTables] = useState<TableRef[] | null>(null);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [includeRelated, setIncludeRelated] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTables(null);
    void loadTables().then(setTables);
  }, [open, loadTables]);

  const filtered = useMemo(() => {
    const list = tables ?? [];
    const needle = search.trim().toLowerCase();
    return list.filter((t) => {
      if (!showSystem && t.isSystem) return false;
      if (!needle) return true;
      return `${t.displayName} ${t.logicalName}`.toLowerCase().includes(needle);
    });
  }, [tables, search, showSystem]);

  const selectedTable = filtered.find((t) => t.logicalName === selected) ?? null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Select a table</DialogTitle>
          <DialogContent className={styles.body}>
            <Input
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              placeholder="Search tables…"
              aria-label="Search tables"
            />
            <Switch label="Show system tables" checked={showSystem} onChange={(_, d) => setShowSystem(d.checked)} />
            <Switch label="Include related (one hop)" checked={includeRelated} onChange={(_, d) => setIncludeRelated(d.checked)} />
            {tables === null ? (
              <Spinner size="tiny" label="Loading tables…" />
            ) : filtered.length === 0 ? (
              <Text size={200}>No tables match.</Text>
            ) : (
              <div className={styles.list} role="listbox" aria-label="Tables">
                {filtered.map((t) => (
                  <div
                    key={t.logicalName}
                    role="option"
                    aria-selected={selected === t.logicalName}
                    tabIndex={0}
                    className={mergeClasses(styles.row, selected === t.logicalName && styles.selected)}
                    onClick={() => setSelected(t.logicalName)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelected(t.logicalName);
                    }}
                  >
                    <Text weight="semibold">{t.displayName}</Text>
                    <Text className={styles.logical} size={100}>
                      {t.logicalName}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!selectedTable}
              onClick={() => selectedTable && onConfirm(selectedTable, includeRelated)}
            >
              Connect
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx`:

```diff
+import { TablePickerDialog } from '../workbench/TablePickerDialog';
```

```diff
+      <TablePickerDialog
+        open={dialog === 'tablePicker'}
+        loadTables={() => adapter.getTables?.() ?? Promise.resolve([])}
+        onDismiss={() => setDialog('none')}
+        onConfirm={async (table, includeRelated) => {
+          setDialog('none');
+          const result = await discoverThroughAdapter(adapter, table.logicalName, includeRelated);
+          setDocument((current) =>
+            applySource(
+              current,
+              { kind: 'dataverse', label: table.displayName, tableLogicalName: table.logicalName, includeRelated },
+              result.fields,
+            ),
+          );
+        }}
+      />
```

### Task 14: One-hop related tables (lazy sections)

**Description:** When "include related" is on, surface `ManyToOne`/`OneToMany` relationships
(`getEntityRelatedMetadata`) as collapsible toolbox sections; expanding a section lazily discovers that
relationship's columns as flattened dotted-path fields (`group` = related table display name). (Rec §2.3, §4.5)

**Acceptance criteria:**
- [ ] Related sections render collapsed with a "lazy" affordance; no related fields fetched until expanded.
- [ ] Expanded related fields have `path` like `[relationshipNav, logicalName]` and a `group` label.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — lazy expand triggers exactly one discovery call
- [ ] Manual: expand "Owner (related)" → related fields appear under a section

**Dependencies:** T13
**Files likely touched:** `packages/builder-ui/src/workbench/FieldToolboxPane.tsx`, `packages/platform/src/pptbAdapter.ts` (relationship discovery), `*.test.ts`
**Estimated scope:** M

**Code** — *edit* `packages/platform/src/pptbAdapter.ts` — add a relationship discovery method on the
adapter (and a matching optional method on the contract). First extend `PlatformAdapter` (T3 file):

```diff
   discoverFields?(options?: DiscoverFieldsOptions): Promise<DiscoverFieldsResult>;
+  /** One-hop related navigation properties for a table (T14). Optional. */
+  getRelatedTables?(table: string): Promise<RelatedTableRef[]>;
+  /** Discover a single relationship's columns as flattened, dotted-path fields (T14). Optional. */
+  discoverRelatedFields?(table: string, navigationProperty: string): Promise<DiscoverFieldsResult>;
```

Add the `RelatedTableRef` type to `PlatformAdapter.ts`:

```ts
export interface RelatedTableRef {
  /** Navigation property name used as the path prefix (e.g. 'ownerid'). */
  navigationProperty: string;
  /** Related table logical name. */
  table: string;
  /** Display label for the section header. */
  displayName: string;
  relationshipType: 'OneToMany' | 'ManyToOne';
}
```

Implement in `pptbAdapter.ts` (inside the returned adapter):

```ts
    async getRelatedTables(table: string): Promise<RelatedTableRef[]> {
      if (!dv?.getEntityRelatedMetadata) return [];
      const raw = (await dv.getEntityRelatedMetadata(table, 'ManyToOneRelationships')) as
        | { value?: DataverseRelationshipMetadata[] }
        | DataverseRelationshipMetadata[]
        | undefined;
      const rels = Array.isArray(raw) ? raw : (raw?.value ?? []);
      return rels
        .filter((r) => r.ReferencingEntityNavigationPropertyName && r.ReferencedEntity)
        .map((r) => ({
          navigationProperty: r.ReferencingEntityNavigationPropertyName as string,
          table: r.ReferencedEntity as string,
          displayName: r.ReferencedEntity as string,
          relationshipType: 'ManyToOne' as const,
        }));
    },

    async discoverRelatedFields(table: string, navigationProperty: string): Promise<DiscoverFieldsResult> {
      const related = (await adapter.getRelatedTables?.(table))?.find(
        (r) => r.navigationProperty === navigationProperty,
      );
      if (!related || !dv?.getEntityRelatedMetadata) return { fields: [] };
      const raw = (await dv.getEntityRelatedMetadata(related.table, 'Attributes', '$expand=OptionSet')) as
        | { value?: DataverseAttributeMetadata[] }
        | DataverseAttributeMetadata[]
        | undefined;
      const attrs = Array.isArray(raw) ? raw : (raw?.value ?? []);
      // Flatten under the navigation property; tag the section via `group`.
      const fields = mapDataverseAttributes(attrs, [navigationProperty]).map((f) => ({
        ...f,
        group: related.displayName,
      }));
      return { fields, fetchedAt: Date.now() };
    },
```

Add imports to `pptbAdapter.ts`:

```diff
-import type {
-  DataverseApi,
-  DataverseEntityMetadata,
-} from './dataverseApi';
+import type {
+  DataverseApi,
+  DataverseEntityMetadata,
+  DataverseRelationshipMetadata,
+} from './dataverseApi';
```
and `RelatedTableRef` to the `PlatformAdapter` import group. Re-export `RelatedTableRef` from
`packages/platform/src/index.ts`.

*edit* `packages/builder-ui/src/workbench/FieldToolboxPane.tsx` — render fields grouped by `group`,
with related sections collapsed and lazily loaded. Replace the flat `<ul>` with a grouped renderer:

```tsx
// new local component within FieldToolboxPane.tsx (or a sibling RelatedSection.tsx)
import { Accordion, AccordionItem, AccordionHeader, AccordionPanel } from '@fluentui/react-components';

// Group primary fields (no `group`) vs related (grouped by `group`).
// Related sections render under an Accordion; expanding calls `onExpandRelated(nav)` exactly once.
```

Add two props to `FieldToolboxPaneProps` (T8 file) for related sections:

```diff
   onRefresh: () => void;
+  /** Related navigation sections available for the active dataverse table (T14). */
+  relatedSections?: Array<{ navigationProperty: string; displayName: string }>;
+  /** Called once when a related section is first expanded; resolves and appends its fields. */
+  onExpandRelated?: (navigationProperty: string) => void;
```

Shell wires `relatedSections` from `adapter.getRelatedTables` after a dataverse connect, and
`onExpandRelated` calls `adapter.discoverRelatedFields(table, nav)` then appends to `document.fields`
(dedup by id). Guard with a `Set<string>` of already-expanded navs so each fires exactly once.

*new file* `packages/platform/test/relatedDiscovery.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPptbAdapter } from '../src/pptbAdapter';

it('discoverRelatedFields flattens under the navigation property with a group label', async () => {
  const getEntityRelatedMetadata = vi
    .fn()
    .mockResolvedValueOnce({ value: [{ ReferencingEntityNavigationPropertyName: 'ownerid', ReferencedEntity: 'systemuser' }] })
    .mockResolvedValueOnce({ value: [{ LogicalName: 'fullname', AttributeType: 'String', DisplayName: { UserLocalizedLabel: { Label: 'Full Name' } } }] });
  const adapter = createPptbAdapter(undefined, { getEntityRelatedMetadata });
  const result = await adapter.discoverRelatedFields?.('account', 'ownerid');
  expect(result?.fields[0].path).toEqual(['ownerid', 'fullname']);
  expect(result?.fields[0].group).toBe('systemuser');
});
```

### Task 15: Time-based metadata cache + Refresh

**Description:** Cache `{fields}` per `(target, table, includeRelated)` via `settings`; treat fresh for a
session TTL; Refresh re-runs discovery. Document the optional delta upgrade via
`dataverseAPI.execute({operationName:'RetrieveMetadataChanges', operationType:'function', …})`. (Rec §5.5)

**Acceptance criteria:**
- [ ] Repeated opens of the same table read from cache; Refresh forces re-discovery and updates cache.
- [ ] Cache is keyed and cleared on connection/source change; stores schema only.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — cache hit/miss + refresh-invalidates tests against mock `settings`
- [ ] Manual: switch tables back and forth; observe no redundant fetches without Refresh

**Dependencies:** T13
**Files likely touched:** `packages/builder-ui/src/importExport/metadataCache.ts` (new), `packages/builder-ui/src/app/sourceState.ts`
**Estimated scope:** M

**Code** — *new file* `packages/builder-ui/src/importExport/metadataCache.ts`:

```ts
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const PREFIX = 'eb.metadata.v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes (Rec §4.4)

interface CacheEntry {
  fields: FieldDefinition[];
  fetchedAt: number;
}

export function cacheKey(table: string, includeRelated: boolean): string {
  return `${PREFIX}.${table}.${includeRelated ? 'rel' : 'flat'}`;
}

export async function readCache(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<FieldDefinition[] | null> {
  const raw = await settings.get(cacheKey(table, includeRelated));
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.fetchedAt > ttlMs) return null;
    return entry.fields;
  } catch {
    return null;
  }
}

export async function writeCache(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  fields: FieldDefinition[],
): Promise<void> {
  const entry: CacheEntry = { fields, fetchedAt: Date.now() };
  await settings.set(cacheKey(table, includeRelated), JSON.stringify(entry));
}

export async function invalidate(
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
): Promise<void> {
  await settings.remove(cacheKey(table, includeRelated));
}
```

*edit* `packages/builder-ui/src/app/sourceState.ts` — add a cache-aware discovery wrapper:

```ts
import { readCache, writeCache } from '../importExport/metadataCache';

/** Cache-aware discovery: serves fresh cache unless `refresh`, otherwise discovers + writes through. */
export async function discoverCached(
  adapter: PlatformAdapter,
  settings: PlatformSettings,
  table: string,
  includeRelated: boolean,
  refresh: boolean,
): Promise<FieldDefinition[]> {
  if (!refresh) {
    const cached = await readCache(settings, table, includeRelated);
    if (cached) return cached;
  }
  const result = await discoverThroughAdapter(adapter, table, includeRelated);
  await writeCache(settings, table, includeRelated, result.fields);
  return result.fields;
}
```
(import `PlatformSettings` alongside `PlatformAdapter` at the top of `sourceState.ts`.)

The shell's `onRefresh` passes `refresh: true`; the table picker confirm passes `refresh: false`.

> **Optional delta upgrade (documented, flag-gated).** Where `dataverseAPI.execute` is available, the
> adapter can revalidate with:
> ```ts
> await dv.execute?.({
>   operationName: 'RetrieveMetadataChanges',
>   operationType: 'function',
>   parameters: { ClientVersionStamp: lastStamp, Query: { /* EntityQueryExpression */ } },
> });
> ```
> Catch `ExpiredVersionStamp` → drop the stamp and rebuild the cache (see T19). Default build uses the
> time-based cache only; PPTB convenience helpers don't expose `ClientVersionStamp`.

### Checkpoint: Dataverse (after T13–T15)
- [ ] PPTB path: pick table → fields mapped correctly (choices, types) → related lazy → refresh works
- [ ] `build`/`test`/`typecheck`/`lint` pass; review with human

---

## Phase 6: Resilience — schema-change handling

### Task 16: Orphan detection + `UNKNOWN_FIELD` rendering

**Description:** On document load and every source change, resolve each rule's `fieldId` against active fields;
render unresolved references as **non-blocking** `UNKNOWN_FIELD` diagnostics with an inline badge in the canvas.
(Rec §4.6, Wireframe C.2)

**Acceptance criteria:**
- [ ] Rules with unresolved `fieldId` stay in the tree, visibly badged, and surface `UNKNOWN_FIELD` in diagnostics.
- [ ] Resolvable rules are untouched; expression preview shows the diagnostic, not invalid output.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — load a doc whose fields don't match active source → orphans flagged, others intact
- [ ] `npx vitest run packages/engine` — confirm `UNKNOWN_FIELD` still emitted as today

**Dependencies:** T7
**Files likely touched:** `packages/builder-ui/src/workbench/ConditionCanvas.tsx`/`ConditionGroupCard.tsx`/`RuleRowEditor.tsx`, `*.test.ts`
**Estimated scope:** M

> **Engine note:** `UNKNOWN_FIELD` already exists in `FormatDiagnostic['code']` and the formatter emits
> it for unresolved `fieldId`s — no engine change needed. T16 is purely a UI rendering of that existing
> signal plus a shared orphan set (from `resolveOrphans`, T7).

**Code** — the current `RuleRowEditor` returns `null` when `findField` misses (`if (!field) return null;`).
That silently hides orphaned rules. *edit* `RuleRowEditor.tsx` to render an orphan row instead:

```diff
 export function RuleRowEditor({ fields, onDelete, onDuplicate, onSelect, onUpdate, rule, selected }: RuleRowEditorProps) {
   const field = findField(fields, rule.fieldId);
   const fieldLabel = field?.label ?? rule.fieldId;
   const hasError = !rule.value && rule.operator !== 'empty' && rule.operator !== 'notEmpty';

-  if (!field) {
-    return null;
-  }
+  if (!field) {
+    return (
+      <div
+        className={`eb-rule-row-editor is-orphan ${selected ? 'is-selected' : ''}`}
+        role="group"
+        aria-label={`Unknown field ${rule.fieldId}`}
+        onClick={() => onSelect(rule.id)}
+      >
+        <span className="eb-orphan-badge" title="This field is not in the active source" aria-label="Unknown field">
+          ⚠ Unknown field
+        </span>
+        <span className="eb-field-title">{rule.fieldId}</span>
+        <span className="eb-muted">{rule.operator} {String(rule.value ?? '')}</span>
+        <div className="eb-rule-tools">
+          <button
+            type="button"
+            className="eb-text-btn"
+            onClick={(e) => {
+              e.stopPropagation();
+              onSelect(rule.id);
+            }}
+          >
+            Remap…
+          </button>
+          <button
+            type="button"
+            className="eb-icon-btn"
+            aria-label="Remove rule"
+            title="Remove rule"
+            onClick={(e) => {
+              e.stopPropagation();
+              onDelete(rule.id);
+            }}
+          >
+            <TrashIcon />
+          </button>
+        </div>
+      </div>
+    );
+  }
```

Add `is-orphan` / `eb-orphan-badge` styling to `packages/builder-ui/src/theme/tokens.css` (warning
amber via existing CSS vars; mirror the `.is-error` treatment already present).

The diagnostics pane already renders `derived.diagnostics` (which include `UNKNOWN_FIELD` from the
engine), so the SupportPane requires no change. Optionally surface a count badge in `ConditionCanvas`
header using `resolveOrphans(props.root, props.fields).size`:

```diff
-        <span className="eb-dock-meta">{props.mode === 'filterArray' ? 'Filter array' : 'Trigger condition'}</span>
+        <span className="eb-dock-meta">
+          {props.mode === 'filterArray' ? 'Filter array' : 'Trigger condition'}
+          {(() => {
+            const orphans = resolveOrphans(props.root, props.fields).size;
+            return orphans > 0 ? ` · ${orphans} unknown field${orphans === 1 ? '' : 's'}` : '';
+          })()}
+        </span>
```
(import `resolveOrphans` from `../app/sourceState` in `ConditionCanvas.tsx`.)

*new file* `packages/builder-ui/test/orphanRendering.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuleRowEditor } from '../src/workbench/RuleRowEditor';

const noop = vi.fn();

describe('orphan rule rendering', () => {
  it('renders an Unknown field row when the fieldId is missing', () => {
    render(
      <RuleRowEditor
        rule={{ id: 'r1', kind: 'rule', fieldId: 'Ghost', operator: 'equals', value: 'x' }}
        fields={[]}
        selected={false}
        onSelect={noop}
        onUpdate={noop}
        onDuplicate={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText('Ghost')).toBeTruthy();
    expect(screen.getByLabelText('Unknown field')).toBeTruthy();
  });
});
```

### Task 17: Remap / remove affordances

**Description:** For orphaned rules, offer **Remap field…** (type-compatible candidates first, via
`getOperatorsForField`/`getSafeOperator`) and **Remove rule**. (Wireframe C.3)

**Acceptance criteria:**
- [ ] Remap dialog lists type-compatible fields first; choosing a different type re-derives a safe operator via `getSafeOperator`.
- [ ] Remap updates the rule's `fieldId` (and operator if needed); Remove deletes only that rule.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — remap same-type (operator kept), remap cross-type (operator reset), remove
- [ ] Manual: remap an orphan, expression becomes valid

**Dependencies:** T16
**Files likely touched:** `packages/builder-ui/src/workbench/RemapFieldDialog.tsx` (new), `packages/builder-ui/src/app/builderState.ts`
**Estimated scope:** M

**Code** — *edit* `packages/builder-ui/src/app/builderState.ts` — add a helper that builds the remap
patch using the existing `getSafeOperator`:

```ts
// append to builderState.ts
import type { RulePatch } from '../composer/querySchema';

/**
 * Compute the patch to remap an orphaned rule onto `target`. Keeps the operator if the target type
 * still supports it (via getSafeOperator), otherwise resets to the target's first safe operator.
 */
export function remapRulePatch(target: FieldDefinition, currentOperator: string): RulePatch {
  const operator = getSafeOperator(target, currentOperator);
  return {
    fieldId: target.id,
    operator,
    // Reset value when the operator changed (cross-type) to avoid carrying an incompatible literal.
    value: operator === currentOperator ? undefined : defaultValueForRemap(target),
  };
}

function defaultValueForRemap(field: FieldDefinition): string | number | boolean {
  if (field.choices?.length) return field.choices[0];
  if (field.type === 'number') return 0;
  if (field.type === 'boolean') return false;
  return '';
}
```

*new file* `packages/builder-ui/src/workbench/RemapFieldDialog.tsx`:

```tsx
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Dropdown,
  Option,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { QueryRule, RulePatch } from '../composer/querySchema';
import { remapRulePatch } from '../app/builderState';

export interface RemapFieldDialogProps {
  open: boolean;
  rule: QueryRule | null;
  fields: FieldDefinition[];
  /** The orphaned rule's last-known type, if recoverable; used to order compatible candidates first. */
  preferredType?: FieldDefinition['type'];
  onDismiss: () => void;
  onRemap: (ruleId: string, patch: RulePatch) => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: '360px' },
});

export function RemapFieldDialog({ open, rule, fields, preferredType, onDismiss, onRemap }: RemapFieldDialogProps) {
  const styles = useStyles();
  const [targetId, setTargetId] = useState<string | null>(null);

  // Type-compatible candidates first.
  const ordered = useMemo(() => {
    if (!preferredType) return fields;
    return [...fields].sort((a, b) => {
      const aMatch = a.type === preferredType ? 0 : 1;
      const bMatch = b.type === preferredType ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [fields, preferredType]);

  const target = ordered.find((f) => f.id === targetId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Remap field</DialogTitle>
          <DialogContent className={styles.body}>
            <Text size={200}>
              Rule references <strong>{rule?.fieldId}</strong>, which is not in the active source. Choose a
              replacement field.
            </Text>
            <Dropdown
              placeholder="Select a field"
              selectedOptions={targetId ? [targetId] : []}
              onOptionSelect={(_, d) => setTargetId(d.optionValue ?? null)}
            >
              {ordered.map((f) => (
                <Option key={f.id} value={f.id} text={`${f.label} (${f.type})`}>
                  {f.label} · {f.type}
                </Option>
              ))}
            </Dropdown>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={!rule || !target}
              onClick={() => {
                if (rule && target) {
                  onRemap(rule.id, remapRulePatch(target, rule.operator));
                  setTargetId(null);
                }
              }}
            >
              Remap
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx` — open the remap dialog when an orphan row is selected and apply
the patch with the existing `updateRule`:

```diff
+import { RemapFieldDialog } from '../workbench/RemapFieldDialog';
```

```diff
+      <RemapFieldDialog
+        open={dialog === 'remap'}
+        rule={selectedRule ?? null}
+        fields={document.fields}
+        onDismiss={() => setDialog('none')}
+        onRemap={(ruleId, patch) => {
+          setDocument((current) => updateRule(current, ruleId, patch));
+          setDialog('none');
+        }}
+      />
```
(The orphan row's "Remap…" button selects the rule and calls `setDialog('remap')` — wire via a new
`onRequestRemap` prop threaded through `ConditionCanvas` → `ConditionGroupCard` → `RuleRowEditor`,
or, more simply, have the orphan row call the existing `onSelect` and add a "Remap selected" action to
the canvas header that opens the dialog for `selectedRule`.)

### Task 18: Switch confirmation dialog

**Description:** When switching sources with rules present, show the field diff and a default **non-destructive**
choice (keep + flag) vs Remove. (Wireframe C.1)

**Acceptance criteria:**
- [ ] Dialog computes `referenced fieldIds − new fields`, lists the affected rules, defaults to Keep+flag.
- [ ] Confirm applies the new source; Keep preserves+flags orphans (T16), Remove deletes only affected rules.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — diff computation + keep vs remove outcomes
- [ ] Manual: switch tables with rules → confirm → orphans flagged

**Dependencies:** T13, T16
**Files likely touched:** `packages/builder-ui/src/workbench/SwitchSourceDialog.tsx` (new), `packages/builder-ui/src/app/sourceState.ts`
**Estimated scope:** M

**Code** — *edit* `packages/builder-ui/src/app/sourceState.ts` — add a diff + a remove-affected helper:

```ts
import { deleteNode } from '../composer/queryActions';

export interface SourceSwitchDiff {
  /** fieldIds referenced by rules that won't exist in the incoming field set. */
  orphanedFieldIds: string[];
  /** rule ids that reference an orphaned field. */
  affectedRuleIds: string[];
}

/** Compute what would break if `document` switched to `nextFields`. */
export function diffSourceSwitch(document: QueryDocument, nextFields: FieldDefinition[]): SourceSwitchDiff {
  const orphans = resolveOrphans(document.root, nextFields);
  const affectedRuleIds: string[] = [];
  const walk = (node: QueryNode) => {
    if (node.kind === 'rule') {
      if (orphans.has(node.fieldId)) affectedRuleIds.push(node.id);
      return;
    }
    node.children.forEach(walk);
  };
  walk(document.root);
  return { orphanedFieldIds: [...orphans], affectedRuleIds };
}

/** Remove every rule whose id is in `ruleIds`. */
export function removeRules(document: QueryDocument, ruleIds: string[]): QueryDocument {
  return ruleIds.reduce((doc, ruleId) => deleteNode(doc, ruleId), document);
}
```

*new file* `packages/builder-ui/src/workbench/SwitchSourceDialog.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  Radio,
  Text,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { SourceSwitchDiff } from '../app/sourceState';

export interface SwitchSourceDialogProps {
  open: boolean;
  diff: SourceSwitchDiff;
  targetLabel: string;
  onDismiss: () => void;
  onConfirm: (mode: 'keep' | 'remove') => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: '380px' },
});

export function SwitchSourceDialog({ open, diff, targetLabel, onDismiss, onConfirm }: SwitchSourceDialogProps) {
  const styles = useStyles();
  const [mode, setMode] = useState<'keep' | 'remove'>('keep');
  const affected = diff.affectedRuleIds.length;

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onDismiss() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Switch source to {targetLabel}</DialogTitle>
          <DialogContent className={styles.body}>
            {affected === 0 ? (
              <Text>No existing rules reference fields missing from the new source.</Text>
            ) : (
              <>
                <MessageBar intent="warning">
                  <MessageBarBody>
                    {affected} rule{affected === 1 ? '' : 's'} reference{affected === 1 ? 's' : ''} fields that
                    don’t exist in {targetLabel}.
                  </MessageBarBody>
                </MessageBar>
                <RadioGroup value={mode} onChange={(_, d) => setMode(d.value as 'keep' | 'remove')}>
                  <Radio value="keep" label="Keep rules and flag unknown fields (recommended)" />
                  <Radio value="remove" label="Remove the affected rules" />
                </RadioGroup>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={() => onConfirm(mode)}>
              Switch
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

*edit* `ExpressionBuilderShell.tsx` — intercept a dataverse connect when rules exist: compute the diff,
show the dialog, then apply with keep (default; orphans flagged by T16) or remove. Replace the table
picker's `onConfirm` body to route through the switch dialog when `document.root` has rules.

### Task 19: Schema drift on refresh

**Description:** On Refresh, diff new vs cached fields; apply additions/changes silently, route removals that
affect rules to the orphan flow, and show a drift summary. Optionally wire delta detection via
`dataverseAPI.execute(RetrieveMetadataChanges)` behind a flag. (Wireframe C.4, Rec §5.5–5.6)

**Acceptance criteria:**
- [ ] Refresh that adds/changes/removes fields shows the summary; removed-and-used fields become orphans.
- [ ] `ExpiredVersionStamp` (delta path only) is caught → cache rebuilt with no stamp; user sees only a spinner.

**Verification:**
- [ ] `npx vitest run packages/builder-ui` — drift summary + removed-field→orphan routing
- [ ] Manual: simulate changed metadata via mock adapter → summary appears

**Dependencies:** T15, T16
**Files likely touched:** `packages/builder-ui/src/workbench/SourceUpdatedDialog.tsx` (new), `packages/builder-ui/src/importExport/metadataCache.ts`, `packages/platform/src/pptbAdapter.ts`
**Estimated scope:** M

**Code** — *edit* `packages/builder-ui/src/importExport/metadataCache.ts` — add a pure diff function:

```ts
// append to metadataCache.ts

export interface FieldDrift {
  added: FieldDefinition[];
  removed: FieldDefinition[];
  changed: Array<{ before: FieldDefinition; after: FieldDefinition }>;
}

function fieldSignature(field: FieldDefinition): string {
  return JSON.stringify([field.type, field.choices ?? null, field.nullable ?? null, field.path]);
}

/** Diff a previous field set against the freshly discovered one. */
export function diffFields(previous: FieldDefinition[], next: FieldDefinition[]): FieldDrift {
  const prevById = new Map(previous.map((f) => [f.id, f]));
  const nextById = new Map(next.map((f) => [f.id, f]));

  const added = next.filter((f) => !prevById.has(f.id));
  const removed = previous.filter((f) => !nextById.has(f.id));
  const changed: FieldDrift['changed'] = [];

  for (const after of next) {
    const before = prevById.get(after.id);
    if (before && fieldSignature(before) !== fieldSignature(after)) {
      changed.push({ before, after });
    }
  }
  return { added, removed, changed };
}
```
(add `import type { FieldDefinition } from '@ryanmakes/eb_engine';` at the top of the file.)

*new file* `packages/builder-ui/src/workbench/SourceUpdatedDialog.tsx`:

```tsx
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDrift } from '../importExport/metadataCache';

export interface SourceUpdatedDialogProps {
  open: boolean;
  drift: FieldDrift;
  /** Removed fields that are referenced by rules (become orphans). */
  removedInUse: string[];
  onClose: () => void;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: '360px' },
  line: { color: tokens.colorNeutralForeground2 },
});

export function SourceUpdatedDialog({ open, drift, removedInUse, onClose }: SourceUpdatedDialogProps) {
  const styles = useStyles();
  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? onClose() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Source updated</DialogTitle>
          <DialogContent className={styles.body}>
            <Text className={styles.line}>{drift.added.length} added</Text>
            <Text className={styles.line}>{drift.changed.length} changed</Text>
            <Text className={styles.line}>{drift.removed.length} removed</Text>
            {removedInUse.length > 0 ? (
              <Text>
                {removedInUse.length} removed field{removedInUse.length === 1 ? '' : 's'} are used by rules and
                are now flagged as unknown: {removedInUse.join(', ')}.
              </Text>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>
              Got it
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

Shell `onRefresh` flow: read previous `document.fields`, call `discoverCached(..., refresh: true)`,
`diffFields(previous, next)`, apply `next` via `applySource`, compute `removedInUse` =
`removed.filter(f => referencedFieldIds(root).has(f.id))`, open `SourceUpdatedDialog`. Orphans render
automatically via T16.

> **Delta path (optional, flag-gated).** In `pptbAdapter.ts`, wrap the `dv.execute(RetrieveMetadataChanges)`
> call in try/catch; on an `ExpiredVersionStamp` error, discard the stored stamp and fall back to a full
> `discoverFields`. The user sees only the existing refresh spinner.

### Checkpoint: Resilience (after T16–T19)
- [ ] Playwright e2e: author rules → switch source → orphans flagged → remap → valid expression
- [ ] `npm run test:e2e` green; `build`/`test`/`typecheck`/`lint` pass; review with human

---

## Phase 7: Extended importers & polish (Should / Could)

### Task 20: Sample-JSON inference importer
**Description:** Infer `FieldDefinition[]` from a pasted sample record (string/number/boolean, date-ish string→`dateTime`, small distinct string sets→optional `choice`; nested objects→paths). (Rec §3.1)
**Acceptance criteria:** [ ] Sample object yields correct inferred types; nested keys become dotted paths; user can correct types inline.
**Verification:** [ ] `npx vitest run packages/builder-ui` — inference unit tests; [ ] manual paste.
**Dependencies:** T10 · **Files:** `packages/builder-ui/src/importExport/inferFromSample.ts` (new) · **Scope:** M

**Code** — *new file* `packages/builder-ui/src/importExport/inferFromSample.ts`:

```ts
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function inferType(value: unknown): FieldType | null {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return ISO_DATE.test(value.trim()) ? 'dateTime' : 'string';
  return null; // null/array/object handled by caller
}

function titleCase(segment: string): string {
  return segment.replace(/[_\-.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/**
 * Infer fields from a single sample record. Nested objects flatten to dotted paths.
 * Arrays are skipped (no element model). Returns `source: 'json'` fields.
 */
export function inferFieldsFromSample(record: Record<string, unknown>, prefix: string[] = []): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  for (const [key, value] of Object.entries(record)) {
    const path = [...prefix, key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      fields.push(...inferFieldsFromSample(value as Record<string, unknown>, path));
      continue;
    }
    const type = inferType(value);
    if (type === null) continue; // skip null/array — let the user add manually
    fields.push({
      id: path.join('.'),
      label: titleCase(key),
      type,
      path,
      source: 'json',
    });
  }
  return fields;
}

/** Parse a pasted sample object string into inferred fields. */
export function parseSampleRecord(source: string): FieldDefinition[] | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { error: 'JSON is not valid.' };
  }
  const record = Array.isArray(value) ? value[0] : value;
  if (typeof record !== 'object' || record === null) {
    return { error: 'Expected a JSON object (or an array of objects).' };
  }
  return inferFieldsFromSample(record as Record<string, unknown>);
}
```

### Task 21: JSON Schema importer
**Description:** Map JSON Schema `type`/`format`/`enum` to `FieldType` (`enum`→`choice`, `format:date-time`→`dateTime`). (Rec §3.1)
**Acceptance criteria:** [ ] Valid schema maps properties→fields; enums→choices; unsupported→`string` with warning.
**Verification:** [ ] `npx vitest run packages/builder-ui` — mapping tests.
**Dependencies:** T10 · **Files:** `packages/builder-ui/src/importExport/jsonSchemaImport.ts` (new) · **Scope:** S

**Code** — *new file* `packages/builder-ui/src/importExport/jsonSchemaImport.ts`:

```ts
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

interface JsonSchemaProperty {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  title?: string;
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>;
}

export interface JsonSchemaImportResult {
  fields: FieldDefinition[];
  warnings: string[];
}

function primaryType(type: string | string[] | undefined): string | undefined {
  if (Array.isArray(type)) return type.find((t) => t !== 'null');
  return type;
}

function mapType(prop: JsonSchemaProperty, warnings: string[], key: string): FieldType {
  if (Array.isArray(prop.enum) && prop.enum.length > 0) return 'choice';
  const t = primaryType(prop.type);
  if (t === 'integer' || t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'string') return prop.format === 'date-time' || prop.format === 'date' ? 'dateTime' : 'string';
  warnings.push(`Property "${key}" has unsupported type "${String(prop.type)}" — defaulted to string.`);
  return 'string';
}

export function importJsonSchema(source: string): JsonSchemaImportResult | { error: string } {
  let schema: JsonSchema;
  try {
    schema = JSON.parse(source) as JsonSchema;
  } catch {
    return { error: 'JSON is not valid.' };
  }
  if (!schema.properties || typeof schema.properties !== 'object') {
    return { error: 'Schema has no "properties" object.' };
  }

  const warnings: string[] = [];
  const fields: FieldDefinition[] = Object.entries(schema.properties).map(([key, prop]) => {
    const type = mapType(prop, warnings, key);
    const field: FieldDefinition = {
      id: key,
      label: prop.title ?? key,
      type,
      path: [key],
      source: 'jsonSchema',
    };
    if (type === 'choice' && Array.isArray(prop.enum)) {
      field.choices = prop.enum.map((v) => String(v));
    }
    return field;
  });

  return { fields, warnings };
}
```

### Task 22: CSV header importer
**Description:** First row→labels/ids; types inferred from a sampled data row or defaulted to `string`, with inline correction. (Rec §3.1)
**Acceptance criteria:** [ ] Headers become fields; types inferred or defaulted; flat paths only.
**Verification:** [ ] `npx vitest run packages/builder-ui` — header parse + type inference.
**Dependencies:** T10 · **Files:** `packages/builder-ui/src/importExport/csvImport.ts` (new) · **Scope:** S

**Code** — *new file* `packages/builder-ui/src/importExport/csvImport.ts`:

```ts
import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** Minimal RFC-4180-ish single line splitter (handles quoted commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function inferCell(value: string | undefined): FieldType {
  if (value === undefined || value === '') return 'string';
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value))) return 'number';
  if (ISO_DATE.test(value)) return 'dateTime';
  return 'string';
}

function slug(label: string): string {
  return label.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '') || 'field';
}

/** Parse CSV header (+ optional first data row for type inference) into fields. */
export function importCsv(source: string): FieldDefinition[] | { error: string } {
  const lines = source.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { error: 'CSV is empty.' };

  const headers = splitCsvLine(lines[0]);
  const sample = lines.length > 1 ? splitCsvLine(lines[1]) : [];
  const seen = new Set<string>();

  return headers.map((header, index) => {
    let id = slug(header);
    while (seen.has(id)) id = `${id}_${index}`;
    seen.add(id);
    return {
      id,
      label: header || `Column ${index + 1}`,
      type: inferCell(sample[index]),
      path: [id],
      source: 'csv',
    };
  });
}
```

> These three importers feed the same `onImport(fields, label)` path as T10. Add tabs/sub-menus to
> `ImportSchemaDialog` (Native JSON / Sample record / JSON Schema / CSV) selecting the parser; the
> preview + diagnostics UI is unchanged.

### Task 23: First-run onboarding + accessibility pass
**Description:** One-time onboarding panel (Rec §4.3) and an a11y sweep of new dialogs/menus (focus traps, roving tabindex, aria for connection state and orphan badges). (Risk R8)
**Acceptance criteria:** [ ] Onboarding shows once, dismissal persists; [ ] new dialogs keyboard-navigable; connection state and orphan badges have accessible text.
**Verification:** [ ] add axe checks to component tests; [ ] `npm run test:e2e` keyboard-nav spec; [ ] `npm run lint`.
**Dependencies:** T8–T13 · **Files:** `packages/builder-ui/src/workbench/OnboardingPanel.tsx` (new) + a11y fixes across new dialogs · **Scope:** M

**Code** — *new file* `packages/builder-ui/src/workbench/OnboardingPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { PlatformSettings } from '@ryanmakes/eb_platformadapter';

const SEEN_KEY = 'eb.onboarding.seen.v1';

export interface OnboardingPanelProps {
  settings: PlatformSettings;
}

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, maxWidth: '440px' },
});

export function OnboardingPanel({ settings }: OnboardingPanelProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void settings.get(SEEN_KEY).then((seen) => {
      if (active && !seen) setOpen(true);
    });
    return () => {
      active = false;
    };
  }, [settings]);

  const dismiss = () => {
    setOpen(false);
    void settings.set(SEEN_KEY, '1');
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => (!d.open ? dismiss() : undefined)}>
      <DialogSurface aria-describedby="eb-onboarding-desc">
        <DialogBody>
          <DialogTitle>Welcome to the Expression Builder</DialogTitle>
          <DialogContent className={styles.body} id="eb-onboarding-desc">
            <Text>Pick a data source to begin: connect a Dataverse table, import a schema, add fields manually, or load samples.</Text>
            <Text size={200}>You can switch sources anytime from the source menu in the toolbox.</Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={dismiss}>
              Get started
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

A11y checklist for the new components (Fluent v9 provides focus traps + ARIA on `Dialog`/`Menu`; the
remaining work is ours):
- Orphan badge: `aria-label="Unknown field"` (done in T16) and not color-only — keep the ⚠ glyph + text.
- Connection dot: `role="img"` + `aria-label` (done in `SourceChip`).
- Table picker rows: `role="option"` + `aria-selected` + `tabIndex={0}` + Enter/Space handlers (done in T13).
- Add axe to a shared test util and assert no violations on `ImportSchemaDialog`, `TablePickerDialog`,
  `SwitchSourceDialog`, `RemapFieldDialog`:

```ts
import { axe } from 'vitest-axe';
// const { container } = render(<FluentProvider theme={webLightTheme}>…</FluentProvider>);
// expect(await axe(container)).toHaveNoViolations();
```

Mount `<OnboardingPanel settings={adapter.settings} />` once inside `ExpressionBuilderShell` (alongside
the other dialogs).

### Checkpoint: Complete
- [ ] All MoSCoW **Must** + **Should** tasks done; **Could** items (T20–T22) as scoped
- [ ] Full `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck` green
- [ ] Docs updated (`adapter-contract.md`, `architecture.md` note on source ownership)
- [ ] Ready for review

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Host runs below v1.0.17 / doesn't inject `dataverseAPI` | High | Feature-detect; keep discovery methods optional; degrade to import + the existing notification (T5). |
| Schema drift orphans saved expressions | High | Orphan-flag + remap, never silent-drop (T16–T19); reuse `UNKNOWN_FIELD`. |
| Backward-compat break on saved docs | High | All `FieldDefinition` additions optional; v1→v2 upgrade-on-load with round-trip tests (T1, T4). |
| Large environments slow discovery | Med | Search-first lazy picker, lazy related, time-based cache (T13–T15). |
| Multi-value/lookup fidelity loss | Med | Explicit §6.1 mapping with flags; File/Image omitted (T2). |
| Fluent v9 dialog/menu a11y gaps | Med | Build on Fluent primitives; dedicated a11y task + axe checks (T23). |
| Scope creep to multi-table joins | Med | Hold one-primary-table decision; related = flattened paths (architecture decision). |

## Open Questions

1. Does the PPTB host inject `dataverseAPI` into the builder's `window`/context the same way as `toolboxAPI`, and what minimum host version do we target? (metadata v1.0.17, CSDL v1.0.20)
2. Related-field path form: Dataverse expand syntax (`ownerid/fullname`) vs `_value`? Depends on real `triggerBody()` lookup shapes; `getAttributeODataType` can disambiguate.
3. Bump `QueryDocument.version` to 2 now (clean migration) vs keep optional under v1? Plan assumes the bump (T4).
4. Is the time-based cache sufficient for v1, or do we want delta detection via `dataverseAPI.execute(RetrieveMetadataChanges)` from the start? (T15/T19)
5. Should "Load sample fields" remain shipped in production builds, or be dev-only?

## Parallelization Notes

- After the Phase 1 checkpoint, **T5 (PPTB adapter)** and **T6 (web adapter)** can run in parallel.
- In Phase 4, **T10/T11** are independent slices; **T12** needs one of them.
- Phase 5 (Dataverse UX) and Phase 4 (non-Dataverse) are largely independent once T8 lands, given the shared contract.
- Phase 6 must be sequential (T16→T17→T18/T19) — shared canvas/source state.

## Implementer Notes (anti-drift)

- **Fluent v9 only** for new chrome: import from `@fluentui/react-components` / `@fluentui/react-icons`;
  style with `makeStyles` + `tokens` (longhand properties, `mergeClasses`) — never hardcode colors/px.
  Existing `eb-*` CSS classes stay for the canvas/toolbox shell that already uses them.
- **Import shared types, don't re-declare.** See the *Shared Type Contract* table. `FieldDefinition`
  changes exactly once (T1); `DataSourceKind` lists `'profile'` from T4 (T12 only verifies it).
- **No silent samples.** Sample fields load only via the explicit "Load sample fields" action (T9),
  tagged `source:'sample'`.
- **Adapter optional methods** are always called with `?.` and a sane fallback; the builder must run
  on a host that implements none of them.
- **Tests colocate** with new modules (`*.test.ts(x)`); run the scoped `npx vitest run <path>` shown in
  each task before the package-wide suite.
