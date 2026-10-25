import { expect, test, type Locator, type Page } from 'playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

async function pasteSample(page: Page, text: string): Promise<void> {
  await page.evaluate(
    (value) => navigator.clipboard.writeText(value),
    text,
  );
  const editor = page.getByRole('textbox', {
    name: 'Sample JSON',
    exact: true,
  });
  await editor.focus();
  await editor.press('Control+V');
}

const sample = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: {
    '@odata.context': 'https://dynamics.com',
    value: [
      { accountid: 'one', name: 'Acme', revenue: 500000, telephone1: '555-0199', createdon: '2026-03-15', ownerid: 'owner-one' },
      { accountid: 'two', name: 'Contoso', revenue: 320000, telephone1: '555-0198', createdon: '2026-03-16', ownerid: 'owner-two' },
    ],
  },
};

async function expectInside(owner: Locator, target: Locator): Promise<void> {
  const port = await owner.boundingBox();
  const item = await target.boundingBox();
  expect(port).not.toBeNull();
  expect(item).not.toBeNull();
  expect(item!.y).toBeGreaterThanOrEqual(port!.y - 1);
  expect(item!.y + item!.height).toBeLessThanOrEqual(port!.y + port!.height + 1);
}

/** Names the active payload, pastes the sample, then selects the first item and names its loop. */
async function loadSample(page: Page, name: string): Promise<void> {
  const panel = page.getByRole('tabpanel');
  await panel.getByLabel('Action name').fill(name);
  await pasteSample(page, JSON.stringify(sample));
  await expect(panel.getByRole('region', { name: 'Payload' }).locator('.eb-dock-meta'))
    .toHaveText(/^\d+ values?$/);

  for (const label of [/^body, object$/, /^value, array$/, /^\[0\], object$/]) {
    const row = panel.getByRole('treeitem', { name: label });
    if (await row.getAttribute('aria-expanded') === 'false') {
      await row.locator('[data-chevron]').click();
    }
  }
  await panel.getByRole('treeitem', { name: /^\[0\], object$/ }).click();
  await panel.getByLabel('Loop name').fill('Check it');
}

for (const theme of ['light', 'dark'] as const) {
  for (const size of [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 900, height: 700 },
    { width: 1280, height: 420 },
    { width: 1280, height: 860 },
    { width: 1440, height: 900 },
  ]) {
    test('JSON pane end content is reachable: ' + theme + ' ' + size.width + 'x' + size.height, async ({ page }) => {
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
      await page.goto('http://127.0.0.1:5173/');
      await page.getByRole('tablist', { name: 'Screen' }).getByRole('tab', { name: 'JSON reference', exact: true }).click();
      // Two loaded payloads: only the active tabpanel is visible, so each check below is scoped to it.
      await loadSample(page, 'List Rows');
      await page.getByRole('button', { name: '+ New payload', exact: true }).click();
      await loadSample(page, 'List Rows Again');

      for (const position of [2, 1]) await test.step('payload ' + position + ' is active', async () => {
        await page.getByRole('tab', { name: new RegExp(', payload ' + position + '$') }).click();
        const panel = page.getByRole('tabpanel');
        await expect(panel).toHaveCount(1);
        await expect(panel.getByLabel('Action name')).toHaveValue(position === 1 ? 'List Rows' : 'List Rows Again');

        const workspace = panel.locator('.eb-json-workspace');
        const cards = [
          panel.locator('.eb-json-source'),
          panel.locator('.eb-json-payload'),
          panel.locator('.eb-json-reference'),
        ];
        const owners = [
          panel.locator('.eb-json-source > .eb-json-card-body'),
          panel.locator('.eb-payload-tree'),
          panel.locator('.eb-json-reference > .eb-json-card-body'),
        ];
        const targets = [
          panel.getByRole('textbox', { name: 'Sample JSON', exact: true }),
          panel.getByRole('treeitem').last(),
          panel.getByLabel('Loop items() reference'),
        ];

        if (size.width > 600) {
          const before = await Promise.all(cards.map((card) => card.boundingBox()));
          for (let index = 0; index < owners.length; index++) {
            await owners[index].evaluate((element) => { element.scrollTop = element.scrollHeight; });
            const scroll = await owners[index].evaluate((element) => ({
              top: element.scrollTop, max: element.scrollHeight - element.clientHeight,
              overflowY: getComputedStyle(element).overflowY,
            }));
            expect(['auto', 'scroll']).toContain(scroll.overflowY);
            expect(Math.abs(scroll.top - Math.max(0, scroll.max))).toBeLessThanOrEqual(1);
            if (size.height === 420) {
              expect(scroll.max).toBeGreaterThan(0);
              expect(scroll.top).toBeGreaterThan(0);
            }
            await expectInside(cards[index], owners[index]);
            await expectInside(owners[index], targets[index]);
            const end = await targets[index].boundingBox();
            expect(end!.y).toBeGreaterThanOrEqual(0);
            expect(end!.y + end!.height).toBeLessThanOrEqual(size.height + 1);
            expect(await Promise.all(cards.map((card) => card.boundingBox()))).toEqual(before);
          }
          expect(await workspace.evaluate((element) => element.scrollTop)).toBe(0);
        } else {
          for (const target of targets) {
            await target.scrollIntoViewIfNeeded();
            await expectInside(workspace, target);
          }
          await workspace.evaluate((element) => { element.scrollTop = element.scrollHeight; });
          await expectInside(workspace, targets[2]);
        }
      });

      const bounds = await page.evaluate(() => {
        const root = document.querySelector('.eb-root')!.getBoundingClientRect();
        return {
          width: innerWidth, height: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          right: root.right, bottom: root.bottom,
        };
      });
      expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.width + 1);
      expect(bounds.documentHeight).toBeLessThanOrEqual(bounds.height + 1);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
    });
  }
}
