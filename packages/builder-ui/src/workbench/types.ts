import type {
  Conjunction,
  ExpressionMode,
  FieldDefinition,
  FormatDiagnostic,
} from '@ryanmakes/eb_engine';

import type { PaletteId } from '../theme/workbenchTokens';
import type { DataSourceDescriptor, QueryGroup, QueryRule, RulePatch } from '../composer/querySchema';

export type LeftWorkbenchTab = 'dynamicContent' | 'wrappers';
export type RightWorkbenchTab = 'diagnostics' | 'modeContext';
export type DockSide = 'left' | 'right';
export type CopyState = 'idle' | 'copied';

export interface WorkbenchState {
  leftDockCollapsed: boolean;
  rightDockCollapsed: boolean;
  previewCollapsed: boolean;
  leftTab: LeftWorkbenchTab;
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
  paletteId: PaletteId;
  onModeChange: (mode: ExpressionMode) => void;
  onImport: () => void;
  onExport: () => void;
  onToggleTheme: () => void;
  onCopyExpression: () => void;
}

export interface FieldToolboxPaneProps {
  fields: FieldDefinition[];
  source: DataSourceDescriptor;
  activeTab: LeftWorkbenchTab;
  collapsed: boolean;
  onTabChange: (tab: LeftWorkbenchTab) => void;
  onToggleCollapsed: () => void;
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
  onManageProfiles: () => void;
  onRefresh: () => void;
  /** Related navigation sections available for the active dataverse table (T14). */
  relatedSections?: Array<{ navigationProperty: string; displayName: string }>;
  /** Called once when a related section is first expanded; resolves and appends its fields. */
  onExpandRelated?: (navigationProperty: string) => void;
}

export interface ConditionCanvasProps {
  root: QueryGroup;
  fields: FieldDefinition[];
  mode: ExpressionMode;
  selectedRuleId?: string;
  onSelectRule: (ruleId: string) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onChangeGroupConjunction: (groupId: string, conjunction: Conjunction) => void;
  onUpdateRule: (ruleId: string, patch: RulePatch) => void;
  onDuplicateRule: (ruleId: string) => void;
  onDeleteNode: (nodeId: string) => void;
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
}
g) => void;
}
