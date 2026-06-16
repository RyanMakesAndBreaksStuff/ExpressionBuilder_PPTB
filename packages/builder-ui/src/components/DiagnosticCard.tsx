import type { FormatDiagnostic } from '@pavb/engine';

interface DiagnosticCardProps {
  diagnostic: FormatDiagnostic | { severity: 'error' | 'warning'; message: string; code?: string };
}

export function DiagnosticCard({ diagnostic }: DiagnosticCardProps) {
  return (
    <div className={`eb-diagnostic ${diagnostic.severity}`}>
      <strong>{diagnostic.severity === 'error' ? 'Error' : 'Warning'}:</strong> {diagnostic.message}
    </div>
  );
}
