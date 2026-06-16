import type { KeyboardEvent } from 'react';
import type { ExpressionMode } from '@ryanmakes/eb_engine';

interface ModeSegmentedControlProps {
  mode: ExpressionMode;
  onChange: (mode: ExpressionMode) => void;
}

const modes: Array<{ value: ExpressionMode; label: string }> = [
  { value: 'triggerCondition', label: 'Trigger condition' },
  { value: 'filterArray', label: 'Filter array' },
];

export function ModeSegmentedControl({ mode, onChange }: ModeSegmentedControlProps) {
  const selectOffset = (offset: number) => {
    const index = modes.findIndex((item) => item.value === mode);
    const next = modes[(index + offset + modes.length) % modes.length];
    onChange(next.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectOffset(1);
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectOffset(-1);
    }
  };

  return (
    <div className="eb-segmented" role="radiogroup" aria-label="Expression mode">
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={mode === item.value}
          onClick={() => onChange(item.value)}
          onKeyDown={handleKeyDown}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
