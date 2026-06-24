import type { FieldDefinition } from '@ryanmakes/eb_engine';

export type PlatformTheme = 'light' | 'dark' | 'highContrast';
export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

export interface PlatformSettings {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** A selectable data source the host can enumerate (e.g. a Dataverse connection). */
export interface DataSourceRef {
  id: string;
  label: string;
  kind: 'dataverse' | 'sharepoint' | 'sql';
}

/** A table/entity within a data source. */
export interface TableRef {
  /** Logical/internal name used for discovery calls. */
  logicalName: string;
  /** Human-readable display name. */
  displayName: string;
  /** OData entity set name when known (Dataverse). */
  entitySetName?: string;
  /** True for system/managed tables, hidden by default in pickers. */
  isSystem?: boolean;
}

export interface RelatedTableRef {
  /** Navigation property name used as the path prefix (e.g. 'ownerid'). */
  navigationProperty: string;
  /** Related table logical name. */
  table: string;
  /** Display label for the section header. */
  displayName: string;
  relationshipType: 'OneToMany' | 'ManyToOne';
}

export interface DiscoverFieldsOptions {
  /** Source id from listDataSources; omit for the host default. */
  sourceId?: string;
  /** Logical name of the table to discover; omit to use host's current table. */
  table?: string;
  /** When true, also surface one-hop related navigation properties. */
  includeRelated?: boolean;
  /** Bypass any adapter-side cache. */
  refresh?: boolean;
}

export interface DiscoverFieldsResult {
  fields: FieldDefinition[];
  /** Echo of the table the fields belong to, when applicable. */
  table?: TableRef;
  /** Epoch ms the metadata was produced/fetched. */
  fetchedAt?: number;
}

export interface PlatformAdapter {
  copyToClipboard(text: string): Promise<void>;
  notify(message: string, level: NotificationLevel): Promise<void>;
  getTheme(): Promise<PlatformTheme>;
  onThemeChanged(handler: (theme: PlatformTheme) => void): () => void;
  settings: PlatformSettings;

  /** Enumerate selectable sources. Optional — absent hosts are import-only. */
  listDataSources?(): Promise<DataSourceRef[]>;
  /** List tables for a source. Optional — absent hosts hide the table picker. */
  getTables?(sourceId?: string): Promise<TableRef[]>;
  /** Source-agnostic field discovery. Optional — absent hosts degrade to import/manual. */
  discoverFields?(options?: DiscoverFieldsOptions): Promise<DiscoverFieldsResult>;
  /** One-hop related navigation properties for a table. Optional. */
  getRelatedTables?(table: string): Promise<RelatedTableRef[]>;
  /** Discover a single relationship's columns as flattened, dotted-path fields. Optional. */
  discoverRelatedFields?(table: string, navigationProperty: string): Promise<DiscoverFieldsResult>;

  /**
   * @deprecated Use discoverFields({}) instead.
   */
  getDataverseFields(): Promise<unknown[]>;
}
