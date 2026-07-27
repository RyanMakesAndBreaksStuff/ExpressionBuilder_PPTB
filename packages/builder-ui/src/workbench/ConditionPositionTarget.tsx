import { useDragOperation, useDroppable } from '@dnd-kit/react';
import { closestCenter } from '@dnd-kit/collision';
import {
  conditionPositionDropId,
  formatAccessiblePosition,
  isConditionNodeDragMetadata,
  resolveDragDropCommand,
  type ConditionPositionDropMetadata,
} from './dragDropModel';

interface ConditionPositionTargetProps {
  groupId: string;
  groupLabel: string;
  index: number;
  positionCount: number;
  /** Id of the node this separator sits before; omitted for the terminal one. */
  beforeNodeId?: string;
  terminal?: boolean;
}

export function ConditionPositionTarget({
  groupId,
  groupLabel,
  index,
  positionCount,
  beforeNodeId,
  terminal = false,
}: ConditionPositionTargetProps) {
  const metadata: ConditionPositionDropMetadata = {
    kind: 'condition-position',
    groupId,
    index,
  };
  const { source } = useDragOperation();
  const isActive = source !== null && source !== undefined;
  const isValidDrop =
    isActive &&
    resolveDragDropCommand({
      source: source.data,
      target: metadata,
    }) !== undefined;
  const isIneligibleGroup =
    isActive &&
    !isValidDrop &&
    isConditionNodeDragMetadata(source.data) &&
    source.data.parentGroupId !== groupId;
  const { isDropTarget, ref } = useDroppable({
    id: conditionPositionDropId(groupId, beforeNodeId),
    data: metadata,
    type: 'condition-position',
    // These separators are thin (~32px) with tall rule rows between them, so
    // the default detector (pointer/shape intersection) leaves ~130px dead
    // zones over each rule where nothing is targeted and a drop is discarded.
    // closestCenter always ranks every accepted position by distance, so the
    // pane tiles cleanly between separators with no dead zones and no reliance
    // on hit-box geometry.
    collisionDetector: closestCenter,
    accept: (draggable) =>
      resolveDragDropCommand({
        source: draggable.data,
        target: metadata,
      }) !== undefined,
  });

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      aria-hidden={isActive ? undefined : true}
      aria-label={`Insert at ${formatAccessiblePosition(index, positionCount)} in ${groupLabel}`}
      className={[
        'eb-condition-drop-target',
        terminal ? 'is-terminal' : '',
        isActive ? 'is-active' : '',
        isValidDrop ? 'is-valid-drop' : isIneligibleGroup ? 'is-ineligible' : isActive ? 'is-invalid-drop' : '',
        isDropTarget && isValidDrop ? 'is-drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-drop-position={index}
      data-group-id={groupId}
    >
      <span aria-hidden="true">Drop here</span>
    </div>
  );
}
