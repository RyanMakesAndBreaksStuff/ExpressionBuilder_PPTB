import type { ExpressionMode } from '@ryanmakes/eb_engine';
import type { DockSide, ModeContext, WorkbenchState } from './types';

export function getDefaultWorkbenchState(): WorkbenchState {
  return {
    leftDockCollapsed: false,
    rightDockCollapsed: false,
    previewCollapsed: false,
    leftTab: 'dynamicContent',
    rightTab: 'diagnostics',
    copyState: 'idle',
  };
}

export function toggleDock(state: WorkbenchState, side: DockSide): WorkbenchState {
  return side === 'left'
    ? { ...state, leftDockCollapsed: !state.leftDockCollapsed }
    : { ...state, rightDockCollapsed: !state.rightDockCollapsed };
}

export function togglePreview(state: WorkbenchState): WorkbenchState {
  return { ...state, previewCollapsed: !state.previewCollapsed };
}

export function getModeContext(mode: ExpressionMode): ModeContext {
  if (mode === 'filterArray') {
    return {
      label: 'Filter array',
      expression: "item()?['FieldName']",
      note: 'Filter array mode evaluates each array item, so field references are rooted at item().',
    };
  }

  return {
    label: 'Trigger condition',
    expression: "triggerBody()?['FieldName']",
    note: 'Trigger condition mode evaluates trigger payload fields, so field references are rooted at triggerBody().',
  };
}
