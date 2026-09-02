import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { ChevronDownIcon, ChevronUpIcon, MoveToGroupIcon } from './icons/BuilderIcons';
import type { GroupMoveTarget } from './dragDropModel';

interface ConditionMoveButtonsProps {
  label: string;
  sourceIndex: number;
  siblingCount: number;
  onMove: (finalIndex: number) => void;
  /**
   * Other groups this node can be moved into, keyed by group id. Omit (or
   * pass an empty array) to hide the "Move to" menu - e.g. when there is no
   * `onMoveToGroup` handler wired up, or no other group exists to move into.
   */
  moveTargets?: GroupMoveTarget[];
  /** Reparents the node into a different group (keyboard counterpart to drag/drop across groups). */
  onMoveToGroup?: (targetGroupId: string) => void;
}

export function ConditionMoveButtons({
  label,
  sourceIndex,
  siblingCount,
  onMove,
  moveTargets,
  onMoveToGroup,
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
      {moveTargets && moveTargets.length > 0 && onMoveToGroup ? (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              type="button"
              appearance="subtle"
              size="small"
              className="eb-condition-move-button"
              icon={<MoveToGroupIcon />}
              aria-label={`Move ${label} to another group`}
              title={`Move ${label} to another group`}
              onClick={(event) => event.stopPropagation()}
            />
          </MenuTrigger>
          <MenuPopover onClick={(event) => event.stopPropagation()}>
            <MenuList>
              {moveTargets.map((target) => (
                <MenuItem
                  key={target.id}
                  aria-label={`Move ${label} to ${target.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveToGroup(target.id);
                  }}
                >
                  {target.label}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : null}
    </>
  );
}
