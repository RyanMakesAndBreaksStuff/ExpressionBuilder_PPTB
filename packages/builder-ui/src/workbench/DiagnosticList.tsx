import type { FormatDiagnostic } from '@pavb/engine';

interface DiagnosticListProps {
  diagnostics: Array<FormatDiagnostic | { severity: 'error' | 'warning'; message: string; code?: string }>;
}

export function DiagnosticList({ diagnostics }: DiagnosticListProps) {
  return (
    <div className="eb-diagnostic-list" role="status" aria-label="warnings/errors" aria-live="polite">
      {diagnostics.length === 0 ? (
        <div className="eb-diagnostic-card success">
          <strong>Valid</strong>
          <span>Expression is valid</span>
        </div>
      ) : (
        diagnostics.map((diagnostic, index) => (
          <div key={`${diagnostic.message}-${index}`} className={`eb-diagnostic-card ${diagnostic.severity}`}>
            <strong>{diagnostic.severity}</strong>
            <span>{diagnostic.message}</span>
            {diagnostic.code ? <span className="eb-muted">{diagnostic.code}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}
