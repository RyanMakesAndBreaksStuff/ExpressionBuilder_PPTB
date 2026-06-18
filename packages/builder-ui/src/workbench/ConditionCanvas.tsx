import { BuilderIcon } from './icons/BuilderIcons';
import type { ConditionCanvasProps } from './types';
import { ConditionGroupCard } from './ConditionGroupCard';

export function ConditionCanvas(props: ConditionCanvasProps) {
  return (
    <section className="eb-canvas-card" role="region" aria-label="Condition Builder">
      <div className="eb-canvas-header">
        <h2>
          <BuilderIcon />
          Condition Builder
        </h2>
        <span className="eb-dock-meta">{props.mode === 'filterArray' ? 'Filter array' : 'Trigger condition'}</span>
      </div>
      <div className="eb-pane-body">
        <ConditionGroupCard {...props} group={props.root} />
      </div>
    </section>
  );
}
