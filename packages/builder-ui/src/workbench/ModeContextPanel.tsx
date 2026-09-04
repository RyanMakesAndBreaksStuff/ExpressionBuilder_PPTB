import type { ExpressionMode } from '@ryanmakes/eb_engine';
import { getModeContext } from './workbenchState';

interface ModeContextPanelProps {
  mode: ExpressionMode;
}

export function ModeContextPanel({ mode }: ModeContextPanelProps) {
  const context = getModeContext(mode);

  return (
    <section className="eb-mode-context">
      <div className="eb-context-list">
        <div className="eb-context-block">
          <div className="eb-context-label">Field reference</div>
          <span className="eb-context-code">{context.expression}</span>
          <div className="eb-context-note">{context.note}</div>
        </div>
      </div>
    </section>
  );
}
