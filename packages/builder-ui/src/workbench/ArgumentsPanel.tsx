import { useId } from 'react';
import { argKind, argTypeLabel, type ArgumentSlot } from './functionsState';
import { NO_TEXT_ASSISTANCE } from './jsonReferenceState';

export interface ArgumentsPanelProps {
  functionName: string;
  slots: ArgumentSlot[];
  onArgChange: (name: string, value: string) => void;
  onArgFocus: (name: string) => void;
  /** Alt+ArrowDown: keep `name` as the insert target and move focus into Parsed Value. */
  onPickParsedValue: (name: string) => void;
}

export function ArgumentsPanel({
  functionName,
  slots,
  onArgChange,
  onArgFocus,
  onPickParsedValue,
}: ArgumentsPanelProps) {
  const idPrefix = useId();

  return (
    <section className="eb-fn-panel">
      <h2>
        Arguments <span>{functionName}</span>
      </h2>
      {slots.map((slot, index) => {
        const id = `${idPrefix}-arg-${index}`;
        const typeId = `${id}-type`;
        const hintId = `${id}-hint`;
        return (
          <div className="eb-fn-arg" key={slot.name}>
            <label htmlFor={id}>
              {slot.name}
              {' '}
              <span aria-hidden="true">{slot.required ? 'required' : 'optional'}</span>
              {' '}
              <span className="eb-fn-arg-type" id={typeId}>({argTypeLabel(slot.type)})</span>
            </label>
            <input
              {...NO_TEXT_ASSISTANCE}
              id={id}
              aria-label={slot.name}
              aria-describedby={`${typeId} ${hintId}`}
              aria-keyshortcuts="Alt+ArrowDown"
              aria-required={slot.required}
              className="eb-fn-input"
              data-arg={slot.name}
              data-kind={argKind(slot)}
              value={slot.value}
              placeholder={slot.sample ?? 'Type a value or pick a function'}
              onChange={(event) => onArgChange(slot.name, event.target.value)}
              onFocus={() => onArgFocus(slot.name)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                  event.preventDefault();
                  onPickParsedValue(slot.name);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const text = event.dataTransfer.getData('text/plain');
                if (text !== '') {
                  event.preventDefault();
                  onArgChange(slot.name, text);
                }
              }}
            />
            <span id={hintId} className="eb-visually-hidden">Alt+Down to pick a parsed value</span>
          </div>
        );
      })}
    </section>
  );
}
