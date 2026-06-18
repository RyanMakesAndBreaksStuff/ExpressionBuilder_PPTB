import type { FormatDiagnostic } from '@ryanmakes/eb_engine';
import { OkIcon, WarnIcon, ErrorIcon, InfoIcon } from './icons/BuilderIcons';

interface DiagnosticListProps {
  diagnostics: Array<FormatDiagnostic | { severity: 'error' | 'warning' | 'success' | 'info'; message: string; code?: string }>;
}

export function DiagnosticList({ diagnostics }: DiagnosticListProps) {
  return (
    <div className="eb-diagnostic-list" role="status" aria-label="warnings/errors" aria-live="polite">
      {diagnostics.length === 0 ? (
        <div className="eb-diagnostic-card success">
          <OkIcon />
          <div>
            <div className="eb-diag-title">Expression is valid</div>
            <div className="eb-diag-detail">All rules have values and the tree structure is well-formed.</div>
          </div>
        </div>
      ) : (
        diagnostics.map((diagnostic, index) => (
          <div key={`${diagnostic.message}-${index}`} className={`eb-diagnostic-card ${diagnostic.severity}`}>
            {diagnostic.severity === 'error' ? <ErrorIcon /> : diagnostic.severity === 'warning' ? <WarnIcon /> : diagnostic.severity === 'success' ? <OkIcon /> : <InfoIcon />}
            <div>
              <div className="eb-diag-title">{diagnostic.message}</div>
            </div>
            {diagnostic.code ? <span className="eb-diag-where">{diagnostic.code}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}
