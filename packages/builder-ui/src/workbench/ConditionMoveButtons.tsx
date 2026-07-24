import { Button } from '@fluentui/react-components';
import { ChevronDownIcon, ChevronUpIcon } from './icons/BuilderIcons';

interface ConditionMoveButtonsProps {
  label: string;
  sourceIndex: number;
  siblingCount: number;
  onMove: (finalIndex: number) => void;
}

export function ConditionMoveButtons({
  label,
  sourceIndex,
  siblingCount,
  onMove,
}: ConditionMoveButtonsProps) {
  return (
    <>
      <Button
        type="button"
        appearance="subtle"
        size="small"
        className="eb-condition-move-button"
        icon={<ChevronUpIcon />}
        aria-label={`Move ${label} up`}
        title={`Move ${label} up`}
        disabled={sourceIndex === 0}
        onClick={(event) => {
          event.stopPropagation();
          onMove(sourceIndex - 1);
        }}
      />
      <Button
        type="button"
        appearance="subtle"
        size="small"
        className="eb-condition-move-button"
        icon={<ChevronDownIcon />}
        aria-label={`Move ${label} down`}
        title={`Move ${label} down`}
        disabled={sourceIndex >= siblingCount - 1}
        onClick={(event) => {
          event.stopPropagation();
          onMove(sourceIndex + 1);
        }}
      />
    </>
  );
}
