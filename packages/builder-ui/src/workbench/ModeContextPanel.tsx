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
        <div className="eb-context-block">
          <div className="eb-context-label">Dock behavior</div>
          <div className="eb-context-note">Both side panels collapse into narrow rails, and the center builder expands or contracts immediately with that dock state instead of leaving dead space behind.</div>
        </div>
      </div>
    </section>
  );
}
