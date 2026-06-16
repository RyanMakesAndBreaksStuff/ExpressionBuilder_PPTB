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
  return (
    <div className="eb-tab-strip" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'active' : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
