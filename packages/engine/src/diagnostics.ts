import type { FormatDiagnostic } from './types';

export function diagnostic(
  code: FormatDiagnostic['code'],
  message: string,
  path: string,
  severity: FormatDiagnostic['severity'] = 'error',
): FormatDiagnostic {
  return { code, message, path, severity };
}

export function hasError(diagnostics: FormatDiagnostic[]): boolean {
  return diagnostics.some((item) => item.severity === 'error');
}
