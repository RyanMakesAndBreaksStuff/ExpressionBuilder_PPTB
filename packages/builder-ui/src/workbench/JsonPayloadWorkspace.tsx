import { useCallback, useEffect, useId, useState, type Dispatch } from 'react';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import type { JsonReferenceAction } from './jsonReferenceState';
import type { PayloadTab, PayloadReveal, JsonPayloadSession, JsonPayloadAction } from './jsonPayloadSession';
import { JsonReferenceWorkspace, type ValueAlign } from './JsonReferenceWorkspace';
import { PayloadStrip } from './PayloadStrip';
import { PayloadSearch } from './PayloadSearch';

const VALUE_ALIGN_KEY = 'eb.json.valueAlign.v1';

function JsonPayloadPane({
  payload,
  active,
  adapter,
  dispatch,
  reveal,
  valueAlign,
  onValueAlignChange,
}: {
  payload: PayloadTab;
  active: boolean;
  adapter: PlatformAdapter;
  dispatch: Dispatch<JsonPayloadAction>;
  reveal: PayloadReveal | null;
  valueAlign: ValueAlign;
  onValueAlignChange: (value: ValueAlign) => void;
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
      valueAlign={valueAlign}
      onValueAlignChange={onValueAlignChange}
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
  // One choice for every payload tab, remembered in the host's settings.
  const [valueAlign, setValueAlign] = useState<ValueAlign>('right');

  useEffect(() => {
    let current = true;
    adapter.settings.get(VALUE_ALIGN_KEY).then((stored) => {
      if (current && (stored === 'left' || stored === 'right')) setValueAlign(stored);
    }, () => undefined);
    return () => {
      current = false;
    };
  }, [adapter]);

  const changeValueAlign = useCallback((value: ValueAlign) => {
    setValueAlign(value);
    adapter.settings.set(VALUE_ALIGN_KEY, value).catch(() => undefined);
  }, [adapter]);

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
            valueAlign={valueAlign}
            onValueAlignChange={changeValueAlign}
          />
        </section>
      ))}
    </div>
  );
}
