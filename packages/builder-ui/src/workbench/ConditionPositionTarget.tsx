import { useDragOperation, useDroppable } from '@dnd-kit/react';
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
}

export function ConditionPositionTarget({
  groupId,
  groupLabel,
  index,
  positionCount,
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
    id: conditionPositionDropId(groupId, index),
    data: metadata,
    type: 'condition-position',
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
