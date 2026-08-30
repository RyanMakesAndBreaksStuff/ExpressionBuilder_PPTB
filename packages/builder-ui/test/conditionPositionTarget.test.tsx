// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dragState = vi.hoisted(() => ({
  source: null as { data: unknown } | null,
  isDropTarget: false,
}));

vi.mock('@dnd-kit/react', () => ({
  useDragOperation: () => ({
    source: dragState.source,
    target: null,
  }),
  useDroppable: () => ({
    isDropTarget: dragState.isDropTarget,
    ref: () => undefined,
  }),
}));

import { ConditionPositionTarget } from '../src/workbench/ConditionPositionTarget';

beforeEach(() => {
  dragState.source = null;
  dragState.isDropTarget = false;
});

afterEach(() => cleanup());

describe('ConditionPositionTarget', () => {
  const renderTarget = (ancestorGroupIds: readonly string[] = ['root']) =>
    render(
      <ConditionPositionTarget
        groupId="root"
        groupLabel="AND group root"
        ancestorGroupIds={ancestorGroupIds}
        index={1}
        positionCount={3}
      />,
    );

  it('keeps inactive positions neutral', () => {
    const { container } = renderTarget();

    const target = container.querySelector('[role="separator"]');
    expect(target).not.toBeNull();
    expect(target).toHaveAttribute('aria-hidden', 'true');
    expect(target).toHaveAttribute(
      'aria-label',
      'Insert at position 2 of 3 in AND group root',
    );
    expect(target).not.toHaveClass('is-active');
    expect(target).not.toHaveClass('is-valid-drop');
    expect(target).not.toHaveClass('is-invalid-drop');
    expect(target).not.toHaveClass('is-ineligible');
    expect(target).not.toHaveAttribute('aria-disabled');
  });

  it('marks an eligible hovered position as an enabled drop target', () => {
    dragState.source = {
      data: { kind: 'toolbox-field', fieldId: 'Status' },
    };
    dragState.isDropTarget = true;
    renderTarget();

    const target = screen.getByRole('separator');
    expect(target).not.toHaveAttribute('aria-hidden');
    expect(target).toHaveClass('is-active', 'is-valid-drop', 'is-drop-target');
  });

  it('accepts a node dragged in from another group', () => {
    // Issue #9: a rule created outside a group could never be moved into one.
    dragState.source = {
      data: {
        kind: 'condition-node',
        nodeId: 'rule-status',
        parentGroupId: 'other-group',
        sourceIndex: 0,
      },
    };
    dragState.isDropTarget = true;
    renderTarget();

    const target = screen.getByRole('separator');
    expect(target).toHaveClass('is-active', 'is-valid-drop', 'is-drop-target');
    expect(target).not.toHaveClass('is-ineligible');
  });

  it('marks a position inside the dragged group itself as ineligible', () => {
    // The one genuinely illegal cross-group target. This component sees a
    // single group and the drag metadata carries no tree, so only the ancestor
    // chain can rule it out before the drop is attempted.
    dragState.source = {
      data: {
        kind: 'condition-node',
        nodeId: 'group-outer',
        parentGroupId: 'root',
        sourceIndex: 0,
      },
    };
    dragState.isDropTarget = true;
    renderTarget(['root', 'group-outer']);

    const target = screen.getByRole('separator');
    expect(target).toHaveClass('is-active', 'is-ineligible');
    expect(target).not.toHaveClass('is-valid-drop');
    expect(target).not.toHaveClass('is-invalid-drop');
    expect(target).not.toHaveClass('is-drop-target');
  });

  it('marks a same-group no-op position as invalid', () => {
    dragState.source = {
      data: {
        kind: 'condition-node',
        nodeId: 'rule-status',
        parentGroupId: 'root',
        sourceIndex: 0,
      },
    };
    renderTarget();

    const target = screen.getByRole('separator');
    expect(target).toHaveClass('is-active', 'is-invalid-drop');
    expect(target).not.toHaveClass('is-ineligible');
    expect(target).not.toHaveClass('is-valid-drop');
  });
});
