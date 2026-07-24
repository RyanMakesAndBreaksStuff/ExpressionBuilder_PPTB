import type { ReactNode } from 'react';
import { Button } from '@fluentui/react-components';
import { useDraggable } from '@dnd-kit/react';
import { GripIcon } from './icons/BuilderIcons';
import {
  conditionNodeDragId,
  type ConditionNodeDragMetadata,
} from './dragDropModel';

interface ConditionDragHandleBindings {
  handle: ReactNode;
  isDragging: boolean;
  sourceRef: (element: Element | null) => void;
}

interface ConditionDragHandleProps {
  nodeId: string;
  parentGroupId: string;
  sourceIndex: number;
  label: string;
  children: (bindings: ConditionDragHandleBindings) => ReactNode;
}

export function ConditionDragHandle({
  nodeId,
  parentGroupId,
  sourceIndex,
  label,
  children,
}: ConditionDragHandleProps) {
  const metadata: ConditionNodeDragMetadata = {
    kind: 'condition-node',
    nodeId,
    parentGroupId,
    sourceIndex,
  };
  const { handleRef, isDragging, ref } = useDraggable({
    id: conditionNodeDragId(nodeId),
    data: metadata,
    type: 'condition-node',
  });

  return children({
    isDragging,
    sourceRef: ref,
    handle: (
      <Button
        ref={handleRef}
        type="button"
        appearance="subtle"
        size="small"
        className="eb-drag-handle"
        icon={<GripIcon />}
        aria-label={`Reorder ${label}`}
        title={`Reorder ${label}`}
        onClick={(event) => event.stopPropagation()}
      />
    ),
  });
}
