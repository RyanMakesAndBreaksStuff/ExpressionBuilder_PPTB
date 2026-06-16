import type { ExpressionMode } from '@pavb/engine';
import { ModeSegmentedControl } from './ModeSegmentedControl';

interface ExpressionCommandBarProps {
  mode: ExpressionMode;
  theme: 'light' | 'dark';
  onModeChange: (mode: ExpressionMode) => void;
  onExport: () => void;
  onImport: () => void;
  onToggleTheme: () => void;
  onCopyExpression: () => void;
}

export function ExpressionCommandBar({
  mode,
  theme,
  onModeChange,
  onExport,
  onImport,
  onToggleTheme,
  onCopyExpression,
}: ExpressionCommandBarProps) {
  return (
    <header className="eb-command">
      <div className="eb-product">
        <div className="eb-mark" aria-hidden="true">
          EB
        </div>
        <div className="eb-title">
          <h1>Expression Builder</h1>
          <div className="eb-subtitle">
            <span>Approval routing condition</span>
            <span className="eb-badge">Draft</span>
          </div>
        </div>
      </div>

      <ModeSegmentedControl mode={mode} onChange={onModeChange} />

      <div className="eb-spacer" />

      <div className="eb-command-actions">
        <button type="button" className="eb-btn" onClick={onImport}>
          Import
        </button>
        <button type="button" className="eb-btn" onClick={onExport}>
          Export
        </button>
        <button type="button" className="eb-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Light theme toggle' : 'Dark theme toggle'}
        </button>
        <button type="button" className="eb-btn primary" onClick={onCopyExpression}>
          Copy expression
        </button>
      </div>
    </header>
  );
}
