import { useCallback, useId, type Dispatch } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import type { JsonReferenceAction } from './jsonReferenceState';
import type { PayloadTab, PayloadReveal, JsonPayloadSession, JsonPayloadAction } from './jsonPayloadSession';
import { JsonReferenceWorkspace } from './JsonReferenceWorkspace';
import { PayloadStrip } from './PayloadStrip';
import { PayloadSearch } from './PayloadSearch';

function JsonPayloadPane({
  payload,
  active,
  adapter,
  dispatch,
  reveal,
}: {
  payload: PayloadTab;
  active: boolean;
  adapter: PlatformAdapter;
  dispatch: Dispatch<JsonPayloadAction>;
  reveal: PayloadReveal | null;
}) {
  const payloadId = payload.id;
  const edit = useCallback((action: JsonReferenceAction) => {
    dispatch({ type: 'edit', payloadId, action });
  }, [dispatch, payloadId]);

  return (
    <JsonReferenceWorkspace
      adapter={adapter}
      active={active}
      state={payload.state}
      dispatch={edit}
      reveal={reveal}
    />
  );
}

export function JsonPayloadWorkspace({
  session,
  dispatch,
  adapter,
  active,
}: {
  session: JsonPayloadSession;
  dispatch: Dispatch<JsonPayloadAction>;
  adapter: PlatformAdapter;
  active: boolean;
}) {
  const baseId = useId();

  return (
    <div className="eb-json-session">
      <PayloadStrip
        baseId={baseId}
        session={session}
        dispatch={dispatch}
        searchControl={
          <PayloadSearch payloads={session.payloads} dispatch={dispatch} />
        }
      />
      {session.payloads.map((payload) => (
        <section
          key={payload.id}
          id={`${baseId}-panel-${payload.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${payload.id}`}
          hidden={payload.id !== session.activeId}
          className="eb-json-payload-page"
        >
          <JsonPayloadPane
            payload={payload}
            adapter={adapter}
            active={active && payload.id === session.activeId}
            dispatch={dispatch}
            reveal={session.reveal?.payloadId === payload.id
              ? session.reveal
              : null}
          />
        </section>
      ))}
    </div>
  );
}
