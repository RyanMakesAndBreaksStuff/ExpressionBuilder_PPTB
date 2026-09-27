import { useEffect, useId, useReducer, useRef, type Dispatch } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { JsonSourcePane } from './JsonSourcePane';
import { PayloadTree } from './PayloadTree';
import { ReferencePanel } from './ReferencePanel';
import {
  copyText,
  initialJsonReferenceState,
  jsonReferenceReducer,
  rootExpression,
  showBodyHint,
  type CopyFormat,
  type JsonReferenceAction,
  type JsonReferenceState,
} from './jsonReferenceState';
import { countLabel } from './payloadTreeModel';

const COPIED_STATUS_MS = 1200;

interface JsonReferenceWorkspaceProps {
  adapter: PlatformAdapter;
  /** False while the Condition builder tab is selected; the workspace stays mounted so its state survives (FR-008). */
  active: boolean;
}

export function JsonReferenceWorkspace({ active, adapter }: JsonReferenceWorkspaceProps) {
  const [state, dispatch] = useReducer(jsonReferenceReducer, initialJsonReferenceState);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  // Leaving the builder drops a showing "Expression copied" (spec edge cases).
  useEffect(() => {
    if (active) return;
    clearTimeout(copiedTimer.current);
    dispatch({ type: 'resetCopyStatus' });
  }, [active]);

  const copy = async (format: CopyFormat) => {
    const text = copyText(state, format);
    if (text === null) return;
    clearTimeout(copiedTimer.current);
    try {
      await adapter.copyToClipboard(text);
    } catch (error) {
      dispatch({ type: 'copyFailed', reason: error instanceof Error ? error.message : 'clipboard unavailable' });
      return;
    }
    dispatch({ type: 'copySucceeded' });
    copiedTimer.current = setTimeout(() => dispatch({ type: 'resetCopyStatus' }), COPIED_STATUS_MS);
  };

  return (
    <div className="eb-json-workspace">
      <JsonSourcePane state={state} dispatch={dispatch} />
      <PayloadPanel state={state} dispatch={dispatch} />
      <ReferencePanel state={state} dispatch={dispatch} onCopy={(format) => void copy(format)} />
    </div>
  );
}

interface PayloadPanelProps {
  state: JsonReferenceState;
  dispatch: Dispatch<JsonReferenceAction>;
}

function PayloadPanel({ dispatch, state }: PayloadPanelProps) {
  const headingId = useId();
  const { parsed } = state;

  return (
    <section className="eb-json-card eb-json-payload" aria-labelledby={headingId}>
      <div className="eb-json-card-header">
        <h2 id={headingId}>Payload</h2>
        {parsed ? <span className="eb-dock-meta">{countLabel(parsed.valueCount, 'value')}</span> : null}
      </div>
      {showBodyHint(state) ? (
        <p className="eb-json-hint">
          This sample has a top-level <code>body</code> key. If you pasted the full output, choose{' '}
          <strong>Full output</strong>.
        </p>
      ) : null}
      {parsed ? (
        <PayloadTree
          labelledBy={headingId}
          value={parsed.value}
          rootLabel={rootExpression(state)}
          expanded={state.expanded}
          showAll={state.showAll}
          selectedPath={state.selectedPath}
          onSelect={(path) => dispatch({ type: 'select', path })}
          onToggle={(key) => dispatch({ type: 'toggleExpanded', key })}
          onShowAll={(key) => dispatch({ type: 'showAll', key })}
        />
      ) : (
        <div className="eb-json-empty">
          <p className="eb-json-empty-title">No sample yet</p>
          <p>Paste an action or trigger output from a flow run, then select Parse.</p>
        </div>
      )}
    </section>
  );
}
