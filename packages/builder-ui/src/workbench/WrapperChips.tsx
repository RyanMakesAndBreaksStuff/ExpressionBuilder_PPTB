import { CodeIcon } from './icons/BuilderIcons';

const wrappers: Array<{ id: string; label: string; detail: string }> = [
  { id: 'toLower', label: 'toLower', detail: 'Normalize text before comparing.' },
  { id: 'toUpper', label: 'toUpper', detail: 'Uppercase text before comparing.' },
  { id: 'trim', label: 'trim', detail: 'Remove leading and trailing spaces.' },
  { id: 'length', label: 'length', detail: 'Compare string length.' },
  { id: 'coalesce', label: 'coalesce', detail: 'Fall back to empty when null.' },
];

interface WrapperChipsProps {
  selected: string[];
  onToggle: (wrapperId: string) => void;
  onClearSelection: () => void;
}

export function WrapperChips({ selected, onToggle, onClearSelection }: WrapperChipsProps) {
  return (
    <div className="eb-wrap-stack">
      <div className="eb-wrap-grid" aria-label="Function wrappers">
        {wrappers.map((wrapper) => {
          const isSelected = selected.includes(wrapper.id);
          return (
            <button
              key={wrapper.id}
              type="button"
              className={`eb-wrap-chip${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={`Select ${wrapper.label}: ${wrapper.detail}`}
              title={wrapper.detail}
              onClick={() => onToggle(wrapper.id)}
            >
              <CodeIcon />
              <span aria-hidden="true">{wrapper.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="eb-text-btn"
        onClick={onClearSelection}
        disabled={selected.length === 0}
        aria-label="Clear wrapper selection"
      >
        Clear selection
      </button>
    </div>
  );
}
