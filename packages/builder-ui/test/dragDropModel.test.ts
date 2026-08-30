import { describe, expect, it } from 'vitest';
import {
  conditionNodeDragId,
  conditionPositionDropId,
  formatAccessiblePosition,
  resolveCurrentDragDropCommand,
  resolveDragDropCommand,
  toolboxFieldDragId,
  type ConditionNodeDragMetadata,
  type ConditionPositionDropMetadata,
  type ToolboxFieldDragMetadata,
} from '../src/workbench/dragDropModel';
import { sampleDocument } from '../src/app/sampleData';

const toolboxField = (fieldId = 'account:name'): ToolboxFieldDragMetadata => ({
  kind: 'toolbox-field',
  fieldId,
});

const conditionNode = (
  overrides: Partial<ConditionNodeDragMetadata> = {},
): ConditionNodeDragMetadata => ({
  kind: 'condition-node',
  nodeId: 'rule-status',
  parentGroupId: 'group-main',
  sourceIndex: 1,
  ...overrides,
});

const conditionPosition = (
  overrides: Partial<ConditionPositionDropMetadata> = {},
): ConditionPositionDropMetadata => ({
  kind: 'condition-position',
  groupId: 'group-main',
  index: 0,
  ...overrides,
});

describe('dragDropModel', () => {
  it('resolves a toolbox field drop to an indexed field-insert command', () => {
    expect(
      resolveDragDropCommand({
        source: toolboxField(),
        target: conditionPosition({ groupId: 'group-related', index: 2 }),
      }),
    ).toEqual({
      kind: 'insert-field',
      fieldId: 'account:name',
      groupId: 'group-related',
      index: 2,
    });
  });

  it('resolves an upward sibling node drop to a reorder command', () => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ nodeId: 'rule-owner', sourceIndex: 3 }),
        target: conditionPosition({ index: 1 }),
      }),
    ).toEqual({
      kind: 'reorder-node',
      nodeId: 'rule-owner',
      parentGroupId: 'group-main',
      index: 1,
    });
  });

  it('normalizes a raw boundary index after removing a downward-moving source', () => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ nodeId: 'rule-first', sourceIndex: 0 }),
        target: conditionPosition({ index: 4 }),
      }),
    ).toEqual({
      kind: 'reorder-node',
      nodeId: 'rule-first',
      parentGroupId: 'group-main',
      index: 3,
    });
  });

  it('validates a resolved command against the current fields and condition tree', () => {
    expect(
      resolveCurrentDragDropCommand({
        source: toolboxField('DueDate'),
        target: conditionPosition({ groupId: 'group-routing', index: 1 }),
        fields: sampleDocument.fields,
        root: sampleDocument.root,
      }),
    ).toEqual({
      kind: 'insert-field',
      fieldId: 'DueDate',
      groupId: 'group-routing',
      index: 1,
    });
  });

  it('accepts index zero when a toolbox field is the first rule in an empty group', () => {
    expect(
      resolveCurrentDragDropCommand({
        source: toolboxField('DueDate'),
        target: conditionPosition({ groupId: 'root', index: 0 }),
        fields: sampleDocument.fields,
        root: {
          id: 'root',
          kind: 'group',
          conjunction: 'and',
          children: [],
        },
      }),
    ).toEqual({
      kind: 'insert-field',
      fieldId: 'DueDate',
      groupId: 'root',
      index: 0,
    });
  });

  it.each([
    [
      'a stale field ID',
      {
        source: toolboxField('RemovedField'),
        target: conditionPosition({ groupId: 'root', index: 0 }),
      },
    ],
    [
      'a stale target group',
      {
        source: toolboxField('DueDate'),
        target: conditionPosition({ groupId: 'missing-group', index: 0 }),
      },
    ],
    [
      'an out-of-range target index',
      {
        source: toolboxField('DueDate'),
        target: conditionPosition({ groupId: 'root', index: 99 }),
      },
    ],
    [
      'a stale source index',
      {
        source: conditionNode({
          nodeId: 'rule-status',
          parentGroupId: 'root',
          sourceIndex: 1,
        }),
        target: conditionPosition({ groupId: 'root', index: 3 }),
      },
    ],
  ])('rejects %s against the current document', (_description, input) => {
    expect(
      resolveCurrentDragDropCommand({
        ...input,
        fields: sampleDocument.fields,
        root: sampleDocument.root,
      }),
    ).toBeUndefined();
  });

  it.each([
    ['the boundary before the source', 1],
    ['the boundary immediately after the source', 2],
  ])('rejects a no-op at %s', (_description, targetIndex) => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ sourceIndex: 1 }),
        target: conditionPosition({ index: targetIndex }),
      }),
    ).toBeUndefined();
  });

  it('moves a condition node across parent groups', () => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ parentGroupId: 'group-a' }),
        target: conditionPosition({ groupId: 'group-b', index: 0 }),
      }),
    ).toEqual({
      kind: 'move-node',
      nodeId: 'rule-status',
      targetGroupId: 'group-b',
      index: 0,
    });
  });

  it('does not shift a cross-group index the way a reorder does', () => {
    // A reorder subtracts one when moving down, because removing the node
    // shifts everything after it. A move removes from a different list, so the
    // target index is already correct and the correction would overshoot.
    expect(
      resolveDragDropCommand({
        source: conditionNode({ parentGroupId: 'group-a', sourceIndex: 0 }),
        target: conditionPosition({ groupId: 'group-b', index: 2 }),
      }),
    ).toMatchObject({ kind: 'move-node', index: 2 });

    expect(
      resolveDragDropCommand({
        source: conditionNode({ parentGroupId: 'root', sourceIndex: 0 }),
        target: conditionPosition({ groupId: 'root', index: 2 }),
      }),
    ).toMatchObject({ kind: 'reorder-node', index: 1 });
  });

  it('validates a cross-group move against the current document', () => {
    // group-routing holds two rules, so index 2 appends. A reorder stops one
    // short of the child count; a move may land past the last child.
    expect(
      resolveCurrentDragDropCommand({
        source: conditionNode({
          nodeId: 'rule-status',
          parentGroupId: 'root',
          sourceIndex: 0,
        }),
        target: conditionPosition({ groupId: 'group-routing', index: 2 }),
        fields: sampleDocument.fields,
        root: sampleDocument.root,
      }),
    ).toEqual({
      kind: 'move-node',
      nodeId: 'rule-status',
      targetGroupId: 'group-routing',
      index: 2,
    });

    expect(
      resolveCurrentDragDropCommand({
        source: conditionNode({
          nodeId: 'rule-status',
          parentGroupId: 'root',
          sourceIndex: 0,
        }),
        target: conditionPosition({ groupId: 'group-routing', index: 3 }),
        fields: sampleDocument.fields,
        root: sampleDocument.root,
      }),
    ).toBeUndefined();
  });

  it('refuses to drop a group inside itself or its own descendants', () => {
    const nested = {
      id: 'root',
      kind: 'group' as const,
      conjunction: 'and' as const,
      children: [
        {
          id: 'group-outer',
          kind: 'group' as const,
          conjunction: 'and' as const,
          children: [
            {
              id: 'group-inner',
              kind: 'group' as const,
              conjunction: 'or' as const,
              children: [],
            },
          ],
        },
      ],
    };

    for (const groupId of ['group-outer', 'group-inner']) {
      expect(
        resolveCurrentDragDropCommand({
          source: conditionNode({
            nodeId: 'group-outer',
            parentGroupId: 'root',
            sourceIndex: 0,
          }),
          target: conditionPosition({ groupId, index: 0 }),
          fields: sampleDocument.fields,
          root: nested,
        }),
      ).toBeUndefined();
    }
  });

  it('still rejects a same-group no-op rather than treating it as a move', () => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ parentGroupId: 'root', sourceIndex: 1 }),
        target: conditionPosition({ groupId: 'root', index: 1 }),
      }),
    ).toBeUndefined();
  });

  it('rejects a drop whose target is the dragged node instead of a position', () => {
    const source = conditionNode();

    expect(resolveDragDropCommand({ source, target: source })).toBeUndefined();
  });

  it.each([
    ['missing source', { target: conditionPosition() }],
    ['missing target', { source: toolboxField() }],
    [
      'cancelled operation',
      { source: toolboxField(), target: conditionPosition(), cancelled: true },
    ],
    [
      'unknown source kind',
      { source: { kind: 'unknown', fieldId: 'Status' }, target: conditionPosition() },
    ],
    [
      'missing field ID',
      { source: { kind: 'toolbox-field' }, target: conditionPosition() },
    ],
    [
      'empty node ID',
      { source: conditionNode({ nodeId: '' }), target: conditionPosition() },
    ],
    [
      'fractional source index',
      { source: conditionNode({ sourceIndex: 0.5 }), target: conditionPosition() },
    ],
    [
      'unknown target kind',
      {
        source: toolboxField(),
        target: { kind: 'condition-group', groupId: 'group-main', index: 0 },
      },
    ],
    [
      'missing target group',
      {
        source: toolboxField(),
        target: { kind: 'condition-position', index: 0 },
      },
    ],
    [
      'negative target index',
      { source: toolboxField(), target: conditionPosition({ index: -1 }) },
    ],
  ])('rejects malformed or incomplete metadata: %s', (_description, input) => {
    expect(resolveDragDropCommand(input)).toBeUndefined();
  });

  it('creates stable, namespaced IDs for every drag/drop role', () => {
    expect(toolboxFieldDragId('account:name')).toBe('toolbox-field:account%3Aname');
    expect(conditionNodeDragId('rule:status')).toBe('condition-node:rule%3Astatus');
    expect(conditionPositionDropId('group:main', 'rule:status')).toBe(
      'condition-position:group%3Amain:rule%3Astatus',
    );
    expect(conditionPositionDropId('group:main', undefined)).toBe(
      'condition-position:group%3Amain:end',
    );
  });

  // Regression: positional ids collided on insert, so registering a new
  // separator evicted an existing one (and destroyed its re-register effect),
  // permanently dropping it from dnd-kit's registry. Identity-keyed ids must
  // stay stable for a node that merely shifts position.
  it('keeps drop-target IDs stable when a node shifts position', () => {
    const before = ['a', 'b'].map((id) => conditionPositionDropId('root', id));
    const afterInsertAtZero = ['x', 'a', 'b'].map((id) =>
      conditionPositionDropId('root', id),
    );

    expect(new Set(afterInsertAtZero).size).toBe(3);
    for (const id of before) {
      expect(afterInsertAtZero).toContain(id);
    }
    expect(conditionPositionDropId('root', undefined)).not.toBe(before[0]);
  });

  it('formats zero-based indices as one-based accessible position labels', () => {
    expect(formatAccessiblePosition(0, 3)).toBe('position 1 of 3');
    expect(formatAccessiblePosition(2, 3)).toBe('position 3 of 3');
  });
});
