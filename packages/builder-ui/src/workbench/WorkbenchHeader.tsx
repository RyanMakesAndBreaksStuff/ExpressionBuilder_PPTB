import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import type { WorkbenchHeaderProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { ExportIcon, ImportIcon } from './icons/BuilderIcons';

export function WorkbenchHeader({
  mode,
  onExport,
  onImport,
  onModeChange,
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

      <ModeSegmentedControl mode={mode} onChange={onModeChange} />

      <div className="eb-header-actions">
        <ActionButton variant="ghost" onClick={onImport} icon={<ImportIcon />}>
          Import
        </ActionButton>
        <ActionButton variant="primary" onClick={onExport} icon={<ExportIcon />}>
          Export
        </ActionButton>
      </div>
    </header>
  );
}
