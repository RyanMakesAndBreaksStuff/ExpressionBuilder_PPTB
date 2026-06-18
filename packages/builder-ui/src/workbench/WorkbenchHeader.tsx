import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import type { PaletteId } from '../theme/workbenchTokens';
import { porcelainTokens, getPaletteIdsForMode } from '../theme/workbenchTokens';
import type { WorkbenchHeaderProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { CopyIcon, ExportIcon, ImportIcon, MoonIcon, SunIcon } from './icons/BuilderIcons';

export function WorkbenchHeader({
  mode,
  paletteId,
  onCopyExpression,
  onExport,
  onImport,
  onModeChange,
  onPaletteChange,
}: WorkbenchHeaderProps) {
  const theme = porcelainTokens[paletteId].mode;
  const lightPalettes = getPaletteIdsForMode('light');
  const darkPalettes = getPaletteIdsForMode('dark');

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

      <div className="eb-palette-shelf">
        <div className="eb-palette-group">
          <span className="eb-palette-label">Light</span>
          <div className="eb-palette-options">
            {lightPalettes.map((id) => (
              <PaletteButton key={id} id={id} activeId={paletteId} onSelect={onPaletteChange} />
            ))}
          </div>
        </div>
        <div className="eb-palette-group">
          <span className="eb-palette-label">Dark</span>
          <div className="eb-palette-options">
            {darkPalettes.map((id) => (
              <PaletteButton key={id} id={id} activeId={paletteId} onSelect={onPaletteChange} />
            ))}
          </div>
        </div>
      </div>

      <div className="eb-header-actions">
        <ActionButton
          variant="icon"
          label={`Current palette is ${porcelainTokens[paletteId].label} ${theme}`}
          title={`Current palette is ${porcelainTokens[paletteId].label} ${theme}`}
          icon={theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        />
        <ActionButton onClick={onImport} icon={<ImportIcon />}>
          Import
        </ActionButton>
        <ActionButton onClick={onExport} icon={<ExportIcon />}>
          Export
        </ActionButton>
        <ActionButton variant="primary" onClick={onCopyExpression} icon={<CopyIcon />}>
          Copy expression
        </ActionButton>
      </div>
    </header>
  );
}

interface PaletteButtonProps {
  id: PaletteId;
  activeId: PaletteId;
  onSelect: (id: PaletteId) => void;
}

function PaletteButton({ id, activeId, onSelect }: PaletteButtonProps) {
  const theme = porcelainTokens[id];
  return (
    <button
      className={`eb-palette-btn ${activeId === id ? 'is-active' : ''}`}
      onClick={() => onSelect(id)}
      title={`${theme.label} ${theme.mode} palette`}
    >
      <span className="eb-palette-swatch">
        {theme.swatches.map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </span>
      <span className="eb-palette-name">{theme.label}</span>
    </button>
  );
}
