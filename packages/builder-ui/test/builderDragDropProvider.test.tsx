// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DragEndHandler = (event: unknown) => void;

const captured = vi.hoisted(() => ({
  onDragEnd: null as DragEndHandler | null,
}));

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: DragEndHandler;
  }) => {
    captured.onDragEnd = onDragEnd;
    return children;
  },
  PointerSensor: { configure: () => 'pointer-sensor' },
}));

vi.mock('@dnd-kit/dom', () => ({
  Accessibility: { configure: () => 'accessibility' },
  PointerActivationConstraints: {
    Delay: class {},
    Distance: class {},
  },
}));

import { BuilderDragDropProvider } from '../src/workbench/BuilderDragDropProvider';
import { sampleDocument } from '../src/app/sampleData';

const handlers = {
  onInsertField: vi.fn(),
  onReorderNode: vi.fn(),
  onMoveNode: vi.fn(),
};

const drop = (source: unknown, target: unknown, canceled = false) => {
  render(
    <BuilderDragDropProvider
      fields={sampleDocument.fields}
      root={sampleDocument.root}
      {...handlers}
    >
      <div />
    </BuilderDragDropProvider>,
  );

  captured.onDragEnd?.({
    operation: { source: { data: source, handle: null }, target: { data: target } },
    canceled,
  });
};

const position = (groupId: string, index: number) => ({
  kind: 'condition-position',
  groupId,
  index,
});

beforeEach(() => {
  captured.onDragEnd = null;
  for (const handler of Object.values(handlers)) handler.mockReset();
});

afterEach(() => cleanup());

describe('BuilderDragDropProvider dispatch', () => {
  it('routes a cross-group drop to onMoveNode', () => {
    // Issue #9: the model, the document action and the drop targets all
    // supported this independently; nothing connected them, so a rule created
    // outside a group could never be dragged into one.
    drop(
      {
        kind: 'condition-node',
        nodeId: 'rule-status',
        parentGroupId: 'root',
        sourceIndex: 0,
      },
      position('group-routing', 1),
    );

    expect(handlers.onMoveNode).toHaveBeenCalledWith('rule-status', 'group-routing', 1);
    expect(handlers.onReorderNode).not.toHaveBeenCalled();
    expect(handlers.onInsertField).not.toHaveBeenCalled();
  });

  it('still routes a same-group drop to onReorderNode', () => {
    drop(
      {
        kind: 'condition-node',
        nodeId: 'rule-status',
        parentGroupId: 'root',
        sourceIndex: 0,
      },
      position('root', 2),
    );

    expect(handlers.onReorderNode).toHaveBeenCalledWith('rule-status', 'root', 1);
    expect(handlers.onMoveNode).not.toHaveBeenCalled();
  });

  it('routes a toolbox field to onInsertField regardless of the target group', () => {
    drop({ kind: 'toolbox-field', fieldId: 'DueDate' }, position('group-routing', 0));

    expect(handlers.onInsertField).toHaveBeenCalledWith('DueDate', 'group-routing', 0);
    expect(handlers.onMoveNode).not.toHaveBeenCalled();
  });

  it('dispatches nothing for a cancelled drag or an illegal move', () => {
    drop(
      {
        kind: 'condition-node',
        nodeId: 'rule-status',
        parentGroupId: 'root',
        sourceIndex: 0,
      },
      position('group-routing', 1),
      true,
    );

    // A group onto its own separators: shape-valid, rejected against the tree.
    drop(
      {
        kind: 'condition-node',
        nodeId: 'group-routing',
        parentGroupId: 'root',
        sourceIndex: 2,
      },
      position('group-routing', 0),
    );

    for (const handler of Object.values(handlers)) {
      expect(handler).not.toHaveBeenCalled();
    }
  });
});
