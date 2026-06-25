import { CodeIcon } from './icons/BuilderIcons';
import type { QueryRule } from '../composer/querySchema';

const wrappers: Array<{ id: QueryRule['valueFunction'] | 'formatDateTime' | 'length'; label: string; detail: string }> = [
  { id: 'toLower', label: 'toLower', detail: 'Normalize text before comparing.' },
  { id: 'toUpper', label: 'toUpper', detail: 'Uppercase text before comparing.' },
  { id: 'trim', label: 'trim', detail: 'Remove leading and trailing spaces.' },
  { id: 'coalesce', label: 'coalesce', detail: 'Fallback when a value is null.' },
  { id: 'addDays', label: 'addDays', detail: 'Offset a date by a number of days.' },
  { id: 'utcNow', label: 'utcNow', detail: 'Use the current UTC timestamp.' },
  { id: 'formatDateTime', label: 'formatDateTime', detail: 'Format a date string.' },
  { id: 'length', label: 'length', detail: 'Get string length.' },
];

interface WrapperChipsProps {
  onApply: (wrapperId: string) => void;
}

export function WrapperChips({ onApply }: WrapperChipsProps) {
  return (
    <div className="eb-wrap-grid" aria-label="Function wrappers">
      {wrappers.map((wrapper) => (
        <button
          key={wrapper.id}
          type="button"
          className="eb-wrap-chip"
          aria-label={`Apply ${wrapper.label}: ${wrapper.detail}`}
          title={wrapper.detail}
          onClick={() => onApply(wrapper.id as string)}
        >
          <CodeIcon />
          <span aria-hidden="true">{wrapper.label}</span>
        </button>
      ))}
    </div>
  );
}
