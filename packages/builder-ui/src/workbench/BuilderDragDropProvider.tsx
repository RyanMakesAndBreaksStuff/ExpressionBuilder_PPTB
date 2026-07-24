import { useRef, useState } from 'react';
import {
  DragDropProvider,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/react';
import {
  Accessibility,
  PointerActivationConstraints,
} from '@dnd-kit/dom';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { QueryGroup, QueryNode } from '../composer/querySchema';
import type { BuilderDragDropProviderProps } from './types';
import {
  formatAccessiblePosition,
  isConditionNodeDragMetadata,
  isConditionPositionDropMetadata,
  isToolboxFieldDragMetadata,
  resolveCurrentDragDropCommand,
} from './dragDropModel';

const builderPointerSensor = PointerSensor.configure({
  activationConstraints(event) {
    return event.pointerType === 'touch'
      ? [
          new PointerActivationConstraints.Delay({
            value: 250,
            tolerance: 5,
          }),
        ]
      : [new PointerActivationConstraints.Distance({ value: 5 })];
  },
});

const builderAccessibilityPlugin = Accessibility.configure({
  screenReaderInstructions: {
    draggable:
      'Press Space or Enter to pick up this item. Use the arrow keys to move to an announced condition position. Press Space or Enter to drop, or Escape to cancel.',
  },
  announcements: {
    dragstart: () => undefined,
    dragover: () => undefined,
    dragend: () => undefined,
  },
});

export function BuilderDragDropProvider({
  children,
  fields,
  root,
  onInsertField,
  onReorderNode,
}: BuilderDragDropProviderProps) {
  const initiatingHandle = useRef<HTMLElement | null>(null);
  const [dragAnnouncement, setDragAnnouncement] = useState('');

  return (
    <DragDropProvider
      sensors={(defaults) => [
        ...defaults.filter((sensor) => sensor !== PointerSensor),
        builderPointerSensor,
      ]}
      plugins={(defaults) => [
        ...defaults.filter((plugin) => plugin !== Accessibility),
        builderAccessibilityPlugin,
      ]}
      onDragStart={(event) => {
        const handle = event.operation.source?.handle;
        initiatingHandle.current = handle instanceof HTMLElement ? handle : null;
        setDragAnnouncement(
          getDragStartAnnouncement(event, fields, root) ?? '',
        );
      }}
      onDragOver={(event) => {
        setDragAnnouncement(getDragOverAnnouncement(event, fields, root));
      }}
      onDragEnd={(event) => {
        setDragAnnouncement(
          getDragEndAnnouncement(event, fields, root) ?? '',
        );
        const command = resolveCurrentDragDropCommand({
          source: event.operation.source?.data,
          target: event.operation.target?.data,
          cancelled: event.canceled,
          fields,
          root,
        });

        if (command?.kind === 'insert-field') {
          onInsertField(command.fieldId, command.groupId, command.index);
        } else if (command?.kind === 'reorder-node') {
          onReorderNode(command.nodeId, command.parentGroupId, command.index);
        }

        const handle = initiatingHandle.current;
        initiatingHandle.current = null;
        queueMicrotask(() => {
          if (handle?.isConnected) {
            handle.focus();
          }
        });
      }}
    >
      {children}
      <div
        className="eb-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="builder-drag-status"
      >
        {dragAnnouncement}
      </div>
    </DragDropProvider>
  );
}

const getDragStartAnnouncement = (
  { operation: { source } }: DragStartEvent,
  fields: FieldDefinition[],
  root: QueryGroup,
): string | undefined => {
  if (!source) {
    return undefined;
  }

  const label = describeSource(source.data, fields, root);
  if (isConditionNodeDragMetadata(source.data)) {
    const location = findNodeLocation(root, source.data.nodeId);
    if (location?.parent) {
      return `Picked up ${label} at ${formatAccessiblePosition(
        location.index,
        location.parent.children.length,
      )}.`;
    }
  }

  return `Picked up ${label}.`;
};

const getDragOverAnnouncement = (
  { operation: { source, target } }: DragOverEvent,
  fields: FieldDefinition[],
  root: QueryGroup,
): string => {
  if (!source || !target || !isConditionPositionDropMetadata(target.data)) {
    return 'Not over a valid condition position.';
  }

  const command = resolveCurrentDragDropCommand({
    source: source.data,
    target: target.data,
    fields,
    root,
  });
  if (!command) {
    return 'This position is not a valid drop target.';
  }

  const group = findGroup(root, target.data.groupId);
  return `${describeSource(
    source.data,
    fields,
    root,
  )} is over ${formatAccessiblePosition(
    target.data.index,
    (group?.children.length ?? 0) + 1,
  )} in ${describeGroup(group, target.data.groupId)}.`;
};

const getDragEndAnnouncement = (
  { operation: { source, target }, canceled }: DragEndEvent,
  fields: FieldDefinition[],
  root: QueryGroup,
): string | undefined => {
  if (!source) {
    return undefined;
  }

  const label = describeSource(source.data, fields, root);
  if (canceled) {
    return `Cancelled dragging ${label}. No changes were made.`;
  }

  const command = resolveCurrentDragDropCommand({
    source: source.data,
    target: target?.data,
    fields,
    root,
  });
  if (!command || !target || !isConditionPositionDropMetadata(target.data)) {
    return `Could not drop ${label} at that position. No changes were made.`;
  }

  const group = findGroup(root, target.data.groupId);
  const verb = command.kind === 'insert-field' ? 'Inserted' : 'Moved';
  return `${verb} ${label} to ${formatAccessiblePosition(
    target.data.index,
    (group?.children.length ?? 0) + 1,
  )} in ${describeGroup(group, target.data.groupId)}.`;
};

type NodeLocation = {
  node: QueryNode;
  parent?: QueryGroup;
  index: number;
};

const findNodeLocation = (
  group: QueryGroup,
  nodeId: string,
  parent?: QueryGroup,
  index = -1,
): NodeLocation | undefined => {
  if (group.id === nodeId) {
    return { node: group, parent, index };
  }

  for (const [childIndex, child] of group.children.entries()) {
    if (child.id === nodeId) {
      return { node: child, parent: group, index: childIndex };
    }
    if (child.kind === 'group') {
      const nested = findNodeLocation(child, nodeId, group, childIndex);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

const findGroup = (root: QueryGroup, groupId: string): QueryGroup | undefined => {
  const node = findNodeLocation(root, groupId)?.node;
  return node?.kind === 'group' ? node : undefined;
};

const describeGroup = (group: QueryGroup | undefined, fallbackId: string): string =>
  group ? `${group.conjunction.toUpperCase()} group ${group.id}` : `group ${fallbackId}`;

const describeSource = (
  metadata: unknown,
  fields: FieldDefinition[],
  root: QueryGroup,
): string => {
  if (isToolboxFieldDragMetadata(metadata)) {
    return `field ${fields.find((field) => field.id === metadata.fieldId)?.label ?? metadata.fieldId}`;
  }

  if (isConditionNodeDragMetadata(metadata)) {
    const node = findNodeLocation(root, metadata.nodeId)?.node;
    if (node?.kind === 'group') {
      return `group ${node.id}`;
    }
    if (node?.kind === 'rule') {
      return (
        fields.find((field) => field.id === node.fieldId)?.label ??
        `unknown field ${node.fieldId}`
      );
    }
    return `condition ${metadata.nodeId}`;
  }

  return 'item';
};
