import type {
  Conjunction,
  ExpressionMode,
  FieldDefinition,
  FormatDiagnostic,
} from '@pavb/engine';
import type { QueryGroup, QueryRule, RulePatch } from '../composer/querySchema';

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
  theme: 'light' | 'dark';
  onModeChange: (mode: ExpressionMode) => void;
  onImport: () => void;
  onExport: () => void;
  onToggleTheme: () => void;
  onCopyExpression: () => void;
}

export interface FieldToolboxPaneProps {
  fields: FieldDefinition[];
  activeTab: LeftWorkbenchTab;
  collapsed: boolean;
  onTabChange: (tab: LeftWorkbenchTab) => void;
  onToggleCollapsed: () => void;
  onConnect: () => void;
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
