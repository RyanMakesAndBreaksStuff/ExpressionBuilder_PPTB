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

function ParsedValueSources({
  list,
  baseId,
  onInsertReference,
}: {
  list: ParsedValueList;
  baseId: string;
  onInsertReference: (expression: string) => void;
}) {
  return (
    <>
      {list.emptyMessage ? <div>{list.emptyMessage}</div> : null}
      {list.sources.map((source) => {
        const content = (
          <>
            <ParsedValueEntries
              entries={source.entries}
              baseId={`${baseId}-${source.id}`}
              descriptionPrefix={list.sources.length > 1
                ? `${source.label}, ${source.rootCaption}`
                : undefined}
              onInsertReference={onInsertReference}
            />
            {source.emptyMessage ? <div>{source.emptyMessage}</div> : null}
          </>
        );
        return list.sources.length === 1
          ? <div key={source.id}>{content}</div>
          : (
            <details key={source.id} className="eb-pv-item eb-pv-source">
              <summary>
                {source.label} · {source.rootCaption} · {source.matchingCount}
              </summary>
              {content}
            </details>
          );
      })}
      {list.hiddenCount > 0
        ? <div>+{list.hiddenCount} more — narrow with search</div>
        : null}
    </>
  );
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
          aria-label={'Parsed Value ' + parsedValue.visibleCount}
          onClick={onToggleParsedValue}
        >
          <ChevronRightRegular aria-hidden="true" />
          <span>Parsed Value</span>
          <span>{parsedValue.visibleCount}</span>
        </button>
        {parsedValueExpanded ? (
          <ParsedValueSources
            list={parsedValue}
            baseId={baseId}
            onInsertReference={onInsertReference}
          />
        ) : null}
      </div>
    </nav>
  );
}