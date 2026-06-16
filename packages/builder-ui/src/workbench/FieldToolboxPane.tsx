import { useMemo, useState } from 'react';
import { TypeGlyph } from '../components/TypeGlyph';
import type { FieldToolboxPaneProps } from './types';
import { DockPane } from './controls/DockPane';
import { TabStrip } from './controls/TabStrip';
import { WrapperChips } from './WrapperChips';

export function FieldToolboxPane({
  activeTab,
  collapsed,
  fields,
  onConnect,
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
      title="Docked Toolbox"
      side="left"
      collapsed={collapsed}
      meta="Left pane"
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
          <div className="eb-toolbox-actions">
            <button type="button" className="eb-action-btn eb-action-subtle" onClick={onConnect}>
              Connect
            </button>
            <span className="eb-muted">No Dataverse connection</span>
          </div>
          <label className="eb-label" htmlFor="dynamic-content-search">
            Search dynamic content
          </label>
          <input
            id="dynamic-content-search"
            className="eb-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search fields..."
          />
          <ul className="eb-field-list" role="list" aria-label="Dynamic content fields">
            {filteredFields.map((field) => (
              <li key={field.id}>
                <div className="eb-field-row">
                  <TypeGlyph type={field.type} />
                  <span className="eb-field-main">
                    <span className="eb-field-title">{field.label}</span>
                    <span className="eb-field-detail">{field.path.join('.')} · {field.type}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <WrapperChips />
      )}
    </DockPane>
  );
}
