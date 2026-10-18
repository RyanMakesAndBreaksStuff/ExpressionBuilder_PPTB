import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from 'playwright/test';
import {
  fixtureA1,
  triggerBodySample,
  triggerFullSample,
} from '../../packages/builder-ui/test/fixtures/jsonReferenceFixtures';

type Theme = 'light' | 'dark';

declare global {
  interface Window {
    toolboxAPI?: unknown;
    __audit?: { enabled: boolean; writes: string[] };
  }
}

const WEB_URL = 'http://127.0.0.1:5173/';
const THEMES: Theme[] = ['light', 'dark'];
const EMAIL = "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']";

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Loads the web build with onboarding dismissed. */
async function open(page: Page, options: { theme?: Theme } = {}) {
  const { theme = 'light' } = options;
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(WEB_URL);
  await expect(page.locator('.eb-root')).toHaveAttribute('data-theme', theme);
}

async function clipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

// Parse success surfaces as the value count in the Payload card header; the
// old in-pane Parse button and status line were replaced by paste-to-parse.
const payloadMeta = (page: Page) => page.getByRole('region', { name: 'Payload' }).locator('.eb-dock-meta');

/** Bare formula-editor copy. The panel also has "Copy @{}", "Copy item()", and "Copy item() @{}". */
const referenceCopy = (page: Page) => page.getByRole('button', { name: 'Copy', exact: true });

const treeRow = (page: Page, label: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) });

/** Switches screens through the header's Screen menu. */
async function openScreen(page: Page, name: 'Functions' | 'Trigger / Filter' | 'JSON reference') {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name, exact: true }).click();
}

const openJsonReference = (page: Page) => openScreen(page, 'JSON reference');
const openCondition = (page: Page) => openScreen(page, 'Trigger / Filter');
const openFunctions = (page: Page) => openScreen(page, 'Functions');

/**
 * The focus indicator of the active element. Header controls draw their ring as an outline
 * (shell.css, FR-6); the payload strip and search use an outline too; everything else a box-shadow.
 */
const focusRing = (page: Page) =>
  page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return style.boxShadow !== 'none' ? style.boxShadow : style.outlineStyle === 'none' || style.outlineWidth === '0px' ? 'none' : style.outline;
  });

/** Asserts the control has keyboard focus and a visible indicator. */
async function expectFocused(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  expect(await focusRing(page)).not.toBe('none');
}

const tabAt = (page: Page, position: number) =>
  page.getByRole('tab', { name: new RegExp(`, payload ${position}$`) });
const addPayload = (page: Page) => page.getByRole('button', { name: 'New payload', exact: true }).click();
const referenceExpression = (page: Page) => page.locator('[aria-label="Reference expression"]:visible');

/** Pastes through the real clipboard into the Sample JSON textarea — the flow the app auto-parses. */
async function pasteSample(page: Page, sample: string) {
  await page.evaluate((text) => navigator.clipboard.writeText(text), sample);
  const editor = page.getByRole('textbox', { name: 'Sample JSON', exact: true });
  await editor.focus();
  await editor.press('Control+V');
}

async function parseSample(
  page: Page,
  source: { outputFrom: 'Action' | 'Trigger'; name?: string; shape: 'full' | 'body'; sample: string },
) {
  // One radiogroup of four combined roots, labelled e.g. 'Action · Full output'.
  const root = `${source.outputFrom} · ${source.shape === 'full' ? 'Full output' : 'Body only'}`;
  await page.getByRole('radio', { name: root }).click();
  if (source.name !== undefined) await page.getByRole('textbox', { name: 'Action name' }).fill(source.name);
  await pasteSample(page, source.sample);
  await expect(payloadMeta(page)).toHaveText(/^\d+ values?$/);
}

/** Expands each ancestor by its chevron, then selects the last label. */
async function select(page: Page, labels: string[]) {
  for (const label of labels.slice(0, -1)) {
    const row = treeRow(page, label);
    if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-chevron]').click();
  }
  await treeRow(page, labels[labels.length - 1]).click();
}

async function addTwoRules(page: Page) {
  await page.getByRole('button', { name: 'Load sample fields' }).first().click();
  const addRule = page.getByRole('button', { name: 'Add rule to group root' });
  await addRule.click();
  await addRule.click();
}

async function loadEmailReference(page: Page) {
  await openJsonReference(page);
  await parseSample(page, { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 });
  await select(page, ['body', 'value', '[0]', 'Requester', 'Email']);
}

test.describe('web build', () => {
    test('copies a correctly rooted reference for each of the four roots (SC-002)', async ({ page }) => {
      await open(page);
      await openJsonReference(page);
      const bodyOnly = JSON.stringify(JSON.parse(fixtureA1).body);
      const cases = [
        { source: { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 }, path: ['body', 'value', '[0]', 'Requester', 'Email'], expected: EMAIL },
        { source: { outputFrom: 'Action', name: 'Get items', shape: 'body', sample: bodyOnly }, path: ['value', '[0]', 'Title'], expected: "body('Get_items')?['value'][0]?['Title']" },
        { source: { outputFrom: 'Trigger', shape: 'full', sample: triggerFullSample }, path: ['body', 'customer', 'name'], expected: "triggerOutputs()?['body']?['customer']?['name']" },
        { source: { outputFrom: 'Trigger', shape: 'body', sample: triggerBodySample }, path: ['customer', 'name'], expected: "triggerBody()?['customer']?['name']" },
      ] as const;

      for (const { source, path, expected } of cases) {
        await parseSample(page, source);
        await select(page, [...path]);
        await expect(page.getByLabel('Reference expression')).toHaveText(expected);
        await referenceCopy(page).click();
        // .first(): successive cases can stack not-yet-dismissed toasts.
        await expect(page.getByText('Expression copied').first()).toBeVisible();
        expect(await clipboardText(page)).toBe(expected);
      }
    });

    test('makes no network requests and no storage writes while in use (SC-004)', async ({ page }) => {
      const requests: string[] = [];
      await page.addInitScript(() => {
        const audit = { enabled: false, writes: [] as string[] };
        window.__audit = audit;
        const record = (what: string) => {
          if (audit.enabled) audit.writes.push(what);
        };
        for (const method of ['setItem', 'removeItem', 'clear'] as const) {
          const original = Storage.prototype[method] as (...args: unknown[]) => unknown;
          Storage.prototype[method] = function (this: Storage, ...args: unknown[]) {
            record(`Storage.${method}`);
            return original.apply(this, args);
          } as never;
        }
        const openDatabase = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function (this: IDBFactory, ...args: Parameters<IDBFactory['open']>) {
          record('indexedDB.open');
          return openDatabase.apply(this, args);
        };
        const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        Object.defineProperty(Document.prototype, 'cookie', {
          configurable: true,
          get() {
            return cookie?.get?.call(this);
          },
          set(value: string) {
            record('document.cookie');
            cookie?.set?.call(this, value);
          },
        });
      });
      await open(page);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        if (window.__audit) window.__audit.enabled = true;
        const api = window.toolboxAPI as { settings?: Record<string, unknown> } | undefined;
        for (const method of ['set', 'setAll'] as const) {
          if (api?.settings) api.settings[method] = async () => void window.__audit?.writes.push(`settings.${method}`);
        }
      });
      page.on('request', (request) => requests.push(request.url()));

      await loadEmailReference(page);
      await referenceCopy(page).click();
      await expect(page.getByText('Expression copied')).toBeVisible();
      await openCondition(page);
      await openJsonReference(page);

      expect(requests).toEqual([]);
      expect(await page.evaluate(() => window.__audit?.writes)).toEqual([]);
    });

    for (const theme of THEMES) {
      test(`both views pass the accessibility scan in the ${theme} theme (FR-085)`, async ({ page }) => {
        await open(page, { theme });
        const scan = async (label: string) => {
          const results = await new AxeBuilder({ page })
            // Fluent's tabster focus sentinels: aria-hidden <i tabindex="0"> elements it appends to <body>.
            .exclude('[data-tabster-dummy]')
            .analyze();
          const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(blocking.map((v) => `${label}: ${v.id} (${v.nodes.length})`)).toEqual([]);
        };

        await scan('empty Condition builder');
        await addTwoRules(page);
        await scan('Condition builder with rules');
        await loadEmailReference(page);
        await scan('JSON reference with a selection');
        await page.getByRole('textbox', { name: 'Action name' }).fill('');
        await pasteSample(page, '{"a": 1,}');
        await expect(page.getByRole('alert')).toBeVisible();
        await scan('JSON reference with errors');
      });
    }
});

test('the core task works by keyboard alone, with a visible focus ring (SC-005)', async ({ page }) => {
  await open(page);

  await page.keyboard.press('Tab');
  const screenButton = page.getByRole('button', { name: /^Screen:/ });
  await expectFocused(page, screenButton);
  await page.keyboard.press('Enter');
  const jsonItem = page.getByRole('menuitemradio', { name: 'JSON reference', exact: true });
  await expect(jsonItem).toBeVisible();
  for (let step = 0; step < 3 && !(await jsonItem.evaluate((el) => el === document.activeElement)); step++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(jsonItem).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Screen: JSON reference' })).toBeVisible();

  // Focus returns to the Screen button once the menu closes.
  await expect(screenButton).toBeFocused();
  // The payload strip now precedes Source: the payload tab, New payload, then search (AC-5.5).
  await page.keyboard.press('Tab');
  await expectFocused(page, page.getByRole('tab', { name: 'Payload 1, payload 1' }));
  await page.keyboard.press('Tab');
  await expectFocused(page, page.getByRole('button', { name: 'New payload', exact: true }));
  await page.keyboard.press('Tab');
  await expectFocused(page, page.getByRole('combobox', { name: 'Search all payloads' }));
  await page.keyboard.press('Tab');
  await expectFocused(page, page.getByRole('radio', { name: 'Action · Full output' }));
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Action name' })).toBeFocused();
  await page.keyboard.type('Get items');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Sample JSON', exact: true })).toBeFocused();
  await page.evaluate((text) => navigator.clipboard.writeText(text), fixtureA1);
  await page.keyboard.press('Control+V');
  await expect(payloadMeta(page)).toHaveText('25 values');

  await page.keyboard.press('Tab');
  await expect(treeRow(page, "outputs('Get_items')")).toBeFocused();
  // root → body → value → [0] → Requester → Email
  for (const key of ['End', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
    await page.keyboard.press(key);
  }
  await expect(treeRow(page, 'ID')).toBeFocused();
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'Enter']) {
    await page.keyboard.press(key);
  }
  await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
  expect(await focusRing(page)).not.toBe('none');

  // Reference info, then the inline copy, then the bare Copy.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reference info' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copy @{}' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(referenceCopy(page)).toBeFocused();
  expect(await focusRing(page)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Expression copied')).toBeVisible();
  expect(await clipboardText(page)).toBe(EMAIL);
});

/** Picks a screen with the keyboard: open the Screen menu, arrow to the item, press Enter. */
async function chooseScreenByKeyboard(page: Page, name: string) {
  await page.getByRole('button', { name: /^Screen:/ }).focus();
  await page.keyboard.press('Enter');
  const item = page.getByRole('menuitemradio', { name, exact: true });
  await expect(item).toBeVisible();
  for (let step = 0; step < 4 && !(await item.evaluate((el) => el === document.activeElement)); step++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(item).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: `Screen: ${name}` })).toBeFocused();
}

const emails = (domain: string, count: number) =>
  JSON.stringify({ value: Array.from({ length: count }, (_, index) => ({ Email: `e${index}@${domain}` })) });

test('the multi-payload workspace works by keyboard alone (AC-2.5, AC-3.4, AC-5.5)', async ({ page }) => {
  await open(page);
  await openJsonReference(page);
  await parseSample(page, { outputFrom: 'Action', name: 'Get customer', shape: 'body', sample: emails('cust.example', 30) });
  await addPayload(page);
  await parseSample(page, { outputFrom: 'Action', name: 'Get manager', shape: 'body', sample: emails('mgr.example', 30) });
  const press = async (...keys: string[]) => {
    for (const key of keys) await page.keyboard.press(key);
  };
  const closeButton = (label: string) => page.getByRole('button', { name: `Close ${label}` });
  const search = page.getByRole('combobox', { name: 'Search all payloads' });
  const options = page.getByRole('option');

  await test.step('tab order crosses the strip: closes, the active tab, New payload, search, then Source', async () => {
    await page.getByRole('button', { name: /^Screen:/ }).focus();
    await press('Tab');
    await expectFocused(page, closeButton('Get customer, payload 1'));
    await press('Tab');
    await expectFocused(page, tabAt(page, 2));
    await expect(tabAt(page, 2)).toHaveAttribute('aria-selected', 'true');
    await press('Tab');
    await expectFocused(page, closeButton('Get manager, payload 2'));
    await press('Tab');
    await expectFocused(page, page.getByRole('button', { name: 'New payload', exact: true }));
    await press('Tab');
    await expectFocused(page, search);
    await press('Tab');
    await expectFocused(page, page.getByRole('radio', { name: 'Action · Body only' }));
  });

  await test.step('payload tabs move with Left, Right, Home and End and wrap', async () => {
    await press('Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab');
    await expectFocused(page, tabAt(page, 2));
    const expectTab = async (position: number, text: string) => {
      await expectFocused(page, tabAt(page, position));
      await expect(tabAt(page, position)).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('textbox', { name: 'Sample JSON', exact: true })).toHaveValue(new RegExp(text));
      const panel = page.getByRole('tabpanel');
      await expect(panel).toHaveAttribute('aria-labelledby', (await tabAt(page, position).getAttribute('id')) ?? '');
      expect(await tabAt(page, position).getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
    };
    await press('ArrowLeft');
    await expectTab(1, 'cust.example');
    await press('ArrowLeft');
    await expectTab(2, 'mgr.example');
    await press('ArrowRight');
    await expectTab(1, 'cust.example');
    await press('End');
    await expectTab(2, 'mgr.example');
    await press('Home');
    await expectTab(1, 'cust.example');
    await press('End');
    await expectTab(2, 'mgr.example');
  });

  await test.step('root choices move with the arrow keys', async () => {
    await press('Tab', 'Tab', 'Tab', 'Tab');
    const bodyOnly = page.getByRole('radio', { name: 'Action · Body only' });
    await expectFocused(page, bodyOnly);
    await press('ArrowRight');
    const triggerFull = page.getByRole('radio', { name: 'Trigger · Full output' });
    await expectFocused(page, triggerFull);
    await expect(triggerFull).toHaveAttribute('aria-checked', 'true');
    await press('ArrowLeft');
    await expectFocused(page, bodyOnly);
    await expect(bodyOnly).toHaveAttribute('aria-checked', 'true');
  });

  await test.step('tree rows, Show more and selection work from the keyboard', async () => {
    await press('Tab');
    await expect(page.getByRole('textbox', { name: 'Action name' })).toBeFocused();
    await press('Tab', 'Tab');
    await expectFocused(page, treeRow(page, "body('Get_manager')"));
    await press('ArrowDown', 'ArrowRight');
    await expect(treeRow(page, 'value')).toHaveAttribute('aria-expanded', 'true');
    await press('End');
    await expectFocused(page, page.getByRole('treeitem', { name: 'Show 10 more' }));
    await press('Enter');
    await expectFocused(page, treeRow(page, '[20]'));
    await press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowDown');
    await expectFocused(page, treeRow(page, 'Email'));
    await press('Enter');
    await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
    await expect(referenceExpression(page)).toHaveText("body('Get_manager')?['value'][24]?['Email']");
  });

  await test.step('copy actions follow the tree in tab order', async () => {
    await press('Tab');
    await expectFocused(page, page.getByRole('button', { name: 'Reference info' }));
    await press('Tab');
    await expectFocused(page, page.getByRole('button', { name: 'Copy @{}' }));
    await press('Tab');
    await expectFocused(page, referenceCopy(page));
    await press('Enter');
    await expect(page.getByText('Expression copied').first()).toBeVisible();
    expect(await clipboardText(page)).toBe("body('Get_manager')?['value'][24]?['Email']");
  });

  await test.step('search results move with Up and Down, wrap and Escape clears (AC-2.5)', async () => {
    await press('Shift+Tab', 'Shift+Tab', 'Shift+Tab');
    await expectFocused(page, treeRow(page, 'Email'));
    await press('Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab');
    await expectFocused(page, search);
    await page.keyboard.type('@mgr');
    await expect(options).toHaveCount(8);
    await expect(page.locator('.eb-payload-search-popup [role="status"]')).toHaveText('30 matches · 2 parsed payloads');
    const selected = () => page.locator('[role="option"][aria-selected="true"]');
    await expect(selected()).toHaveCount(1);
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(search).toHaveAttribute('aria-activedescendant', (await options.nth(1).getAttribute('id')) ?? '');
    await press('ArrowUp', 'ArrowUp');
    await expect(options.nth(7)).toHaveAttribute('aria-selected', 'true');
    await press('ArrowDown');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await press('Escape');
    await expect(search).toHaveValue('');
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectFocused(page, search);
  });

  await test.step('Enter on a result reveals that exact row and closes the search (AC-2.4)', async () => {
    await page.keyboard.type('@mgr');
    await press('ArrowDown', 'ArrowDown', 'Enter');
    await expect(search).toHaveValue('');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    const second = page.getByRole('treeitem', { name: /^Email, string, "e2@mgr/ });
    await expectFocused(page, second);
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(referenceExpression(page)).toHaveText("body('Get_manager')?['value'][2]?['Email']");

    // A result in another payload beyond its first 20 array children.
    await press('Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab');
    await expectFocused(page, search);
    await page.keyboard.type('e27@cust');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('Get customer');
    await press('Enter');
    await expect(tabAt(page, 1)).toHaveAttribute('aria-selected', 'true');
    const revealed = page.getByRole('treeitem', { name: /^Email, string, "e27@cust/ });
    await expectFocused(page, revealed);
    await expect(revealed).toBeInViewport();
    await expect(revealed).toHaveAttribute('aria-selected', 'true');
    await expect(referenceExpression(page)).toHaveText("body('Get_customer')?['value'][27]?['Email']");
    await expect(search).toHaveValue('');
  });

  await test.step('Functions source groups and reference insertion work from the keyboard', async () => {
    await chooseScreenByKeyboard(page, 'Functions');
    const parsedValue = page.getByRole('button', { name: /^Parsed Value \d+$/ });
    await parsedValue.focus();
    await press('Enter');
    const groups = page.locator('details.eb-pv-source');
    await expect(groups).toHaveCount(2);

    await press('Tab');
    await expectFocused(page, groups.first().locator('summary').first());
    await press('Space');
    await expect(groups.first()).toHaveJSProperty('open', true);
    await press('Tab', 'Space');
    await expectFocused(page, groups.first().locator('details.eb-pv-item > summary').first());
    await press('Tab');
    await expectFocused(page, page.getByRole('button', { name: 'value[0].Email' }).first());
    await press('Enter');
    const first = page.locator('input[data-arg]').first();
    await expectFocused(page, first);
    await expect(first).toHaveValue("body('Get_customer')?['value'][0]?['Email']");

    // Back from the first argument, the last control of the list is the second group's summary.
    await press('Shift+Tab');
    await expectFocused(page, groups.last().locator('summary').first());
    await press('Space', 'Tab', 'Space', 'Tab');
    await expect(groups.last()).toHaveJSProperty('open', true);
    await press('Enter');
    await expectFocused(page, first);
    await expect(first).toHaveValue("body('Get_manager')?['value'][0]?['Email']");

    // Alt+ArrowDown keeps the second argument as the target, so the list is reachable from it.
    await press('Tab');
    const second = page.locator('input[data-arg]').nth(1);
    await expectFocused(page, second);
    await expect(second).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowDown');
    await press('Alt+ArrowDown');
    await expectFocused(page, page.getByRole('button', { name: 'value[0].Email' }).first());
    await press('Enter');
    await expectFocused(page, second);
    await expect(second).toHaveValue("body('Get_customer')?['value'][0]?['Email']");
    await expect(first).toHaveValue("body('Get_manager')?['value'][0]?['Email']");
  });

  await test.step('closing and adding payloads keeps focus on a surviving tab (AC-5.5)', async () => {
    await chooseScreenByKeyboard(page, 'JSON reference');
    await press('Tab');
    await expectFocused(page, tabAt(page, 1));
    await press('Tab');
    await expectFocused(page, closeButton('Get customer, payload 1'));
    await press('Enter');
    await expectFocused(page, page.getByRole('tab', { name: 'Get manager, payload 1' }));
    await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(1);
    await press('Tab');
    await expectFocused(page, page.getByRole('button', { name: 'New payload', exact: true }));
    await press('Enter');
    await expectFocused(page, tabAt(page, 2));
    await expect(tabAt(page, 2)).toHaveAttribute('aria-selected', 'true');
    await press('Tab');
    await expectFocused(page, closeButton('Payload 2, payload 2'));
    await press('Enter');
    await expectFocused(page, page.getByRole('tab', { name: 'Get manager, payload 1' }));
  });
});

test('switching builders leaves the document and Export byte-identical (SC-003)', async ({ page }) => {
  await open(page);
  await addTwoRules(page);
  // The Functions screen stays mounted (hidden) with its own "Generated expression"; take the visible one.
  const expression = page.locator('[aria-label="Generated expression"]:visible');
  const expressionBefore = await expression.textContent();
  await page.getByRole('button', { name: 'Export' }).click();
  const exportBefore = await clipboardText(page);

  await loadEmailReference(page);
  await referenceCopy(page).click();
  await openCondition(page);

  await expect(expression).toHaveText(expressionBefore ?? '');
  await page.getByRole('button', { name: 'Export' }).click();
  expect(await clipboardText(page)).toBe(exportBefore);
});

test('the JSON reference view follows the host theme (FR-091)', async ({ page }) => {
  await open(page, { theme: 'light' });
  await openJsonReference(page);
  const card = page.locator('.eb-json-source');
  const lightSurface = await card.evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('.eb-root')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightSurface);
});

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 900, height: 700 },
  { width: 1280, height: 420 },
  { width: 1280, height: 860 },
  { width: 1440, height: 900 },
];

const longName = (position: number) => `Very long payload source name number ${position} for layout checks`;

/**
 * Controls the user cannot reach by scrolling their owning regions. Each control (and each extra
 * element) is scrolled into view the way a user would have to; a scroll that only an
 * `overflow: hidden` ancestor performed, or one that still leaves it outside the window, is a failure.
 */
function findUnreachable(extraSelectors: string[]): string[] {
  const controls = [...document.querySelectorAll('button, input, textarea, select, summary, [role="radio"], [role="tab"], [role="treeitem"]')];
  const extras = extraSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  const failures: string[] = [];
  for (const element of new Set([...controls, ...extras])) {
    const target = element as HTMLElement;
    if (!target.checkVisibility() || target.closest('[aria-hidden="true"], .eb-visually-hidden')) continue;
    const box = target.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const chain: Element[] = [];
    for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) chain.push(ancestor);
    const before = chain.map((ancestor) => [ancestor.scrollLeft, ancestor.scrollTop]);
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const rect = target.getBoundingClientRect();
    const clipped = chain.some((ancestor, index) => {
      const style = getComputedStyle(ancestor);
      const lockedX = ['hidden', 'clip'].includes(style.overflowX) && ancestor.scrollLeft !== before[index][0];
      const lockedY = ['hidden', 'clip'].includes(style.overflowY) && ancestor.scrollTop !== before[index][1];
      return lockedX || lockedY;
    });
    const outside = rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= innerHeight;
    chain.forEach((ancestor, index) => {
      ancestor.scrollLeft = before[index][0];
      ancestor.scrollTop = before[index][1];
    });
    if (clipped || outside) {
      failures.push(`${target.tagName.toLowerCase()} "${target.getAttribute('aria-label') ?? target.textContent?.trim().slice(0, 40)}" ${clipped ? 'needs a scroll its container does not allow' : 'stays outside the window'}`);
    }
  }
  return failures;
}

/** Page-level overflow and header geometry shared by every screen. */
const measureLayout = (page: Page) =>
  page.evaluate(() => {
    const visible = (element: Element) => (element as HTMLElement).checkVisibility();
    const controls = [...document.querySelectorAll('button, input, textarea, [role="radio"], [role="tab"]')]
      // Payload tabs scroll inside their own strip; only the strip itself must fit.
      .filter((control) => visible(control) && !control.closest('.eb-payload-tabs'));
    const header = document.querySelector('.eb-pill-header') as HTMLElement;
    const headerChildren = [...header.children].filter(visible).map((child) => child.getBoundingClientRect());
    return {
      pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      bodyScrollsSideways: document.body.scrollWidth > document.body.clientWidth,
      controlsCutOff: controls
        .map((control) => control.getBoundingClientRect())
        .filter((box) => box.width > 0 && (box.left < 0 || box.right > window.innerWidth + 0.5)).length,
      headerHeight: header.getBoundingClientRect().height,
      headerRows: new Set(headerChildren.map((box) => Math.round(box.top + box.height / 2))).size,
    };
  });

/** Source, Payload and Reference positions inside the workspace's own scroll space. */
const paneArrangement = (page: Page) =>
  page.evaluate(() => {
    const pane = document.querySelector('.eb-json-session [role="tabpanel"]:not([hidden])')!;
    const workspace = pane.querySelector('.eb-json-workspace') as HTMLElement;
    const origin = workspace.getBoundingClientRect();
    return ['.eb-json-source', '.eb-json-payload', '.eb-json-reference'].map((selector) => {
      const box = pane.querySelector(selector)!.getBoundingClientRect();
      return {
        left: Math.round(box.left - origin.left + workspace.scrollLeft),
        top: Math.round(box.top - origin.top + workspace.scrollTop),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    });
  });

for (const theme of THEMES) {
  test(`every viewport keeps all three screens inside the page width and reachable in the ${theme} theme (SC-011, FR-007, FR-092, AC-5.1 to AC-5.4)`, async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, { theme });
    await page.getByRole('button', { name: 'Load sample fields' }).first().click();
    const addRule = page.getByRole('button', { name: 'Add rule to group root' });
    await addRule.click();
    await addRule.click();

    // Five payloads with long names, each with the same Title selected and a loop name entered.
    // The sample is small on purpose: with fixtureA1 expanded to its first item the Reference card
    // collapses to 2px at 900x700 (reported separately), which would hide everything else checked here.
    const layoutSample = JSON.stringify({ value: [{ Title: 'Laptop refresh', Email: 'dana@contoso.com' }] });
    await openJsonReference(page);
    for (let position = 1; position <= 5; position++) {
      if (position > 1) await addPayload(page);
      await parseSample(page, { outputFrom: 'Action', name: longName(position), shape: 'full', sample: layoutSample });
      await select(page, ['value', '[0]', 'Title']);
      await page.getByRole('textbox', { name: 'Loop name' }).fill('Check it');
    }
    await openFunctions(page);
    await page.getByRole('button', { name: /^Parsed Value \d+$/ }).click();
    for (const summary of await page.locator('details.eb-pv-source > summary').all()) await summary.click();

    const search = page.getByRole('combobox', { name: 'Search all payloads' });
    const popup = page.locator('.eb-payload-search-popup');
    const strip = page.locator('.eb-payload-tabs');
    /** The focused tab (its Close button sits inside the tab box) must be fully inside the strip. */
    const tabsInView = async (position: number, where: string) => {
      await expect.poll(async () => {
        const bounds = await strip.boundingBox();
        const box = await tabAt(page, position).boundingBox();
        const close = await page.locator('.eb-payload-tab').nth(position - 1).locator('.eb-payload-close').boundingBox();
        expect(bounds).not.toBeNull();
        expect(box).not.toBeNull();
        expect(close).not.toBeNull();
        const within = (b: { x: number; width: number }) => b.x >= bounds!.x - 1 && b.x + b.width <= bounds!.x + bounds!.width + 1;
        return within(box!) && within(close!);
      }, { message: `${where}: tab ${position} and its Close button fully in the strip` }).toBe(true);
    };

    for (const viewport of VIEWPORTS) {
      const size = `${viewport.width}x${viewport.height}`;
      await page.setViewportSize(viewport);

      for (const screen of ['Trigger / Filter', 'Functions', 'JSON reference'] as const) {
        await test.step(`${theme} ${size} ${screen}`, async () => {
          await openScreen(page, screen);
          const where = `${screen} at ${size}`;
          const layout = await measureLayout(page);
          expect(layout.pageScrollsSideways, where).toBe(false);
          expect(layout.bodyScrollsSideways, where).toBe(false);
          expect(layout.controlsCutOff, where).toBe(0);
          if (viewport.width > 900) expect(layout.headerRows, where).toBe(1);

          const extras = screen === 'JSON reference'
            ? ['.eb-json-session [role="tabpanel"]:not([hidden]) [aria-label="Loop items() reference"]']
            : ['[aria-label="Generated expression"]'];
          expect(await page.evaluate(findUnreachable, extras), `${where}: every control reachable`).toEqual([]);

          if (screen === 'Functions') {
            for (const button of [page.getByRole('button', { name: 'Copy expression' }), page.getByRole('button', { name: 'Copy as @{…}' })]) {
              await button.scrollIntoViewIfNeeded();
              await expect(button, where).toBeInViewport();
            }
          }
          if (screen !== 'JSON reference') return;

          // Pane arrangement per width class, then unchanged by everything below.
          await tabAt(page, 5).click();
          const arranged = await paneArrangement(page);
          const [source, payload, referencePane] = arranged;
          if (viewport.width <= 600) {
            expect(source.top + source.height, `${where}: stacked`).toBeLessThanOrEqual(payload.top);
            expect(payload.top + payload.height, `${where}: stacked`).toBeLessThanOrEqual(referencePane.top);
            expect([payload.left, referencePane.left], where).toEqual([source.left, source.left]);
          } else if (viewport.width <= 900) {
            expect(source.left + source.width, where).toBeLessThanOrEqual(payload.left);
            expect(payload.top + payload.height, where).toBeLessThanOrEqual(referencePane.top);
            expect(referencePane.left, where).toBe(payload.left);
          } else {
            expect(source.left + source.width, where).toBeLessThanOrEqual(payload.left);
            expect(payload.left + payload.width, where).toBeLessThanOrEqual(referencePane.left);
            expect([payload.top, referencePane.top], where).toEqual([source.top, source.top]);
          }

          // Five long names overflow the strip, which scrolls on its own and keeps the focused tab in view.
          const overflow = await strip.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
          expect(overflow.scroll, `${where}: tabs overflow`).toBeGreaterThan(overflow.client);
          expect((await measureLayout(page)).pageScrollsSideways, where).toBe(false);
          await tabAt(page, 1).click();
          await tabAt(page, 1).press('End');
          await expectFocused(page, tabAt(page, 5));
          await tabsInView(5, where);
          await tabAt(page, 5).press('Home');
          await expectFocused(page, tabAt(page, 1));
          await tabsInView(1, where);
          await tabAt(page, 5).click();

          // The result list stays inside the window and keeps a visible focus ring.
          await search.fill('email');
          await expect(popup).toBeVisible();
          const list = await popup.boundingBox();
          expect(list, where).not.toBeNull();
          expect(list!.x, `${where}: popup left`).toBeGreaterThanOrEqual(0);
          expect(list!.y, `${where}: popup top`).toBeGreaterThanOrEqual(0);
          expect(list!.x + list!.width, `${where}: popup right`).toBeLessThanOrEqual(viewport.width);
          expect(list!.y + list!.height, `${where}: popup bottom`).toBeLessThanOrEqual(viewport.height);
          expect(await focusRing(page), `${where}: search ring`).not.toBe('none');
          await search.press('Escape');
          await expect(popup).toHaveCount(0);

          expect(await paneArrangement(page), `${where}: arrangement unchanged`).toEqual(arranged);
        });
      }
    }
  });
}

test('at 1280x860 the reference and Copy are visible without scrolling; at 1280x420 the cards scroll inside, not the workspace (FR-092)', async ({ page }) => {
  await open(page);
  await page.setViewportSize({ width: 1280, height: 860 });
  await loadEmailReference(page);

  await expect(page.getByLabel('Reference expression')).toBeInViewport();
  await expect(referenceCopy(page)).toBeInViewport();
  expect(await page.locator('.eb-json-workspace').evaluate((element) => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 1280, height: 420 });
  const workspace = page.locator('.eb-json-workspace');
  // Cards are bounded to the host frame, so the tree and reference body
  // scroll inside their cards and the workspace itself never needs a scrollbar.
  expect(await workspace.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await referenceCopy(page).scrollIntoViewIfNeeded();
  await expect(referenceCopy(page)).toBeInViewport();
});

test('samples at the limits parse and expand within 1 second (FR-039, SC-006 guard)', async ({ page }) => {
  await open(page);
  await openJsonReference(page);
  await page.getByRole('radio', { name: 'Trigger · Full output' }).click();
  const wide = JSON.stringify(Object.fromEntries(Array.from({ length: 9_999 }, (_, index) => [`key${index}`, index])));
  const samples = {
    size: JSON.stringify({ blob: 'x'.repeat(1_048_500) }),
    values: JSON.stringify(Array.from({ length: 9_999 }, (_, index) => index)),
    depth: '['.repeat(65) + ']'.repeat(65),
    wide,
  };

  for (const [name, sample] of Object.entries(samples)) {
    const started = Date.now();
    await pasteSample(page, sample);
    await expect(payloadMeta(page)).toHaveText(/^\d+ values?$/);
    await expect(page.getByRole('tree')).toBeVisible();
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: 'SC-006 parse', description: `${name}: ${elapsed} ms` });
    expect(elapsed, `${name} parse`).toBeLessThan(1_000);
  }

  // The widest node: collapse the root, then time its expansion.
  const root = treeRow(page, 'triggerOutputs()');
  await root.locator('[data-chevron]').click();
  const started = Date.now();
  await root.locator('[data-chevron]').click();
  await expect(page.getByRole('treeitem', { name: 'Show 9499 more' })).toBeVisible();
  const elapsed = Date.now() - started;
  test.info().annotations.push({ type: 'SC-006 expand', description: `9,999-member object: ${elapsed} ms` });
  expect(elapsed).toBeLessThan(1_000);
});
