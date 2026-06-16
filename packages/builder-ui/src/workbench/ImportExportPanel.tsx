interface ImportExportPanelProps {
  diagnostics: Array<{ severity: 'error' | 'warning'; message: string }>;
  savedJson: string;
  onChange: (value: string) => void;
  onImport: () => void;
  onExport: () => void;
}

export function ImportExportPanel({ diagnostics, savedJson, onChange, onExport, onImport }: ImportExportPanelProps) {
  return (
    <section className="eb-import-export-panel">
      <div className="eb-import-export-actions">
        <button type="button" className="eb-action-btn eb-action-subtle" onClick={onImport}>
          Import saved expression
        </button>
        <button type="button" className="eb-action-btn eb-action-subtle" onClick={onExport}>
          Export current expression
        </button>
      </div>
      <label className="eb-label" htmlFor="saved-expression-json">
        Saved expression JSON
      </label>
      <textarea
        id="saved-expression-json"
        className="eb-textarea"
        value={savedJson}
        onChange={(event) => onChange(event.target.value)}
      />
      {diagnostics.length > 0 ? (
        <div className="eb-import-diagnostics" role="status" aria-label="import diagnostics">
          {diagnostics.map((diagnostic, index) => (
            <div key={`${diagnostic.message}-${index}`} className={`eb-diagnostic-card ${diagnostic.severity}`}>
              <strong>{diagnostic.severity}</strong>
              <span>{diagnostic.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
