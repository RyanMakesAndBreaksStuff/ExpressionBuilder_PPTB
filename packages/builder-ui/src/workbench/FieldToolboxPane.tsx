import { useCallback, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { TypeGlyph } from '../components/TypeGlyph';
import type { FieldToolboxPaneProps } from './types';
import { DockPane } from './controls/DockPane';
import { TabStrip } from './controls/TabStrip';
import { WrapperChips } from './WrapperChips';
import { SourceChip } from './SourceChip';
import { GetStartedPanel } from './GetStartedPanel';

const PRIMARY_ITEM_VALUE = '__primary__';

// ── Module-scope styles (Fluent2: makeStyles outside component) ──────────────
const useStyles = makeStyles({
  emptyText: {
    color: tokens.colorNeutralForeground3,
  },
});

// ── Extracted component (React best-practices: structure-single-responsibility)
interface FieldListProps {
  items: FieldDefinition[];
  ariaLabel: string;
}

function FieldList({ items, ariaLabel }: FieldListProps) {
  return (
    <ul className="eb-field-list" role="list" aria-label={ariaLabel}>
      {items.map((field) => (
        <li key={field.id}>
          <div className="eb-field-row" tabIndex={0}>
            <TypeGlyph type={field.type} />
            <span className="eb-field-main">
              <span className="eb-field-title">{field.label}</span>
              <span className="eb-field-detail">
                {field.path.join('.')} &middot; {field.type}
              </span>
            </span>
            <span className="eb-field-type-badge">{field.type}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  selectedRuleId,
  onApplyWrapper,
}: FieldToolboxPaneProps) {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  /** Track which navigation properties have already triggered a discovery fetch. */
  const [expandedNavs, setExpandedNavs] = useState(() => new Set<string>());

  // Split fields into primary (no group) and related (has group)
  const primaryFields = useMemo(() => fields.filter((f) => !f.group), [fields]);
  const fieldsByGroup = useMemo(() => {
    const map = new Map<string, FieldDefinition[]>();
    for (const f of fields) {
      if (!f.group) continue;
      const bucket = map.get(f.group) ?? [];
      bucket.push(f);
      map.set(f.group, bucket);
    }
    return map;
  }, [fields]);

  // Computed once per render, used by both primary filter and related section filters
  const needle = search.trim().toLowerCase();

  const filteredPrimary = useMemo(() => {
    if (!needle) return primaryFields;
    return primaryFields.filter((field) => {
      const haystack = [field.label, field.id, field.type, field.path.join('.')].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [primaryFields, needle]);

  const handleAccordionToggle = useCallback(
    (navigationProperty: string) => {
      if (!expandedNavs.has(navigationProperty) && onExpandRelated) {
        setExpandedNavs((prev) => new Set(prev).add(navigationProperty));
        onExpandRelated(navigationProperty);
      }
    },
    [expandedNavs, onExpandRelated],
  );

  const hasContent = fields.length > 0 || (relatedSections && relatedSections.length > 0);

  // Label for the primary table accordion header
  const primaryLabel = source.label ?? source.tableLogicalName ?? 'Fields';

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

              {/* Scrollable area — primary + related accordions */}
              <div className="eb-toolbox-scroll">
                <Accordion
                  collapsible
                  multiple
                  defaultOpenItems={[PRIMARY_ITEM_VALUE]}
                >
                  {/* Primary table — accordion, open by default */}
                  <AccordionItem value={PRIMARY_ITEM_VALUE}>
                    <AccordionHeader>
                      <span className="eb-accordion-label">
                        <span className="eb-accordion-title">{primaryLabel}</span>
                      </span>
                    </AccordionHeader>
                    <AccordionPanel>
                      <div className="eb-accordion-panel-content">
                        {filteredPrimary.length > 0 ? (
                          <FieldList items={filteredPrimary} ariaLabel="Dynamic content fields" />
                        ) : needle ? (
                          <Text size={200} className={styles.emptyText}>
                            No primary fields match.
                          </Text>
                        ) : null}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  {/* Related sections — lazy-loaded */}
                  {relatedSections?.map((section) => {
                    const sectionFields = fieldsByGroup.get(section.displayName) ?? [];
                    const isLoaded = expandedNavs.has(section.navigationProperty);
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
                          <span className="eb-accordion-label">
                            <span className="eb-accordion-title">{section.displayName}</span>
                            <span className="eb-accordion-subtitle">{section.navigationProperty}</span>
                          </span>
                        </AccordionHeader>
                        <AccordionPanel>
                          <div className="eb-accordion-panel-content">
                            {!isLoaded && sectionFields.length === 0 ? (
                              <Spinner size="extra-tiny" label="Loading..." />
                            ) : visibleFields.length === 0 ? (
                              <Text size={100}>No fields.</Text>
                            ) : (
                              <FieldList
                                items={visibleFields}
                                ariaLabel={section.displayName + ' fields'}
                              />
                            )}
                          </div>
                        </AccordionPanel>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </>
          )}
        </div>
      ) : (
        <WrapperChips
          onApply={(wrapperId) => {
            if (selectedRuleId) onApplyWrapper?.(selectedRuleId, wrapperId);
          }}
        />
      )}
    </DockPane>
  );
}
