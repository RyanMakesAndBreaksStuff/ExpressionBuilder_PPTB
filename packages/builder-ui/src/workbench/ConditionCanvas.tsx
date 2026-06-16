import type { ConditionCanvasProps } from './types';
import { ConditionGroupCard } from './ConditionGroupCard';

export function ConditionCanvas(props: ConditionCanvasProps) {
  return (
    <section className="eb-canvas-card" role="region" aria-label="Condition Builder">
      <div className="eb-canvas-header">
        <div>
          <h2>Condition Builder</h2>
          <p className="eb-muted">Inline Power Automate predicate editor</p>
        </div>
      </div>
      <ConditionGroupCard {...props} group={props.root} />
    </section>
  );
}
