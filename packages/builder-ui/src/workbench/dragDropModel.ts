import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type { QueryGroup, QueryNode } from '../composer/querySchema';

export type ToolboxFieldDragMetadata = {
  kind: 'toolbox-field';
  fieldId: string;
};

export type ConditionNodeDragMetadata = {
  kind: 'condition-node';
  nodeId: string;
  parentGroupId: string;
  sourceIndex: number;
};

export type ConditionPositionDropMetadata = {
  kind: 'condition-position';
  groupId: string;
  index: number;
};

export type BuilderDragMetadata = ToolboxFieldDragMetadata | ConditionNodeDragMetadata;
export type BuilderDropMetadata = ConditionPositionDropMetadata;

export type DragDropCommand =
  | {
      kind: 'insert-field';
      fieldId: string;
      groupId: string;
      index: number;
    }
  | {
      kind: 'reorder-node';
      nodeId: string;
      parentGroupId: string;
      index: number;
    }
  | {
      kind: 'move-node';
      nodeId: string;
      targetGroupId: string;
      index: number;
    };

export type DragDropResolutionInput = {
  source?: unknown;
  target?: unknown;
  cancelled?: boolean;
};

export type CurrentDragDropResolutionInput = DragDropResolutionInput & {
  fields: readonly FieldDefinition[];
  root: QueryGroup;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const isToolboxFieldDragMetadata = (
  value: unknown,
): value is ToolboxFieldDragMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ToolboxFieldDragMetadata>;
  return candidate.kind === 'toolbox-field' && isNonEmptyString(candidate.fieldId);
};

export const isConditionNodeDragMetadata = (
  value: unknown,
): value is ConditionNodeDragMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ConditionNodeDragMetadata>;
  return (
    candidate.kind === 'condition-node' &&
    isNonEmptyString(candidate.nodeId) &&
    isNonEmptyString(candidate.parentGroupId) &&
    isIndex(candidate.sourceIndex)
  );
};

export const isConditionPositionDropMetadata = (
  value: unknown,
): value is ConditionPositionDropMetadata => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ConditionPositionDropMetadata>;
  return (
    candidate.kind === 'condition-position' &&
    isNonEmptyString(candidate.groupId) &&
    isIndex(candidate.index)
  );
};

export const resolveDragDropCommand = ({
  source,
  target,
  cancelled = false,
}: DragDropResolutionInput): DragDropCommand | undefined => {
  if (cancelled || !isConditionPositionDropMetadata(target)) {
    return undefined;
  }

  if (isToolboxFieldDragMetadata(source)) {
    return {
      kind: 'insert-field',
      fieldId: source.fieldId,
      groupId: target.groupId,
      index: target.index,
    };
  }

  if (!isConditionNodeDragMetadata(source)) {
    return undefined;
  }

  if (source.parentGroupId !== target.groupId) {
    /**
     * A move into another group. The index is used as-is: unlike a reorder, the
     * node is removed from a *different* list, so nothing shifts in the target
     * and the -1 correction below would land it one position too high.
     *
     * Legality beyond shape — the target group existing, and a group never
     * landing inside itself — needs the document tree, so it is enforced by
     * resolveCurrentDragDropCommand and mirrored in the drop target's own
     * ancestor check.
     */
    return {
      kind: 'move-node',
      nodeId: source.nodeId,
      targetGroupId: target.groupId,
      index: target.index,
    };
  }

  if (target.index === source.sourceIndex || target.index === source.sourceIndex + 1) {
    return undefined;
  }

  return {
    kind: 'reorder-node',
    nodeId: source.nodeId,
    parentGroupId: source.parentGroupId,
    index: target.index > source.sourceIndex ? target.index - 1 : target.index,
  };
};

export const resolveCurrentDragDropCommand = ({
  fields,
  root,
  ...input
}: CurrentDragDropResolutionInput): DragDropCommand | undefined => {
  const command = resolveDragDropCommand(input);
  if (!command || !isConditionPositionDropMetadata(input.target)) {
    return undefined;
  }

  const targetGroup = findGroup(root, input.target.groupId);
  if (!targetGroup || input.target.index > targetGroup.children.length) {
    return undefined;
  }

  if (command.kind === 'insert-field') {
    return fields.some((field) => field.id === command.fieldId)
      ? command
      : undefined;
  }

  if (!isConditionNodeDragMetadata(input.source)) {
    return undefined;
  }

  const source = findNodeLocation(root, command.nodeId);
  if (
    !source ||
    source.parent?.id !== input.source.parentGroupId ||
    source.index !== input.source.sourceIndex
  ) {
    return undefined;
  }

  if (command.kind === 'move-node') {
    // Appending past the last child is legal for a move but not for a reorder,
    // so the bound is inclusive here. findNodeLocation matches the subtree root
    // as well as its descendants, which covers both dropping a group onto its
    // own separators and onto one nested deeper inside it.
    const landsInsideItself =
      source.node.kind === 'group' &&
      findNodeLocation(source.node, command.targetGroupId) !== undefined;

    return command.index >= 0 &&
      command.index <= targetGroup.children.length &&
      !landsInsideItself
      ? command
      : undefined;
  }

  return command.index >= 0 && command.index < targetGroup.children.length
    ? command
    : undefined;
};

const encoded = (value: string): string => encodeURIComponent(value);

export const toolboxFieldDragId = (fieldId: string): string =>
  `toolbox-field:${encoded(fieldId)}`;

export const conditionNodeDragId = (nodeId: string): string =>
  `condition-node:${encoded(nodeId)}`;

/**
 * Drop-target IDs are keyed by *identity*, not position: the id of the node the
 * separator sits before, or `end` for the terminal separator.
 *
 * Positional ids (`...:0`, `...:1`) collide on insert. When a rule is added, the
 * terminal separator's index shifts (N -> N+1) while a freshly mounted separator
 * claims the old id. `Entity` defers id changes to a microtask but layout effects
 * register synchronously in tree order, so the new separator registers under the
 * old key first. `EntityRegistry.register` then evicts the previous holder AND
 * runs its cleanup, destroying the very effect that would have re-registered it
 * under its new id. The evicted separator is unregistered permanently.
 */
export const conditionPositionDropId = (
  groupId: string,
  beforeNodeId: string | undefined,
): string =>
  `condition-position:${encoded(groupId)}:${
    beforeNodeId === undefined ? 'end' : encoded(beforeNodeId)
  }`;

export const formatAccessiblePosition = (index: number, total: number): string =>
  `position ${index + 1} of ${total}`;

interface NodeLocation {
  node: QueryNode;
  parent?: QueryGroup;
  index: number;
}

const findNodeLocation = (
  node: QueryNode,
  nodeId: string,
  parent?: QueryGroup,
  index = -1,
): NodeLocation | undefined => {
  if (node.id === nodeId) {
    return { node, parent, index };
  }

  if (node.kind === 'rule') {
    return undefined;
  }

  for (const [childIndex, child] of node.children.entries()) {
    const match = findNodeLocation(child, nodeId, node, childIndex);
    if (match) {
      return match;
    }
  }

  return undefined;
};

const findGroup = (root: QueryGroup, groupId: string): QueryGroup | undefined => {
  const node = findNodeLocation(root, groupId)?.node;
  return node?.kind === 'group' ? node : undefined;
};

export interface GroupMoveTarget {
  id: string;
  label: string;
}

const groupMoveLabel = (group: QueryGroup): string =>
  group.id === 'root' ? 'the root group' : `${group.conjunction.toUpperCase()} group ${group.id}`;

/**
 * Lists every group a node can be moved into via the keyboard "Move to..."
 * menu (ConditionMoveButtons) - the keyboard-accessible counterpart to
 * dragging a rule/group across groups. Excludes:
 *  - the node's current parent (already reachable via the up/down buttons)
 *  - the node itself, when the node being moved is a group
 *  - any descendant of that group, which would create a cycle - mirrors the
 *    "landsInsideItself" guard in resolveCurrentDragDropCommand above.
 */
export const listGroupMoveTargets = (
  root: QueryGroup,
  nodeId: string,
  currentParentId: string,
): GroupMoveTarget[] => {
  const sourceNode = findNodeLocation(root, nodeId)?.node;
  const isDescendantOfSource = (candidate: QueryGroup): boolean =>
    sourceNode?.kind === 'group' && findNodeLocation(sourceNode, candidate.id) !== undefined;

  const targets: GroupMoveTarget[] = [];
  const visit = (group: QueryGroup) => {
    if (group.id !== nodeId && group.id !== currentParentId && !isDescendantOfSource(group)) {
      targets.push({ id: group.id, label: groupMoveLabel(group) });
    }
    for (const child of group.children) {
      if (child.kind === 'group') {
        visit(child);
      }
    }
  };

  visit(root);
  return targets;
};
