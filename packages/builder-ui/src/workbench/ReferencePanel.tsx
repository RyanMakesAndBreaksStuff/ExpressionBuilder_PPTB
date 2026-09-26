import { useId, type Dispatch } from 'react';
import { ExpressionPreview } from '../components/ExpressionPreview';
import { valueAtPath } from '../importExport/jsonPayload';
import { ActionButton } from './controls/ActionButton';
import { ChoiceGroup } from './controls/ChoiceGroup';
import { CodeIcon, CopyIcon } from './icons/BuilderIcons';
import {
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
  onCopy: () => void;
}

const COPY_FORMAT_OPTIONS = [
  { value: 'bare', label: 'Expression editor' },
  { value: 'inline', label: 'Inside text @{…}' },
] as const satisfies ReadonlyArray<{ value: CopyFormat; label: string }>;

export function ReferencePanel({ dispatch, onCopy, state }: ReferencePanelProps) {
  const headingId = useId();
  const text = copyText(state);
  const note = fixedPositionNote(state);
  const status = copyStatusView(state);
  const selection = state.parsed ? valueAtPath(state.parsed.value, state.selectedPath) : null;
  const crumbs = [rootExpression(state), ...state.selectedPath.map(segmentLabel)];

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

        {text !== null ? (
          <ExpressionPreview expression={text} label="Reference expression" />
        ) : (
          <p className="eb-preview eb-json-placeholder">{expressionPlaceholder(state)}</p>
        )}

        {note ? <p className="eb-json-note">{note}</p> : null}

        <div className="eb-json-copy-row">
          <ActionButton icon={<CopyIcon />} disabled={text === null} onClick={onCopy}>
            Copy
          </ActionButton>
          <ChoiceGroup
            className="eb-choice-segmented"
            ariaLabel="Copy format"
            options={COPY_FORMAT_OPTIONS}
            value={state.copyFormat}
            onChange={(value) => dispatch({ type: 'setCopyFormat', value })}
          />
          <span role="status" className={`eb-json-copy-status is-${status.tone}`}>
            {status.text}
          </span>
        </div>
      </div>
    </section>
  );
}
