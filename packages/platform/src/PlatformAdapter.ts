import type { FieldDefinition } from '@ryanmakes/eb_engine';

export type PlatformTheme = 'light' | 'dark' | 'highContrast';
export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

export interface PlatformSettings {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
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
  /** Logical name of the table to discover; omit to use host's current table. */
  table?: string;
  /** When true, also surface one-hop related navigation properties. */
  includeRelated?: boolean;
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

  /** List tables. Optional — absent hosts hide the table picker. */
  getTables?(): Promise<TableRef[]>;
  /** Source-agnostic field discovery. Optional — absent hosts degrade to import/manual. */
  discoverFields?(options?: DiscoverFieldsOptions): Promise<DiscoverFieldsResult>;
  /** One-hop related navigation properties for a table. Optional. */
  getRelatedTables?(table: string): Promise<RelatedTableRef[]>;
  /** Discover a single relationship's columns as flattened, dotted-path fields. Optional. */
  discoverRelatedFields?(table: string, navigationProperty: string): Promise<DiscoverFieldsResult>;

  /**
   * Opaque scope for authenticated metadata caching, or `null` when the active
   * environment cannot be verified. `null` means skip persistent cache reads and
   * writes and continue with fresh discovery — it must not block that discovery.
   * The string is an internal cache discriminator. Do not log or display it.
   */
  getMetadataCacheScope?(): Promise<string | null>;

  /**
   * @deprecated Use discoverFields({}) instead.
   */
  getDataverseFields(): Promise<unknown[]>;
}
