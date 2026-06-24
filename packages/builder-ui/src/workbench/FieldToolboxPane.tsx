import { useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Spinner,
  Text,
} from '@fluentui/react-components';
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
  relatedSections,
  onExpandRelated,
}: FieldToolboxPaneProps) {
  const [search, setSearch] = useState('');
  /** Track which navigation properties have already triggered a discovery fetch. */
  const expandedNavs = useRef(new Set<string>());

  // Split fields into primary (no group) and related (has group)
  const primaryFields = useMemo(() => fields.filter((f) => !f.group), [fields]);
  const fieldsByGroup = useMemo(() => {
    const map = new Map<string, typeof fields>();
    for (const f of fields) {
      if (!f.group) continue;
      const bucket = map.get(f.group) ?? [];
      bucket.push(f);
      map.set(f.group, bucket);
    }
    return map;
  }, [fields]);

  const filteredPrimary = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return primaryFields;
    return primaryFields.filter((field) => {
      const haystack = [field.label, field.id, field.type, field.path.join('.')].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [primaryFields, search]);

  const handleAccordionToggle = (navigationProperty: string) => {
    if (!expandedNavs.current.has(navigationProperty) && onExpandRelated) {
      expandedNavs.current.add(navigationProperty);
      onExpandRelated(navigationProperty);
    }
  };

  const hasContent = fields.length > 0 || (relatedSections && relatedSections.length > 0);

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
          {!hasContent ? (
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

              {/* Primary fields (no group) */}
              {filteredPrimary.length > 0 ? (
                <ul className="eb-field-list" role="list" aria-label="Dynamic content fields">
                  {filteredPrimary.map((field) => (
                    <li key={field.id}>
                      <div className="eb-field-row" tabIndex={0}>
                        <TypeGlyph type={field.type} />
                        <span className="eb-field-main">
                          <span className="eb-field-title">{field.label}</span>
                          <span className="eb-field-detail">
                            {field.path.join('.')} · {field.type}
                          </span>
                        </span>
                        <span className="eb-field-type-badge">{field.type}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : search.trim() ? (
                <Text size={200} style={{ padding: '8px', color: 'var(--eb-text-muted)' }}>
                  No primary fields match.
                </Text>
              ) : null}

              {/* Related sections — lazy-loaded accordion */}
              {relatedSections && relatedSections.length > 0 ? (
                <Accordion collapsible multiple>
                  {relatedSections.map((section) => {
                    const sectionFields = fieldsByGroup.get(section.displayName) ?? [];
                    const isLoaded = expandedNavs.current.has(section.navigationProperty);
                    const needle = search.trim().toLowerCase();
                    const visibleFields = needle
                      ? sectionFields.filter((f) =>
                          [f.label, f.id, f.type].join(' ').toLowerCase().includes(needle),
                        )
                      : sectionFields;

                    return (
                      <AccordionItem
                        key={section.navigationProperty}
                        value={section.navigationProperty}
                      >
                        <AccordionHeader
                          onClick={() => handleAccordionToggle(section.navigationProperty)}
                        >
                          {section.displayName}
                        </AccordionHeader>
                        <AccordionPanel>
                          {!isLoaded && sectionFields.length === 0 ? (
                            <Spinner size="extra-tiny" label="Loading…" />
                          ) : visibleFields.length === 0 ? (
                            <Text size={100}>No fields.</Text>
                          ) : (
                            <ul
                              className="eb-field-list"
                              role="list"
                              aria-label={section.displayName + ' fields'}
                            >
                              {visibleFields.map((field) => (
                                <li key={field.id}>
                                  <div className="eb-field-row" tabIndex={0}>
                                    <TypeGlyph type={field.type} />
                                    <span className="eb-field-main">
                                      <span className="eb-field-title">{field.label}</span>
                                      <span className="eb-field-detail">
                                        {field.path.join('.')} · {field.type}
                                      </span>
                                    </span>
                                    <span className="eb-field-type-badge">{field.type}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </AccordionPanel>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <WrapperChips />
      )}
    </DockPane>
  );
}
