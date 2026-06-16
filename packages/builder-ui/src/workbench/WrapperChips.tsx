const wrappers = [
  { id: 'toLower', label: 'toLower', detail: 'Normalize text before comparing.' },
  { id: 'toUpper', label: 'toUpper', detail: 'Uppercase text before comparing.' },
  { id: 'trim', label: 'trim', detail: 'Remove leading and trailing spaces.' },
  { id: 'coalesce', label: 'coalesce', detail: 'Fallback when a value is null.' },
  { id: 'addDays', label: 'addDays', detail: 'Offset a date by a number of days.' },
  { id: 'utcNow', label: 'utcNow', detail: 'Use the current UTC timestamp.' },
] as const;

export function WrapperChips() {
  return (
    <div className="eb-wrap-grid" aria-label="Function wrappers">
      {wrappers.map((wrapper) => (
        <button key={wrapper.id} type="button" className="eb-wrap-chip" aria-label={`Use ${wrapper.label} wrapper`}>
          <span aria-hidden="true">{wrapper.label}</span>
          <span className="eb-sr-only">{wrapper.detail}</span>
        </button>
      ))}
    </div>
  );
}
