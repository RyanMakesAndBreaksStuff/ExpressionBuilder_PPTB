import type { FormatDiagnostic } from '@ryanmakes/eb_engine';
import { OkIcon, WarnIcon, ErrorIcon, InfoIcon } from '../workbench/icons/BuilderIcons';

interface DiagnosticCardProps {
  diagnostic: FormatDiagnostic | { severity: 'error' | 'warning' | 'success' | 'info'; message: string; code?: string };
}

export function DiagnosticCard({ diagnostic }: DiagnosticCardProps) {
  const Icon = diagnostic.severity === 'error' ? ErrorIcon : diagnostic.severity === 'warning' ? WarnIcon : diagnostic.severity === 'success' ? OkIcon : InfoIcon;
  const severityClass = `eb-diag-${diagnostic.severity}`;

  return (
    <div className={`eb-diagnostic-card ${diagnostic.severity} ${severityClass}`}>
      <Icon />
      <div>
        <div className="eb-diag-title">{diagnostic.message}</div>
      </div>
      {diagnostic.code ? <span className="eb-diag-where">{diagnostic.code}</span> : null}
    </div>
  );
}
