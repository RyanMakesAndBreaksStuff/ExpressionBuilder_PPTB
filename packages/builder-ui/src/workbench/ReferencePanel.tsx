import { useId, type Dispatch } from 'react';
import { ExpressionPreview } from '../components/ExpressionPreview';
import { valueAtPath } from '../importExport/jsonPayload';
import { ActionButton } from './controls/ActionButton';
import { CodeIcon, CopyIcon } from './icons/BuilderIcons';
import {
  canCopy,
  copyStatusView,
  copyText,
  expressionPlaceholder,
  fixedPositionNote,
  rootExpression,
  type CopyFormat,
  type JsonReferenceAction,
  type JsonReferenceState,
} from './jsonReferenceState';
import { segmentLabel, selectionSummary } from './payloadTreeModel';

interface ReferencePanelProps {
  state: JsonReferenceState;
  dispatch: Dispatch<JsonReferenceAction>;
  onCopy: (format: CopyFormat) => void;
}

export function ReferencePanel({ dispatch, onCopy, state }: ReferencePanelProps) {
  const headingId = useId();
  const note = fixedPositionNote(state);
  const status = copyStatusView(state);
  const selection = state.parsed ? valueAtPath(state.parsed.value, state.selectedPath) : null;
  const crumbs = [rootExpression(state), ...state.selectedPath.map(segmentLabel)];
  const ready = canCopy(state);

  return (
    <section className="eb-json-card eb-json-reference" aria-labelledby={headingId}>
      <div className="eb-json-card-header">
        <h2 id={headingId}>
          <CodeIcon aria-hidden="true" />
          Reference
        </h2>
        {selection?.found ? <span className="eb-dock-meta eb-json-summary">{selectionSummary(selection.value)}</span> : null}
      </div>
      <div className="eb-json-card-body">
        {state.parsed ? (
          <nav className="eb-json-breadcrumb" aria-label="Selected path">
            <ol>
              {crumbs.map((crumb, index) => (
                <li key={index}>
                  {index > 0 ? (
                    <span className="eb-json-crumb-separator" aria-hidden="true">
                      ›
                    </span>
                  ) : null}
                  <span className="eb-json-crumb">{crumb}</span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {ready ? (
          <div className="eb-json-copy-blocks">
            <div className="eb-json-copy-block">
              <span className="eb-json-copy-block-label">Expression editor</span>
              <div className="eb-code-copy-wrap">
                <ExpressionPreview expression={copyText(state, 'bare')!} label="Reference expression" />
                <button type="button" className="eb-code-copy-btn" aria-label="Copy" onClick={() => onCopy('bare')}>
                  <CopyIcon aria-hidden />
                </button>
              </div>
            </div>
            <div className="eb-json-copy-block">
              <span className="eb-json-copy-block-label">Inline @{'{'}&hellip;{'}'}</span>
              <div className="eb-code-copy-wrap">
                <ExpressionPreview expression={copyText(state, 'inline')!} label="Inline reference expression" />
                <button type="button" className="eb-code-copy-btn" aria-label="Copy @{}" onClick={() => onCopy('inline')}>
                  <CopyIcon aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="eb-preview eb-json-placeholder">{expressionPlaceholder(state)}</p>
            <div className="eb-json-copy-row">
              <ActionButton icon={<CopyIcon />} disabled>Copy</ActionButton>
            </div>
          </>
        )}

        {note ? <p className="eb-json-note">{note}</p> : null}

        <span role="status" className={`eb-json-copy-status is-${status.tone}`}>
          {status.text}
        </span>
      </div>
    </section>
  );
}

