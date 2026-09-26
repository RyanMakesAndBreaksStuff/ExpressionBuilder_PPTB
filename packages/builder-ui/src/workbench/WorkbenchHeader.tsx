import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import type { WorkbenchHeaderProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { BuilderTabs } from './BuilderTabs';
import { ExportIcon, ImportIcon } from './icons/BuilderIcons';

export function WorkbenchHeader({
  builderView,
  mode,
  onBuilderViewChange,
  onExport,
  onImport,
  onModeChange,
  panelIds,
  ruleCount,
}: WorkbenchHeaderProps) {
  return (
    <header className="eb-workbench-header">
      <div className="eb-header-brand">
        <div className="eb-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7h12M8 12h8M8 17h6" />
            <path d="M4 7l2-2-2-2M4 17l2 2-2 2" />
          </svg>
        </div>
        <div className="eb-header-titles">
          <h1>Power Automate Expression Builder</h1>
          <p>For Triggers and Filters</p>
        </div>
      </div>

      <BuilderTabs view={builderView} ruleCount={ruleCount} ids={panelIds} onChange={onBuilderViewChange} />

      {builderView === 'condition' ? (
        <>
          <ModeSegmentedControl mode={mode} onChange={onModeChange} />

          <div className="eb-header-actions">
            <ActionButton variant="ghost" onClick={onImport} icon={<ImportIcon />}>
              Import
            </ActionButton>
            <ActionButton variant="primary" onClick={onExport} icon={<ExportIcon />}>
              Export
            </ActionButton>
          </div>
        </>
      ) : (
        <p className="eb-header-privacy">
          Pasted JSON is processed locally and is not uploaded or saved by this feature.
        </p>
      )}
    </header>
  );
}
