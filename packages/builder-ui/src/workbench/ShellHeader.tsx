import type { ReactNode } from 'react';
import {
  Menu,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import type { ExpressionMode } from '@ryanmakes/eb_engine';
import { ModeSegmentedControl } from '../components/ModeSegmentedControl';
import { ActionButton } from './controls/ActionButton';
import { ChevronDownIcon, ExportIcon, ImportIcon } from './icons/BuilderIcons';
import { SCREENS, type ScreenId } from './screens';

const JSON_PRIVACY =
  'Pasted JSON is processed locally and is not uploaded or saved in any way.';

export interface ShellHeaderProps {
  screen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  mode: ExpressionMode;
  onModeChange: (mode: ExpressionMode) => void;
  onImport: () => void;
  onExport: () => void;
  hostActions?: ReactNode;
}

export function ShellHeader({
  hostActions,
  mode,
  onExport,
  onImport,
  onModeChange,
  onScreenChange,
  screen,
}: ShellHeaderProps) {
  const label = SCREENS.find((entry) => entry.id === screen)?.label ?? '';

  return (
    <header className="eb-pill-header">
      <h1 className="eb-pill-title">Expression Builder</h1>
      <span className="eb-pill-sep" aria-hidden="true">
        &rsaquo;
      </span>

      <Menu
        checkedValues={{ screen: [screen] }}
        onCheckedValueChange={(_event, data) => onScreenChange(data.checkedItems[0] as ScreenId)}
      >
        <MenuTrigger disableButtonEnhancement>
          <button type="button" className="eb-mode-chip" aria-label={`Screen: ${label}`}>
            <span>{label}</span>
            <ChevronDownIcon aria-hidden="true" />
          </button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {SCREENS.map((entry) => (
              <MenuItemRadio key={entry.id} name="screen" value={entry.id}>
                {entry.label}
              </MenuItemRadio>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>

      <div className="eb-pill-spacer" />

      {screen === 'condition' ? (
        <>
          <ModeSegmentedControl mode={mode} onChange={onModeChange} />
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button" className="eb-pill-overflow" aria-label="More actions">
                &middot;&middot;&middot;
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<ImportIcon />} onClick={onImport}>
                  Import
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      ) : null}

      {screen === 'jsonReference' ? <p className="eb-pill-privacy">{JSON_PRIVACY}</p> : null}
      {hostActions}
      {screen === 'condition' ? (
        <ActionButton variant="primary" onClick={onExport} icon={<ExportIcon />}>
          Export
        </ActionButton>
      ) : null}
    </header>
  );
}
