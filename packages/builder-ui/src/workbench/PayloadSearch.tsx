import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type KeyboardEvent } from 'react';
import { pathKey } from '../importExport/jsonPayload';
import type { PayloadTab, PayloadSearchMatch, JsonPayloadAction } from './jsonPayloadSession';
import { searchPayloads } from './payloadSearchModel';

export function PayloadSearch({
  payloads,
  dispatch,
}: {
  payloads: readonly PayloadTab[];
  dispatch: Dispatch<JsonPayloadAction>;
}) {
  const baseId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const result = useMemo(() => searchPayloads(payloads, query), [payloads, query]);
  const open = focused && query.trim() !== '';
  const activeIndex = result.matches.length === 0
    ? -1
    : Math.min(index, result.matches.length - 1);

  useLayoutEffect(() => {
    if (!open) return;
    function position(): void {
      const bounds = input.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(420, innerWidth - 24);
      const below = innerHeight - bounds.bottom - 18;
      const above = bounds.top - 18;
      const upward = below < 160 && above > below;
      setPlacement({
        width,
        left: Math.max(12, Math.min(bounds.left, innerWidth - width - 12)),
        maxHeight: Math.max(0, upward ? above : below),
        top: upward ? undefined : bounds.bottom + 6,
        bottom: upward ? innerHeight - bounds.top + 6 : undefined,
      });
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  function choose(match: PayloadSearchMatch): void {
    dispatch({ type: 'reveal', match });
    setQuery('');
    setIndex(0);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery('');
      setIndex(0);
      return;
    }
    if (!open || result.matches.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setIndex((activeIndex + step + result.matches.length) %
        result.matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(result.matches[activeIndex]);
    }
  }

  return (
    <div className="eb-payload-search">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search all payloads"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-list` : undefined}
        aria-activedescendant={open && activeIndex >= 0
          ? `${baseId}-option-${activeIndex}` : undefined}
        value={query}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setIndex(0);
        }}
        onKeyDown={keyDown}
      />
      {open ? (
        <div className="eb-payload-search-popup" style={placement}>
          <p role="status">
            {result.total} matches · {result.parsedSourceCount} parsed payloads
          </p>
          <div role="listbox" id={`${baseId}-list`} aria-label="Payload matches">
            {result.matches.map((match, optionIndex) => (
              <div
                key={`${match.payloadId}:${pathKey(match.path)}`}
                id={`${baseId}-option-${optionIndex}`}
                role="option"
                aria-selected={optionIndex === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(match)}
              >
                <strong>{match.payloadLabel}</strong>
                <code>{match.pathLabel}</code>
                <span>{match.preview}</span>
              </div>
            ))}
          </div>
          {result.total === 0
            ? <p>No matches in parsed payloads.</p>
            : null}
        </div>
      ) : null}
    </div>
  );
}
