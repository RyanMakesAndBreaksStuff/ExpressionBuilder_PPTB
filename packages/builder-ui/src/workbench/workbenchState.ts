import type { ExpressionMode } from '@ryanmakes/eb_engine';
import type { DockSide, ModeContext, WorkbenchState } from './types';

/**
 * Must match the stacked-layout breakpoint in `theme/tokens.css`. Below it the
 * three columns become one flex column and a collapsed dock renders as a 38px
 * horizontal bar rather than the desktop vertical rail.
 */
export const STACKED_LAYOUT_QUERY = '(max-width: 900px)';

/**
 * Read once, at mount, by the shell. Deliberately not reactive: a resize
 * listener that re-applied the collapse would override a deliberate expand by
 * the user, and the only case it would catch is a desktop window dragged below
 * 900px mid-session — where the docks are still usable and the toolbox height
 * cap already keeps the canvas reachable.
 */
export function isStackedViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(STACKED_LAYOUT_QUERY).matches;
}

export interface WorkbenchDefaults {
  /** Phone-width first paint — see `isStackedViewport`. */
  stacked?: boolean;
  /** Whether the starting document already has fields to build rules from. */
  hasFields?: boolean;
}

/**
 * Stacked, both docks start collapsed so the canvas owns the viewport instead
 * of sitting below two full-height panes. They stay one tap away as horizontal
 * bars.
 *
 * The Toolbox is the exception when there are no fields yet: collapsing a
 * DockPane unmounts its body, and the left one holds both SourceChip (the only
 * route to Import schema / Add field / Load samples) and the first-run
 * GetStartedPanel. Collapsed on an empty document, a phone user lands on an
 * empty canvas with no visible way to fill it. With fields already present those
 * entry points are recoverable — the rules are the point, and the Toolbox is one
 * tap away.
 */
export function getDefaultWorkbenchState({ stacked = false, hasFields = false }: WorkbenchDefaults = {}): WorkbenchState {
  return {
    leftDockCollapsed: stacked && hasFields,
    rightDockCollapsed: stacked,
    previewCollapsed: false,
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
