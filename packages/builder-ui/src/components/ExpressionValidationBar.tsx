import type { FormatDiagnostic } from '@ryanmakes/eb_engine';
import { ExpressionPreview } from './ExpressionPreview';

interface ExpressionValidationBarProps {
  expression: string;
  diagnostics: FormatDiagnostic[];
  onCopy: () => void;
}

export function ExpressionValidationBar({ expression, diagnostics, onCopy }: ExpressionValidationBarProps) {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;

  return (
    <footer className="eb-validation eb-pane-surface">
      <div className="eb-button-row">
        <span className="eb-pill brand">Root returns boolean</span>
        <span className="eb-muted">
          {warnings} warnings/errors, {errors} errors
        </span>
        <button type="button" className="eb-btn subtle" onClick={onCopy}>
          Copy
        </button>
      </div>
      <ExpressionPreview expression={expression} />
    </footer>
  );
}
