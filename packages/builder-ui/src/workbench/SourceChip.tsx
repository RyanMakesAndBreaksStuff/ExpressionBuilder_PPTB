import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
  Text,
  makeStyles,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ArrowSyncRegular,
  DatabaseRegular,
  ArrowImportRegular,
  AddRegular,
  BeakerRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import type { DataSourceDescriptor } from '../composer/querySchema';

export interface SourceChipProps {
  source: DataSourceDescriptor;
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
  onManageProfiles: () => void;
  onRefresh: () => void;
}

type ConnectionState = 'connected' | 'none' | 'stale';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  connected: { backgroundColor: tokens.colorPaletteGreenBackground3 },
  none: { backgroundColor: tokens.colorNeutralForeground4 },
  stale: { backgroundColor: tokens.colorPaletteYellowBackground3 },
  name: { flexGrow: 1, minWidth: 0 },
});

function connectionStateOf(source: DataSourceDescriptor): ConnectionState {
  if (source.kind === 'unknown') return 'none';
  if (source.kind === 'sample') return 'stale';
  return 'connected';
}

function labelOf(source: DataSourceDescriptor): string {
  if (source.label) return source.label;
  return source.kind === 'unknown' ? 'No source' : source.kind;
}

export function SourceChip({
  source,
  onSwitchTable,
  onImport,
  onAddField,
  onLoadSamples,
  onManageProfiles,
  onRefresh,
}: SourceChipProps) {
  const styles = useStyles();
  const state = connectionStateOf(source);
  const isDataverse = source.kind === 'dataverse';

  return (
    <div className={styles.root}>
      <span
        className={mergeClasses(styles.dot, styles[state])}
        role="img"
        aria-label={`Connection: ${state}`}
      />
      <Text className={styles.name} weight="semibold" truncate wrap={false}>
        {labelOf(source)}
      </Text>

      {isDataverse ? (
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowSyncRegular />}
          aria-label="Refresh fields"
          title="Refresh fields"
          onClick={onRefresh}
        />
      ) : null}

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronDownRegular />}
            aria-label="Data source menu"
          />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem icon={<DatabaseRegular />} onClick={onSwitchTable}>
              Switch table…
            </MenuItem>
            <MenuItem icon={<ArrowImportRegular />} onClick={onImport}>
              Import schema…
            </MenuItem>
            <MenuItem icon={<AddRegular />} onClick={onAddField}>
              Add field…
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<SaveRegular />} onClick={onManageProfiles}>
              Manage profiles…
            </MenuItem>
            <MenuItem icon={<BeakerRegular />} onClick={onLoadSamples}>
              Load sample fields
            </MenuItem>
            {isDataverse ? (
              <>
                <MenuDivider />
                <MenuItem icon={<ArrowSyncRegular />} onClick={onRefresh}>
                  Refresh
                </MenuItem>
              </>
            ) : null}
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  );
}
