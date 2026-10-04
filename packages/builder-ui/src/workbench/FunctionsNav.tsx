import { useId, useRef } from 'react';
import { ChevronRightRegular } from '@fluentui/react-icons';
import type { FunctionGroup } from '@ryanmakes/eb_engine';
import type { NavGroup } from './functionsState';
import type { ParsedValueList } from './parsedValueModel';
import { ParsedValueEntries } from './ParsedValueEntries';

export interface FunctionsNavProps {
  groups: NavGroup[];
  selectedFunction: string;
  search: string;
  parsedValue: ParsedValueList;
  parsedValueExpanded: boolean;
  onSearchChange: (value: string) => void;
  onToggleGroup: (group: FunctionGroup) => void;
  onToggleParsedValue: () => void;
  /** The argument input focused when the pick began, else null (FR-15). */
  onSelectFunction: (name: string, wrapArg: string | null) => void;
  onInsertReference: (expression: string) => void;
}

export function FunctionsNav({
  groups,
  selectedFunction,
  search,
  parsedValue,
  parsedValueExpanded,
  onSearchChange,
  onToggleGroup,
  onToggleParsedValue,
  onSelectFunction,
  onInsertReference,
}: FunctionsNavProps) {
  const wrapArg = useRef<string | null>(null);
  const baseId = useId();

  return (
    <nav className="eb-fn-nav" aria-label="Functions">
      <input
        className="eb-fn-search"
        type="search"
        aria-label="Search functions"
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />

      {groups.map(({ group, functions, total, expanded }) => (
        <div className="eb-fn-group" key={group}>
          <button
            className="eb-fn-group-row"
            type="button"
            aria-expanded={expanded}
            aria-label={group + ' ' + total}
            onClick={() => onToggleGroup(group)}
          >
            <ChevronRightRegular aria-hidden="true" />
            <span>{group}</span>
            <span>{total}</span>
          </button>
          {expanded
            ? functions.map((fn) => (
              <button
                className="eb-fn-row"
                type="button"
                key={fn.name}
                aria-current={fn.name === selectedFunction}
                draggable
                onMouseDown={() => {
                  const active = document.activeElement;
                  wrapArg.current = active instanceof HTMLElement ? (active.dataset.arg ?? null) : null;
                }}
                onKeyDown={() => {
                  wrapArg.current = null;
                }}
                onDragStart={(event) => {
                  wrapArg.current = null;
                  event.dataTransfer.setData('text/plain', fn.name + '()');
                }}
                onClick={() => {
                  onSelectFunction(fn.name, wrapArg.current);
                  wrapArg.current = null;
                }}
              >
                {fn.name}
              </button>
            ))
            : null}
        </div>
      ))}

      <div className="eb-fn-group">
        <button
          className="eb-fn-group-row"
          type="button"
          aria-expanded={parsedValueExpanded}
          aria-label={'Parsed Value ' + parsedValue.rows.length}
          onClick={onToggleParsedValue}
        >
          <ChevronRightRegular aria-hidden="true" />
          <span>Parsed Value</span>
          <span>{parsedValue.rows.length}</span>
        </button>
        {parsedValueExpanded ? (
          <div>
            <ParsedValueEntries
              entries={parsedValue.entries}
              baseId={baseId}
              onInsertReference={onInsertReference}
            />
            {parsedValue.emptyMessage ? <div>{parsedValue.emptyMessage}</div> : null}
            {parsedValue.hiddenCount > 0
              ? <div>+{parsedValue.hiddenCount} more — narrow with search</div>
              : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}