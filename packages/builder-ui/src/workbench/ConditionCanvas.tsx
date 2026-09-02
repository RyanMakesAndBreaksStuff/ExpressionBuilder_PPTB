import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { BuilderIcon } from './icons/BuilderIcons';
import type { ConditionCanvasProps } from './types';
import { ConditionGroupCard } from './ConditionGroupCard';
import { resolveOrphans } from '../app/sourceState';
import type { QueryGroup, QueryNode } from '../composer/querySchema';
import { formatAccessiblePosition } from './dragDropModel';

export function ConditionCanvas(props: ConditionCanvasProps) {
  const orphanCount = resolveOrphans(props.root, props.fields).size;
  const isEmpty = props.root.children.length === 0;
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');

  const handleReorderNode = (
    nodeId: string,
    parentGroupId: string,
    finalIndex: number,
  ) => {
    const node = findNode(props.root, nodeId);
    const parent = findGroup(props.root, parentGroupId);
    props.onReorderNode(nodeId, parentGroupId, finalIndex);

    if (node && parent) {
      const label =
        node.kind === 'group'
          ? `group ${node.id}`
          : (props.fields.find((field) => field.id === node.fieldId)?.label ??
            `unknown field ${node.fieldId}`);
      setReorderAnnouncement(
        `Moved ${label} to ${formatAccessiblePosition(finalIndex, parent.children.length)}.`,
      );
    }
  };

  const handleMoveNode = (nodeId: string, targetGroupId: string) => {
    const node = findNode(props.root, nodeId);
    const targetGroup = findGroup(props.root, targetGroupId);
    props.onMoveNode?.(nodeId, targetGroupId);

    if (node && targetGroup) {
      const label =
        node.kind === 'group'
          ? `group ${node.id}`
          : (props.fields.find((field) => field.id === node.fieldId)?.label ??
            `unknown field ${node.fieldId}`);
      const targetLabel = targetGroup.id === 'root' ? 'the root group' : `group ${targetGroup.id}`;
      setReorderAnnouncement(`Moved ${label} to ${targetLabel}.`);
    }
  };

  return (
    <section className="eb-canvas-card" role="region" aria-label="Condition Builder">
      <div className="eb-canvas-header">
        <h2>
          <BuilderIcon />
          Condition Builder
        </h2>
        <Button
          appearance="subtle"
          size="small"
          icon={<DeleteRegular />}
          disabled={isEmpty}
          onClick={props.onClear}
          aria-label="Clear all conditions"
        >
          Clear
        </Button>
        <span className="eb-dock-meta">
          {props.mode === 'filterArray' ? 'Filter array' : 'Trigger condition'}
          {orphanCount > 0 ? ` · ${orphanCount} unknown field${orphanCount === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      <div className="eb-pane-body">
        <ConditionGroupCard
          {...props}
          group={props.root}
          isRoot
          onReorderNode={handleReorderNode}
          root={props.root}
          onMoveNode={props.onMoveNode ? handleMoveNode : undefined}
          onRequestRemap={props.onRequestRemap}
        />
      </div>
      <div
        className="eb-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="condition-reorder-status"
      >
        {reorderAnnouncement}
      </div>
    </section>
  );
}

const findNode = (group: QueryGroup, nodeId: string): QueryNode | undefined => {
  if (group.id === nodeId) {
    return group;
  }

  for (const child of group.children) {
    if (child.id === nodeId) {
      return child;
    }
    if (child.kind === 'group') {
      const nested = findNode(child, nodeId);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

const findGroup = (group: QueryGroup, groupId: string): QueryGroup | undefined => {
  const node = findNode(group, groupId);
  return node?.kind === 'group' ? node : undefined;
};
