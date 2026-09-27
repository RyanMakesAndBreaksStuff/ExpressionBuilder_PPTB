import { useId, type Dispatch } from 'react';
import { ActionButton } from './controls/ActionButton';
import { ChoiceGroup } from './controls/ChoiceGroup';
import {
  ACTION_NAME_PLACEHOLDER,
  parseStatus,
  rootExpressionFor,
  showActionNameInvalid,
  type JsonReferenceAction,
  type JsonReferenceState,
  type OutputFrom,
  type PayloadShape,
} from './jsonReferenceState';

interface JsonSourcePaneProps {
  state: JsonReferenceState;
  dispatch: Dispatch<JsonReferenceAction>;
}

type ReferenceRootKey = `${OutputFrom}-${PayloadShape}`;

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
  const rootId = `${id}-root`;
  const nameId = `${id}-name`;
  const nameHelpId = `${id}-name-help`;
  const sampleId = `${id}-sample`;
  const errorId = `${id}-error`;
  const nameInvalid = showActionNameInvalid(state);
  const status = parseStatus(state);
  const rootKey: ReferenceRootKey = `${state.outputFrom}-${state.shape}`;

  const rootOptions = [
    { value: 'action-full' as ReferenceRootKey, label: 'Action · Full output', detail: <code>{rootExpressionFor(state, 'action', 'full')}</code> },
    { value: 'action-body' as ReferenceRootKey, label: 'Action · Body only', detail: <code>{rootExpressionFor(state, 'action', 'body')}</code> },
    { value: 'trigger-full' as ReferenceRootKey, label: 'Trigger · Full output', detail: <code>{rootExpressionFor(state, 'trigger', 'full')}</code> },
    { value: 'trigger-body' as ReferenceRootKey, label: 'Trigger · Body only', detail: <code>{rootExpressionFor(state, 'trigger', 'body')}</code> },
  ];

  const handleRootChange = (key: ReferenceRootKey) => {
    const [outputFrom, shape] = key.split('-') as [OutputFrom, PayloadShape];
    dispatch({ type: 'setReferenceRoot', outputFrom, shape });
  };

  return (
    <section className="eb-json-card eb-json-source" aria-labelledby={headingId}>
      <div className="eb-json-card-header">
        <h2 id={headingId}>Source</h2>
      </div>
      <div className="eb-json-card-body">
        <div className="eb-json-field">
          <span className="eb-label" id={rootId}>Reference root</span>
          <ChoiceGroup
            className="eb-choice-grid"
            labelledBy={rootId}
            options={rootOptions}
            value={rootKey}
            onChange={handleRootChange}
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
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text');
              if (!pasted) return;
              event.preventDefault();
              dispatch({ type: 'pasteAndParse', text: pasted, defaultActionName: ACTION_NAME_PLACEHOLDER });
            }}
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
