import type { ExpressionMode } from '@ryanmakes/eb_engine';
import { getModeContext } from './workbenchState';

interface ModeContextPanelProps {
  mode: ExpressionMode;
}

export function ModeContextPanel({ mode }: ModeContextPanelProps) {
  const context = getModeContext(mode);

  return (
    <section className="eb-mode-context">
      <div>
        <h3>Field reference</h3>
        <code>{context.expression}</code>
      </div>
      <p>{context.note}</p>
      <div>
        <h3>Dock behavior</h3>
        <p>Both side panes collapse into rails so the center builder can expand without changing document structure.</p>
      </div>
      <div>
        <h3>Palette review</h3>
        <p>Porcelain keeps warm surfaces, soft borders, and high-contrast code preview states in both themes.</p>
      </div>
    </section>
  );
}
