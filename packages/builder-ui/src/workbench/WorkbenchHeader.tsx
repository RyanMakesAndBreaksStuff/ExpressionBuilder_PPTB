import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import type { WorkbenchHeaderProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { CopyIcon, MoonIcon, PanelIcon, SunIcon } from './icons/BuilderIcons';

export function WorkbenchHeader({
  mode,
  theme,
  onCopyExpression,
  onExport,
  onImport,
  onModeChange,
  onToggleTheme,
}: WorkbenchHeaderProps) {
  return (
    <header className="eb-workbench-header">
      <div className="eb-header-brand">
        <div className="eb-brand-mark" aria-hidden="true">
          <PanelIcon />
        </div>
        <div>
          <h1>Expression Builder</h1>
          <p>Generate Triggers and Array Filters For Power Automate Flows</p>
        </div>
      </div>

      <ModeSegmentedControl mode={mode} onChange={onModeChange} />

      <div className="eb-header-actions">
        <ActionButton onClick={onImport}>Import</ActionButton>
        <ActionButton onClick={onExport}>Export</ActionButton>
        <ActionButton onClick={onToggleTheme} icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}>
          {theme === 'dark' ? 'Light theme toggle' : 'Dark theme toggle'}
        </ActionButton>
        <ActionButton variant="primary" onClick={onCopyExpression} icon={<CopyIcon />}>
          Copy expression
        </ActionButton>
      </div>
    </header>
  );
}
