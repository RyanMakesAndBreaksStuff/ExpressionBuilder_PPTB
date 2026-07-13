import { useRef } from 'react';

export interface TabStripTab<T extends string> {
  id: T;
  label: string;
}

interface TabStripProps<T extends string> {
  activeTab: T;
  label: string;
  tabs: Array<TabStripTab<T>>;
  onChange: (tab: T) => void;
}

export function TabStrip<T extends string>({ activeTab, label, tabs, onChange }: TabStripProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelect = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    buttonRefs.current[(index + tabs.length) % tabs.length]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndSelect(tabs.length - 1);
        break;
    }
  };

  return (
    <div className="eb-tab-strip" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={isActive ? 'active' : undefined}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
