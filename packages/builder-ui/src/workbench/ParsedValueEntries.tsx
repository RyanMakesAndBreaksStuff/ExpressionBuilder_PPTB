import { Fragment } from 'react';
import type { ParsedValueEntry } from './parsedValueModel';

export interface ParsedValueEntriesProps {
  entries: readonly ParsedValueEntry[];
  baseId: string;
  onInsertReference: (expression: string) => void;
}

export function ParsedValueEntries({
  entries, baseId, onInsertReference,
}: ParsedValueEntriesProps) {
  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === 'arrayItem') {
          return (
            <details className="eb-pv-item" key={entry.key}>
              <summary>{entry.label}</summary>
              <ParsedValueEntries
                entries={entry.entries}
                baseId={baseId}
                onInsertReference={onInsertReference}
              />
            </details>
          );
        }
        const descriptionId = baseId + '-' + encodeURIComponent(JSON.stringify(entry.row.path));
        return (
          <Fragment key={JSON.stringify(entry.row.path)}>
            <button
              className="eb-pv-row"
              type="button"
              aria-describedby={descriptionId}
              onDoubleClick={() => onInsertReference(entry.row.expression)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onInsertReference(entry.row.expression);
                }
              }}
            >
              {entry.row.label}
            </button>
            <span id={descriptionId} className="eb-visually-hidden">
              {entry.row.expression}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}
