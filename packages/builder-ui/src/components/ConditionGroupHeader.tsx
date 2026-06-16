import type { Conjunction } from '@ryanmakes/eb_engine';

interface ConditionGroupHeaderProps {
  conjunction: Conjunction;
  depth: number;
}

export function ConditionGroupHeader({ conjunction, depth }: ConditionGroupHeaderProps) {
  return (
    <div className="eb-group-head" style={{ marginLeft: depth * 18 }}>
      <span className="eb-pill brand">{conjunction.toUpperCase()}</span>
      <span className="eb-muted">{depth === 0 ? 'Root returns boolean' : 'Nested Group'}</span>
    </div>
  );
}
