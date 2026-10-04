import { useRef, type KeyboardEvent } from 'react';
import { BuilderIcon, CodeIcon } from './icons/BuilderIcons';
import type { BuilderPanelIds, BuilderView } from './types';

interface BuilderTabsProps {
  view: BuilderView;
  ruleCount: number;
  ids: BuilderPanelIds;
  onChange: (view: BuilderView) => void;
}

const VIEWS: BuilderView[] = ['condition', 'jsonReference'];

/**
 * WAI-ARIA tabs with automatic activation (FR-004): only the selected tab is in
 * the Tab order, and moving focus with the arrow keys, Home or End selects.
 */
export function BuilderTabs({ ids, onChange, ruleCount, view }: BuilderTabsProps) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const targets: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: VIEWS.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = (target + VIEWS.length) % VIEWS.length;
    onChange(VIEWS[next]);
    tabs.current[next]?.focus();
  };

  const rules = `${ruleCount} ${ruleCount === 1 ? 'rule' : 'rules'}`;

  return (
    <div className="eb-builder-tabs" role="tablist" aria-label="Builders">
      <button
        ref={(element) => {
          tabs.current[0] = element;
        }}
        id={ids.conditionTab}
        type="button"
        role="tab"
        className="eb-builder-tab"
        aria-selected={view === 'condition'}
        aria-controls={ids.conditionPanel}
        aria-label={`Condition builder, ${rules}`}
        tabIndex={view === 'condition' ? 0 : -1}
        onClick={() => onChange('condition')}
        onKeyDown={(event) => handleKeyDown(event, 0)}
      >
        <BuilderIcon aria-hidden="true" />
        <span>Condition builder</span>
        <span className="eb-builder-tab-count" aria-hidden="true">
          {ruleCount}
        </span>
      </button>
      <button
        ref={(element) => {
          tabs.current[1] = element;
        }}
        id={ids.jsonTab}
        type="button"
        role="tab"
        className="eb-builder-tab"
        aria-selected={view === 'jsonReference'}
        aria-controls={ids.jsonPanel}
        tabIndex={view === 'jsonReference' ? 0 : -1}
        onClick={() => onChange('jsonReference')}
        onKeyDown={(event) => handleKeyDown(event, 1)}
      >
        <CodeIcon aria-hidden="true" />
        <span>JSON reference</span>
      </button>
    </div>
  );
}
