import { useLayoutEffect, useRef, type Dispatch, type KeyboardEvent, type ReactNode } from 'react';
import { payloadLabel, type JsonPayloadSession, type JsonPayloadAction } from './jsonPayloadSession';
import { parseStatus, rootExpression } from './jsonReferenceState';

export function PayloadStrip({
  baseId,
  session,
  dispatch,
  searchControl,
}: {
  baseId: string;
  session: JsonPayloadSession;
  dispatch: Dispatch<JsonPayloadAction>;
  searchControl: ReactNode;
}) {
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef(false);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const tab = tabs.current.get(session.activeId);
    tab?.focus();
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [session.activeId, session.payloads]);

  function navigate(event: KeyboardEvent, index: number): void {
    const count = session.payloads.length;
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : event.key === 'ArrowRight' ? (index + 1) % count
      : event.key === 'ArrowLeft' ? (index + count - 1) % count
      : null;
    if (next === null) return;
    event.preventDefault();
    pendingFocus.current = true;
    dispatch({
      type: 'activate',
      payloadId: session.payloads[next].id,
    });
    if (session.payloads[next].id === session.activeId) {
      tabs.current.get(session.activeId)?.focus();
      pendingFocus.current = false;
    }
  }

  return (
    <div className="eb-payload-strip">
      <div className="eb-payload-tabs">
        {/* The add card sits in the row but outside the tablist, which may only own tabs. */}
        <div role="tablist" aria-label="Payloads" className="eb-payload-tablist">
          {session.payloads.map((payload, index) => {
            const label = payloadLabel(session.payloads, index);
            const pending = payload.state.error === null &&
              payload.state.text !== payload.state.lastAttemptedText &&
              (payload.state.text.trim() !== '' ||
               payload.state.lastSuccessfulPayload !== null);
            const status = parseStatus(payload.state);
            const tone = pending ? 'warn' : status.tone;
            const statusText = pending ? 'Pending validation' : status.text;
  
            return (
              <div key={payload.id} role="presentation" className="eb-payload-tab">
                <button
                  ref={(element) => {
                    if (element) tabs.current.set(payload.id, element);
                    else tabs.current.delete(payload.id);
                  }}
                  id={`${baseId}-tab-${payload.id}`}
                  type="button"
                  role="tab"
                  aria-label={`${label}, payload ${index + 1}`}
                  aria-selected={payload.id === session.activeId}
                  aria-controls={`${baseId}-panel-${payload.id}`}
                  aria-describedby={`${baseId}-status-${payload.id}`}
                  tabIndex={payload.id === session.activeId ? 0 : -1}
                  onClick={() => dispatch({
                    type: 'activate',
                    payloadId: payload.id,
                  })}
                  onKeyDown={(event) => navigate(event, index)}
                >
                  <code className="eb-payload-root" title={rootExpression(payload.state)}>
                    {rootExpression(payload.state)}
                  </code>
                  <span aria-hidden="true" className="eb-payload-state">
                    <span className={`eb-payload-dot is-${tone}`}></span>
                    <span className="eb-payload-state-text">{statusText}</span>
                  </span>
                </button>
                <span id={`${baseId}-status-${payload.id}`}
                  className="eb-visually-hidden">
                  {rootExpression(payload.state)}. {statusText}
                </span>
                {session.payloads.length > 1 ? (
                  <button
                    type="button"
                    className="eb-payload-close"
                    aria-label={`Close ${label}, payload ${index + 1}`}
                    onClick={() => {
                      pendingFocus.current = true;
                      dispatch({ type: 'close', payloadId: payload.id });
                    }}
                  >×</button>
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="eb-payload-add"
          disabled={session.payloads.length === 5}
          onClick={() => {
            pendingFocus.current = true;
            dispatch({ type: 'add' });
          }}
        >+ New payload</button>
      </div>
      <span className="eb-payload-count">{session.payloads.length} / 5</span>
      {searchControl}
    </div>
  );
}
