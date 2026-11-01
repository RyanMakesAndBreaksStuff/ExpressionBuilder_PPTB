import { expect, test } from 'playwright/test';

const saved = {
  version: 2,
  mode: 'triggerCondition',
  fields: [{ id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'] }],
  root: {
    id: 'root', kind: 'group', conjunction: 'and',
    children: [
      { id: 'one', kind: 'rule', fieldId: 'Amount', operator: 'equals', value: 1 },
      { id: 'two', kind: 'rule', fieldId: 'Amount', operator: 'equals', value: 2 },
      { id: 'other', kind: 'group', conjunction: 'or', children: [] },
    ],
  },
};

for (const position of [0, 1, 3]) {
  test('pointer insertion survives compact spacing at position ' + position, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Import', exact: true }).click();
    await page.getByLabel('Saved expression JSON to import').fill(JSON.stringify(saved));
    await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
    const root = page.getByRole('group', { name: 'AND group root', exact: true });
    const target = root.locator(
      ':scope > .eb-group-children > [data-group-id="root"][data-drop-position="' + position + '"]',
    );
    const handle = page.getByRole('button', { name: 'Drag Amount to insert', exact: true });
    await target.scrollIntoViewIfNeeded();
    await handle.scrollIntoViewIfNeeded();
    const source = await handle.boundingBox();
    expect(source).not.toBeNull();
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(source!.x + source!.width / 2 + 12, source!.y + source!.height / 2 + 12, { steps: 4 });
    await expect(page.locator('.eb-field-row[data-field-id="Amount"][data-dnd-dragging="true"]')).toHaveClass(/is-dragging/);
    const destination = await target.boundingBox();
    expect(destination).not.toBeNull();
    await page.mouse.move(
      destination!.x + destination!.width / 2,
      destination!.y + destination!.height / 2,
      { steps: 10 },
    );
    await expect(target).toHaveClass(/is-drop-target/);
    await page.mouse.up();
    const rules = root.locator(':scope > .eb-group-children > .eb-rule-row-editor');
    await expect(rules).toHaveCount(3);
    const names = await rules.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
    const insertedIndex = position === 3 ? 2 : position;
    expect(names[insertedIndex]).toContain('Amount equals 0');
    const targetHeight = await target.evaluate((element) => element.getBoundingClientRect().height);
    expect(targetHeight).toBeGreaterThanOrEqual(20);
  });
}
