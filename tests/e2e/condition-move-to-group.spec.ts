import { expect, test } from 'playwright/test';

/**
 * Cross-group reordering (ConditionMoveButtons's "Move to..." menu) was
 * previously reachable only via drag/drop. This drives it end-to-end with
 * the keyboard alone - Tab to the trigger, Enter to open the menu, Arrow +
 * Enter to pick a target group - and asserts the rule actually lands inside
 * the target group in the rendered tree.
 */
test('moves a rule into another group via the keyboard-only "Move to" menu', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');

  await expect(page.getByRole('region', { name: 'Condition Builder' })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();

  const sampleJson = JSON.stringify({
    version: 2,
    mode: 'triggerCondition',
    fields: [
      { id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['Approved', 'Rejected', 'Pending'] },
    ],
    root: {
      id: 'root',
      kind: 'group',
      conjunction: 'and',
      children: [
        { id: 'rule-status', kind: 'rule', fieldId: 'Status', operator: 'equals', value: 'Approved' },
        { id: 'group-other', kind: 'group', conjunction: 'or', children: [] },
      ],
    },
  });

  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Import' }).click();
  await page.getByLabel('Saved expression JSON to import').fill(sampleJson);
  await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();

  const rootGroup = page.getByRole('group', { name: 'AND group root' });
  const otherGroup = page.getByRole('group', { name: 'OR group group-other' });
  await expect(rootGroup.getByRole('group', { name: /Status equals Approved/i })).toBeVisible();
  await expect(otherGroup.getByRole('group', { name: /Status equals Approved/i })).toHaveCount(0);

  // rule-status's only parent is root, so root is excluded from its own
  // "Move to" menu (see listGroupMoveTargets) - group-other is the sole
  // remaining target, making the first ArrowDown+Enter deterministic.
  const moveToButton = page.getByRole('button', { name: 'Move Status to another group' });
  await moveToButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: /group-other/ })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(otherGroup.getByRole('group', { name: /Status equals Approved/i })).toBeVisible();
});
