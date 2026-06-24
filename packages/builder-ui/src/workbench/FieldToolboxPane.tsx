import { useMemo, useState } from 'react';
import { TypeGlyph } from '../components/TypeGlyph';
import type { FieldToolboxPaneProps } from './types';
import { DockPane } from './controls/DockPane';
import { TabStrip } from './controls/TabStrip';
import { WrapperChips } from './WrapperChips';
import { SourceChip } from './SourceChip';
import { GetStartedPanel } from './GetStartedPanel';

export function FieldToolboxPane({
  activeTab,
  collapsed,
  fields,
  source,
  onSwitchTable,
  onImport,
  onAddField,
  onLoadSamples,
  onManageProfiles,
  onRefresh,
  onTabChange,
  onToggleCollapsed,
}: FieldToolboxPaneProps) {
  const [search, setSearch] = useState('');
  const filteredFields = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length === 0) {
      return fields;
    }

    return fields.filter((field) => {
      const haystack = [field.label, field.id, field.type, field.path.join('.')].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [fields, search]);

  return (
    <DockPane
      title="Toolbox"
      side="left"
      collapsed={collapsed}
      meta=""
      tabs={
        <TabStrip
          label="Toolbox tabs"
          activeTab={activeTab}
          tabs={[
            { id: 'dynamicContent', label: 'Dynamic Content' },
            { id: 'wrappers', label: 'Wrappers' },
          ]}
          onChange={onTabChange}
        />
      }
      onToggleCollapsed={onToggleCollapsed}
    >
      {activeTab === 'dynamicContent' ? (
        <div className="eb-toolbox-stack">
          <SourceChip
            source={source}
            onSwitchTable={onSwitchTable}
            onImport={onImport}
            onAddField={onAddField}
            onLoadSamples={onLoadSamples}
            onManageProfiles={onManageProfiles}
            onRefresh={onRefresh}
          />
          {fields.length === 0 ? (
            <GetStartedPanel
              onSwitchTable={onSwitchTable}
              onImport={onImport}
              onAddField={onAddField}
              onLoadSamples={onLoadSamples}
            />
          ) : (
            <>
              <input
                className="eb-search-box"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search fields..."
                aria-label="Search dynamic content fields"
              />
              <ul className="eb-field-list" role="list" aria-label="Dynamic content fields">
                {filteredFields.map((field) => (
                  <li key={field.id}>
                    <div className="eb-field-row" tabIndex={0}>
                      <TypeGlyph type={field.type} />
                      <span className="eb-field-main">
                        <span className="eb-field-title">{field.label}</span>
                        <span className="eb-field-detail">{field.path.join('.')} · {field.type}</span>
                      </span>
                      <span className="eb-field-type-badge">{field.type}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <WrapperChips />
      )}
    </DockPane>
  );
}
