import { useId, type Dispatch } from 'react';
import { ActionButton } from './controls/ActionButton';
import { ChoiceGroup } from './controls/ChoiceGroup';
import {
  parseStatus,
  rootExpression,
  showActionNameInvalid,
  type JsonReferenceAction,
  type JsonReferenceState,
  type OutputFrom,
} from './jsonReferenceState';

interface JsonSourcePaneProps {
  state: JsonReferenceState;
  dispatch: Dispatch<JsonReferenceAction>;
}

const OUTPUT_FROM_OPTIONS = [
  { value: 'action', label: 'Action' },
  { value: 'trigger', label: 'Trigger' },
] as const satisfies ReadonlyArray<{ value: OutputFrom; label: string }>;

// Off for pasted payloads and names: some browsers send spell-check text to a
// cloud service (FR-062).
const NO_TEXT_ASSISTANCE = {
  spellCheck: false,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
} as const;

export function JsonSourcePane({ dispatch, state }: JsonSourcePaneProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const outputFromId = `${id}-output-from`;
  const nameId = `${id}-name`;
  const nameHelpId = `${id}-name-help`;
  const shapeId = `${id}-shape`;
  const sampleId = `${id}-sample`;
  const errorId = `${id}-error`;
  const nameInvalid = showActionNameInvalid(state);
  const status = parseStatus(state);

  return (
    <section className="eb-json-card eb-json-source" aria-labelledby={headingId}>
      <div className="eb-json-card-header">
        <h2 id={headingId}>Source</h2>
      </div>
      <div className="eb-json-card-body">
        <div className="eb-json-field">
          <span className="eb-label" id={outputFromId}>
            Output from
          </span>
          <ChoiceGroup
            className="eb-choice-pill"
            labelledBy={outputFromId}
            options={OUTPUT_FROM_OPTIONS}
            value={state.outputFrom}
            onChange={(value) => dispatch({ type: 'setOutputFrom', value })}
          />
        </div>

        {state.outputFrom === 'action' ? (
          <div className="eb-json-field">
            <label className="eb-label" htmlFor={nameId}>
              Action name
            </label>
            <input
              {...NO_TEXT_ASSISTANCE}
              id={nameId}
              className="eb-input"
              value={state.actionName}
              aria-invalid={nameInvalid}
              aria-describedby={nameHelpId}
              onChange={(event) => dispatch({ type: 'setActionName', value: event.target.value })}
            />
            <p id={nameHelpId} className={`eb-json-help${nameInvalid ? ' is-invalid' : ''}`}>
              {nameInvalid
                ? 'Enter the action name to build the reference.'
                : 'As shown in the flow designer. Spaces become underscores.'}
            </p>
          </div>
        ) : null}

        <div className="eb-json-field">
          <span className="eb-label" id={shapeId}>
            The pasted JSON is
          </span>
          <ChoiceGroup
            className="eb-choice-cards"
            labelledBy={shapeId}
            value={state.shape}
            onChange={(value) => dispatch({ type: 'setShape', value })}
            options={[
              {
                value: 'full',
                label: state.outputFrom === 'action' ? 'Full output (also Compose)' : 'Full output',
                detail: <code>{rootExpression(state, 'full')}</code>,
              },
              { value: 'body', label: 'Body only', detail: <code>{rootExpression(state, 'body')}</code> },
            ]}
          />
        </div>

        <div className="eb-json-field eb-json-sample">
          <label className="eb-label" htmlFor={sampleId}>
            Sample JSON
          </label>
          <textarea
            {...NO_TEXT_ASSISTANCE}
            id={sampleId}
            className="eb-textarea"
            placeholder="Paste the output from a flow run"
            value={state.text}
            aria-invalid={state.error !== null}
            aria-describedby={state.error !== null ? errorId : undefined}
            onChange={(event) => dispatch({ type: 'setText', value: event.target.value })}
          />
        </div>

        <div className="eb-json-parse-row">
          <ActionButton onClick={() => dispatch({ type: 'parse' })}>Parse</ActionButton>
          <span role="status" className={`eb-json-status is-${status.tone}`}>
            {status.text}
          </span>
        </div>

        {state.error !== null ? (
          <div id={errorId} role="alert" className="eb-json-error">
            {state.error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
