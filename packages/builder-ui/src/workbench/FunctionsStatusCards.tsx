import type { FunctionsDerived } from './functionsState';

export interface FunctionsStatusCardsProps {
  derived: FunctionsDerived;
}

export function FunctionsStatusCards({ derived }: FunctionsStatusCardsProps) {
  const optionalEmptyLabel = derived.optionalEmpty === 1
    ? 'optional'
    : 'optionals';

  return (
    <>
      <section
        className="eb-fn-card"
        data-tone={derived.valid ? 'good' : 'danger'}
        aria-label="Status"
      >
        <span>Status</span>
        <strong>{derived.valid ? 'Valid' : 'Invalid'}</strong>
        <span>
          {derived.error
            ?? `${derived.requiredSet} of ${derived.requiredTotal} required set`}
        </span>
      </section>
      <section className="eb-fn-card" aria-label="Arguments set">
        <span>Arguments set</span>
        <strong>{`${derived.setCount} / ${derived.shownCount}`}</strong>
        <span>{`${derived.optionalEmpty} ${optionalEmptyLabel} left empty`}</span>
      </section>
    </>
  );
}