import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  DatabaseRegular,
  ArrowImportRegular,
  AddRegular,
  BeakerRegular,
} from '@fluentui/react-icons';

export interface GetStartedPanelProps {
  onSwitchTable: () => void;
  onImport: () => void;
  onAddField: () => void;
  onLoadSamples: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  hint: { color: tokens.colorNeutralForeground3 },
});

export function GetStartedPanel({ onSwitchTable, onImport, onAddField, onLoadSamples }: GetStartedPanelProps) {
  const styles = useStyles();
  return (
    <div className={styles.root} role="region" aria-label="Get started choosing a data source">
      <Text weight="semibold">No fields yet</Text>
      <Text className={styles.hint} size={200}>
        Choose where your fields come from to start building.
      </Text>
      <div className={styles.actions}>
        <Button appearance="primary" icon={<DatabaseRegular />} onClick={onSwitchTable}>
          Connect a table
        </Button>
        <Button icon={<ArrowImportRegular />} onClick={onImport}>
          Import a schema
        </Button>
        <Button icon={<AddRegular />} onClick={onAddField}>
          Add a field manually
        </Button>
        <Button appearance="subtle" icon={<BeakerRegular />} onClick={onLoadSamples}>
          Load sample fields
        </Button>
      </div>
    </div>
  );
}
