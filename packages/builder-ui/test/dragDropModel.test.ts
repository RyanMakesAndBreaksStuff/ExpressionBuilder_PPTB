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

  it('rejects a condition-node move across parent groups', () => {
    expect(
      resolveDragDropCommand({
        source: conditionNode({ parentGroupId: 'group-a' }),
        target: conditionPosition({ groupId: 'group-b', index: 0 }),
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
    expect(conditionPositionDropId('group:main', 3)).toBe(
      'condition-position:group%3Amain:3',
    );
  });

  it('formats zero-based indices as one-based accessible position labels', () => {
    expect(formatAccessiblePosition(0, 3)).toBe('position 1 of 3');
    expect(formatAccessiblePosition(2, 3)).toBe('position 3 of 3');
  });
});
