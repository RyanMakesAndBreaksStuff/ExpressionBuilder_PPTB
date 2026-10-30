import { expect, test } from 'playwright/test';

test('web builder edits, imports, exports, and copies expressions', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clip' + 'board', {
      configurable: true,
      value: {
        copiedText: '',
        writeText(text: string) {
          this.copiedText = text;
          return Promise.resolve();
        },
      },
    });
  });

  await page.goto('http://127.0.0.1:5173');

  await expect(page.getByRole('region', { name: 'Condition Builder' })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();

  await expect(page.getByRole('complementary', { name: 'Toolbox' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Details' })).toBeVisible();

  const preview = page.getByLabel('Generated expression').first();
  await expect(preview).toContainText('@and');

  const sampleJson = JSON.stringify({
    version: 2,
    mode: 'triggerCondition',
    fields: [
      { id: 'Status', label: 'Status', type: 'choice', path: ['Status'], choices: ['Approved', 'Rejected', 'Pending'] },
      { id: 'Approver', label: 'Approver', type: 'string', path: ['Approver'], nullable: true },
    ],
    root: {
      id: 'root',
      kind: 'group',
      conjunction: 'and',
      children: [
        { id: 'rule-status', kind: 'rule', fieldId: 'Status', operator: 'equals', value: 'Approved' },
        { id: 'rule-approver', kind: 'rule', fieldId: 'Approver', operator: 'contains', value: 'finance' },
      ],
    },
  });

  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Import' }).click();
  await page.getByLabel('Saved expression JSON to import').fill(sampleJson);
  await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();

  await expect(preview).toContainText("triggerBody()?['Status']");
  await expect(preview).toContainText("triggerBody()?['Approver']");

  await page.getByRole('radio', { name: 'Filter array' }).click();
  await expect(preview).toContainText("item()?['Status']");

  await page.getByRole('radio', { name: 'Trigger condition' }).click();
  await expect(preview).toContainText("triggerBody()?['Status']");

  const approverRow = page.getByRole('group', { name: /Approver contains finance/i });
  await approverRow.getByRole('button', { name: 'Wrappers for Approver' }).click();
  await page.getByRole('menuitemcheckbox', { name: /toLower/ }).click();
  await expect(preview).toContainText('toLower');

  const beforeImport = await preview.textContent();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exported = await page.evaluate(() => (navigator['clip' + 'board'] as unknown as { copiedText: string }).copiedText);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Import' }).click();
  const savedJson = page.getByLabel('Saved expression JSON to import');
  await savedJson.fill(exported);
  await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
  await expect(preview).toHaveText(beforeImport ?? '');
  await expect(preview).toHaveText(beforeImport ?? '');

  await page.getByRole('region', { name: 'Expression Preview' }).getByRole('button', { name: 'Copy', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (navigator['clip' + 'board'] as unknown as { copiedText: string }).copiedText),
    )
    .toContain('@and');
});
