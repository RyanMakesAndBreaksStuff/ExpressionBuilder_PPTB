import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import { porcelainTokens } from '../theme/workbenchTokens';
import type { WorkbenchHeaderProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { ExportIcon, ImportIcon, MoonIcon, SunIcon } from './icons/BuilderIcons';

export function WorkbenchHeader({
  mode,
  paletteId,
  onExport,
  onImport,
  onModeChange,
  onToggleTheme,
}: WorkbenchHeaderProps) {
  const theme = porcelainTokens[paletteId].mode;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="eb-workbench-header">
      <div className="eb-header-brand">
        <div className="eb-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <ActionButton
          variant="icon"
          label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
          icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          onClick={onToggleTheme}
        />
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
