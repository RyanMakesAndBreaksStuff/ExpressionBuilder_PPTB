import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line, such as the root an option card produces; exposed as the description. */
  detail?: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  className: string;
  options: ReadonlyArray<ChoiceOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Id of a visible label; use `ariaLabel` when the group has none. */
  labelledBy?: string;
  ariaLabel?: string;
}

const STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * A WAI-ARIA radio group with one tab stop (FR-081): only the checked option
 * is tabbable, and the arrow keys move the choice and the focus together, so
 * screen readers announce the new choice.
 */
export function ChoiceGroup<T extends string>({
  ariaLabel,
  className,
  labelledBy,
  onChange,
  options,
  value,
}: ChoiceGroupProps<T>) {
  const id = useId();
  const radios = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    radios.current[next]?.focus();
  };

  return (
    <div className={className} role="radiogroup" aria-labelledby={labelledBy} aria-label={ariaLabel}>
      {options.map((option, index) => {
        const checked = option.value === value;
        const labelId = `${id}-${index}-label`;
        const detailId = `${id}-${index}-detail`;
        return (
          <button
            key={option.value}
            ref={(element) => {
              radios.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={option.detail ? labelId : undefined}
            aria-describedby={option.detail ? detailId : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span id={labelId} className="eb-choice-label">
              {option.label}
            </span>
            {option.detail ? (
              <span id={detailId} className="eb-choice-detail">
                {option.detail}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
