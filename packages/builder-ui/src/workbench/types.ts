import type {
  Conjunction,
  ExpressionMode,
  FieldDefinition,
  FormatDiagnostic,
} from '@ryanmakes/eb_engine';
import type { ReactNode } from 'react';

import type { DataSourceDescriptor, QueryGroup, QueryRule, RulePatch } from '../composer/querySchema';

export type RightWorkbenchTab = 'diagnostics' | 'modeContext';
export type DockSide = 'left' | 'right';
export type CopyState = 'idle' | 'copied';

export interface WorkbenchState {
  leftDockCollapsed: boolean;
  rightDockCollapsed: boolean;
  previewCollapsed: boolean;
  rightTab: RightWorkbenchTab;
  copyState: CopyState;
}

export interface ModeContext {
  label: string;
  expression: string;
  note: string;
}

export interface WorkbenchHeaderProps {
  mode: ExpressionMode;
  onModeChange: (mode: ExpressionMode) => void;
  onImport: () => void;
  onExport: () => void;
}

export interface FieldToolboxPaneProps {
  fields: FieldDefinition[];
  source: DataSourceDescriptor;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
  onManageProfiles: () => void;
  onRefresh: () => void;
  /** Whether the host can connect to a live table (Dataverse). Web builds cannot. */
  canConnectTable?: boolean;
  /** Related navigation sections available for the active dataverse table (T14). */
  relatedSections?: Array<{ navigationProperty: string; displayName: string }>;
  /** Called once when a related section is first expanded; resolves and appends its fields. */
  onExpandRelated?: (navigationProperty: string) => void;
  /** Called when the user clicks a field row in the toolbox. */
  onCreateRuleFromField?: (field: FieldDefinition) => void;
}

export interface ConditionCanvasProps {
  root: QueryGroup;
  fields: FieldDefinition[];
  mode: ExpressionMode;
  selectedRuleId?: string;
  /** Group that new rules/groups/fields are added to; shown with a focus outline. */
  activeGroupId?: string;
  onSelectRule: (ruleId: string) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  /** Marks a group (empty or not) as the active target for new rules/groups/fields. */
  onFocusGroup: (groupId: string) => void;
  onChangeGroupConjunction: (groupId: string, conjunction: Conjunction) => void;
  onUpdateRule: (ruleId: string, patch: RulePatch) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  /** Reorders a rule or nested group within its current parent only. */
  onReorderNode: (nodeId: string, parentGroupId: string, finalIndex: number) => void;
  /** Wipes all children from the root group, resetting the canvas to empty. */
  onClear: () => void;
  /** Called when the user clicks "Remap…" on an orphaned rule (T16/T17). */
  onRequestRemap?: (ruleId: string) => void;
}

export interface ExpressionDocumentPanelProps {
  expression: string;
  collapsed: boolean;
  copyState: CopyState;
  onToggleCollapsed: () => void;
  onCopy: () => void;
}

export interface SupportPaneProps {
  mode: ExpressionMode;
  diagnostics: Array<FormatDiagnostic | { severity: 'error' | 'warning'; message: string; code?: string }>;
  activeTab: RightWorkbenchTab;
  collapsed: boolean;
  onTabChange: (tab: RightWorkbenchTab) => void;
  onToggleCollapsed: () => void;
}

export interface RuleRowEditorProps {
  rule: QueryRule;
  fields: FieldDefinition[];
  selected: boolean;
  onSelect: (ruleId: string) => void;
  onUpdate: (ruleId: string, patch: RulePatch) => void;
  onDuplicate: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
  /** Called when the user clicks "Remap…" on an orphaned rule (T16/T17). */
  onRequestRemap?: (ruleId: string) => void;
  parentGroupId?: string;
  sourceIndex?: number;
  siblingCount?: number;
  onReorderNode?: (nodeId: string, parentGroupId: string, finalIndex: number) => void;
}

export interface BuilderDragDropProviderProps {
  children: ReactNode;
  fields: FieldDefinition[];
  root: QueryGroup;
  onInsertField: (fieldId: string, groupId: string, index: number) => void;
  onReorderNode: (nodeId: string, parentGroupId: string, finalIndex: number) => void;
  onMoveNode: (nodeId: string, targetGroupId: string, index: number) => void;
}
