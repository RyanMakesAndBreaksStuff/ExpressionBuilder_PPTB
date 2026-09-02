// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConditionMoveButtons } from '../src/workbench/ConditionMoveButtons';
import { RuleRowEditor } from '../src/workbench/RuleRowEditor';
import { moveNode } from '../src/composer/queryActions';
import type { QueryDocument, QueryGroup } from '../src/composer/querySchema';
import type { FieldDefinition } from '@ryanmakes/eb_engine';

afterEach(() => cleanup());

describe('ConditionMoveButtons "Move to" menu', () => {
  it('is hidden when no move targets are supplied (no regression to up/down-only rows)', () => {
    render(
      <ConditionMoveButtons label="Status" sourceIndex={0} siblingCount={2} onMove={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Move Status up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Status down' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /to another group/i })).not.toBeInTheDocument();
  });

  it('drives the "Move to" menu via keyboard only and reports the chosen target group', async () => {
    const user = userEvent.setup();
    const onMoveToGroup = vi.fn();

    render(
      <ConditionMoveButtons
        label="Status"
        sourceIndex={0}
        siblingCount={1}
        onMove={vi.fn()}
        moveTargets={[
          { id: 'group-b', label: 'OR group group-b' },
          { id: 'group-c', label: 'AND group group-c' },
        ]}
        onMoveToGroup={onMoveToGroup}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Move Status to another group' });
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Keyboard only: no click/pointer events anywhere in this interaction.
    // Enter activates the trigger (a native <button>) to open the menu;
    // focusing the target item and pressing Enter again activates it -
    // standing in for a user who tabbed/arrowed onto that item.
    await user.keyboard('{Enter}');
    const target = await screen.findByRole('menuitem', { name: /group-c/ });
    target.focus();
    await user.keyboard('{Enter}');

    expect(onMoveToGroup).toHaveBeenCalledWith('group-c');
  });
});

describe('Keyboard-driven cross-group move updates the query document', () => {
  const fields: FieldDefinition[] = [
    { id: 'Status', label: 'Status', type: 'string', path: ['Status'] },
  ];

  const initialRoot: QueryGroup = {
    id: 'root',
    kind: 'group',
    conjunction: 'and',
    children: [
      {
        id: 'group-a',
        kind: 'group',
        conjunction: 'and',
        children: [
          { id: 'rule-1', kind: 'rule', fieldId: 'Status', operator: 'equals', value: 'Approved' },
        ],
      },
      { id: 'group-b', kind: 'group', conjunction: 'or', children: [] },
    ],
  };

  function Harness({ onDocumentChange }: { onDocumentChange: (doc: QueryDocument) => void }) {
    const [document, setDocument] = useState<QueryDocument>({
      version: 2,
      mode: 'triggerCondition',
      fields,
      root: initialRoot,
    });

    const group = document.root.children[0] as QueryGroup;
    const rule = group.children[0];
    if (!rule) {
      // The rule has moved out of group-a (the move succeeded) - nothing left to render.
      return null;
    }
    if (rule.kind !== 'rule') throw new Error('expected a rule');

    return (
      <RuleRowEditor
        rule={rule}
        fields={fields}
        selected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        parentGroupId={group.id}
        sourceIndex={0}
        siblingCount={1}
        onReorderNode={vi.fn()}
        root={document.root}
        onMoveNode={(nodeId, targetGroupId) => {
          setDocument((current) => {
            const next = moveNode(current, nodeId, targetGroupId);
            onDocumentChange(next);
            return next;
          });
        }}
      />
    );
  }

  it('moves the rule into the target group\'s children via keyboard alone', async () => {
    const user = userEvent.setup();
    let latestDocument: QueryDocument | undefined;

    render(<Harness onDocumentChange={(doc) => (latestDocument = doc)} />);

    const trigger = screen.getByRole('button', { name: 'Move Status to another group' });
    trigger.focus();
    await user.keyboard('{Enter}');

    // listGroupMoveTargets excludes the rule's current parent (group-a) but
    // offers the root and group-b as targets.
    const target = await screen.findByRole('menuitem', { name: /group-b/ });
    target.focus();
    await user.keyboard('{Enter}');

    expect(latestDocument).toBeDefined();
    const rootChildren = latestDocument!.root.children;
    const groupA = rootChildren.find((child) => child.id === 'group-a') as QueryGroup;
    const groupB = rootChildren.find((child) => child.id === 'group-b') as QueryGroup;

    expect(groupA.children).toHaveLength(0);
    expect(groupB.children).toHaveLength(1);
    expect(groupB.children[0]).toMatchObject({ id: 'rule-1', kind: 'rule' });
  });
});
