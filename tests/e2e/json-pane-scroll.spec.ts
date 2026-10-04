import { expect, test, type Locator } from 'playwright/test';

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

for (const theme of ['light', 'dark'] as const) {
  for (const size of [
    { width: 1280, height: 420 },
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 375, height: 667 },
  ]) {
    test('JSON pane end content is reachable: ' + theme + ' ' + size.width + 'x' + size.height, async ({ page }) => {
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
      await page.goto('http://127.0.0.1:5173/');
      await page.getByRole('button', { name: /^Screen:/ }).click();
      await page.getByRole('menuitemradio', { name: 'JSON reference', exact: true }).click();
      await page.getByLabel('Action name').fill('List Rows');
      await page.getByLabel('Sample JSON').fill(JSON.stringify(sample));
      await page.getByRole('button', { name: 'Parse', exact: true }).click();

      for (const name of [/^body, object$/, /^value, array$/, /^\[0\], object$/]) {
        const row = page.getByRole('treeitem', { name });
        if (await row.getAttribute('aria-expanded') === 'false') {
          await row.locator('[data-chevron]').click();
        }
      }
      await page.getByRole('treeitem', { name: /^\[0\], object$/ }).click();
      await page.getByLabel('Loop name').fill('Check it');

      const workspace = page.locator('.eb-json-workspace');
      const cards = [
        page.locator('.eb-json-source'),
        page.locator('.eb-json-payload'),
        page.locator('.eb-json-reference'),
      ];
      const owners = [
        page.locator('.eb-json-source > .eb-json-card-body'),
        page.locator('.eb-payload-tree'),
        page.locator('.eb-json-reference > .eb-json-card-body'),
      ];
      const targets = [
        page.getByRole('button', { name: 'Parse', exact: true }),
        page.getByRole('treeitem').last(),
        page.getByLabel('Loop items() reference'),
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
