import { describe, expect, it } from 'vitest';
import {
  getDefaultWorkbenchState,
  getModeContext,
  toggleDock,
  togglePreview,
} from '../src/workbench/workbenchState';

describe('workbenchState', () => {
  it('starts with expanded docks, visible preview, and diagnostics support tab', () => {
    expect(getDefaultWorkbenchState()).toEqual({
      leftDockCollapsed: false,
      rightDockCollapsed: false,
      previewCollapsed: false,
      rightTab: 'diagnostics',
      copyState: 'idle',
    });
  });

  it('starts with both docks collapsed on a stacked viewport that already has fields', () => {
    expect(getDefaultWorkbenchState({ stacked: true, hasFields: true })).toMatchObject({
      leftDockCollapsed: true,
      rightDockCollapsed: true,
      previewCollapsed: false,
    });
  });

  it('keeps the toolbox open on a stacked viewport with no fields yet', () => {
    // Collapsing it would unmount SourceChip and GetStartedPanel, leaving a
    // phone user no visible route to import or add fields.
    expect(getDefaultWorkbenchState({ stacked: true, hasFields: false })).toMatchObject({
      leftDockCollapsed: false,
      rightDockCollapsed: true,
    });
  });

  it('toggles individual dock and preview state without changing unrelated state', () => {
    const state = getDefaultWorkbenchState();

    expect(toggleDock(state, 'left')).toMatchObject({ leftDockCollapsed: true, rightDockCollapsed: false });
    expect(toggleDock(state, 'right')).toMatchObject({ leftDockCollapsed: false, rightDockCollapsed: true });
    expect(togglePreview(state)).toMatchObject({ previewCollapsed: true });
  });

  it('returns the correct Power Automate field reference context for each mode', () => {
    expect(getModeContext('triggerCondition').expression).toBe("triggerBody()?['FieldName']");
    expect(getModeContext('filterArray').expression).toBe("item()?['FieldName']");
  });
});
