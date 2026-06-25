import { BuilderIcon } from './icons/BuilderIcons';
import type { ConditionCanvasProps } from './types';
import { ConditionGroupCard } from './ConditionGroupCard';
import { resolveOrphans } from '../app/sourceState';

export function ConditionCanvas(props: ConditionCanvasProps) {
  const orphanCount = resolveOrphans(props.root, props.fields).size;

  return (
    <section className="eb-canvas-card" role="region" aria-label="Condition Builder">
      <div className="eb-canvas-header">
        <h2>
          <BuilderIcon />
          Condition Builder
        </h2>
        <span className="eb-dock-meta">
          {props.mode === 'filterArray' ? 'Filter array' : 'Trigger condition'}
          {orphanCount > 0 ? ` · ${orphanCount} unknown field${orphanCount === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      <div className="eb-pane-body">
        <ConditionGroupCard
          {...props}
          group={props.root}
          onRequestRemap={props.onRequestRemap}
        />
      </div>
    </section>
  );
}
