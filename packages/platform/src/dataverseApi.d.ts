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
