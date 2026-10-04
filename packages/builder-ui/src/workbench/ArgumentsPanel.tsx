import { useId } from 'react';
import { argKind, argTypeLabel, type ArgumentSlot } from './functionsState';
import { NO_TEXT_ASSISTANCE } from './jsonReferenceState';

export interface ArgumentsPanelProps {
  functionName: string;
  slots: ArgumentSlot[];
  onArgChange: (name: string, value: string) => void;
  onArgFocus: (name: string) => void;
}

export function ArgumentsPanel({
  functionName,
  slots,
  onArgChange,
  onArgFocus,
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
              aria-describedby={typeId}
              aria-required={slot.required}
              className="eb-fn-input"
              data-arg={slot.name}
              data-kind={argKind(slot)}
              value={slot.value}
              placeholder={slot.sample ?? 'Type a value or pick a function'}
              onChange={(event) => onArgChange(slot.name, event.target.value)}
              onFocus={() => onArgFocus(slot.name)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const text = event.dataTransfer.getData('text/plain');
                if (text !== '') {
                  event.preventDefault();
                  onArgChange(slot.name, text);
                }
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
