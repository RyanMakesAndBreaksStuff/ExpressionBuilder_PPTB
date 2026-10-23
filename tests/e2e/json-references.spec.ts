import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
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
const jsonPanel = (page: Page) => page.getByRole('tabpanel');
const payloadMeta = (page: Page) => jsonPanel(page).getByRole('region', { name: 'Payload' }).locator('.eb-dock-meta');

/** Bare formula-editor copy. The panel also has "Copy @{}", "Copy item()", and "Copy item() @{}". */
const referenceCopy = (page: Page) => jsonPanel(page).getByRole('button', { name: 'Copy', exact: true });

const treeRow = (page: Page, label: string) =>
  jsonPanel(page).getByRole('treeitem', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) });

async function openJsonReference(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', {
    name: 'JSON reference',
    exact: true,
  }).click();
}

async function openFunctions(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Functions', exact: true }).click();
}

async function openConditionBuilder(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', {
    name: 'Trigger / Filter',
    exact: true,
  }).click();
}

/** Native paste into the Sample JSON textarea — the flow the app auto-parses. */
async function pasteSample(page: Page, text: string): Promise<void> {
  await page.evaluate(
    (value) => navigator.clipboard.writeText(value),
    text,
  );
  const editor = jsonPanel(page).getByRole('textbox', {
    name: 'Sample JSON',
    exact: true,
  });
  await editor.focus();
  await editor.press('Control+V');
}

async function parseSample(
  page: Page,
  source: { outputFrom: 'Action' | 'Trigger'; name?: string; shape: 'full' | 'body'; sample: string },
) {
  // One radiogroup of four combined roots, labelled e.g. 'Action · Full output'.
  const root = `${source.outputFrom} · ${source.shape === 'full' ? 'Full output' : 'Body only'}`;
  await jsonPanel(page).getByRole('radio', { name: root }).click();
  if (source.name !== undefined) await jsonPanel(page).getByLabel('Action name').fill(source.name);
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
        await expect(jsonPanel(page).getByLabel('Reference expression')).toHaveText(expected);
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
      await openConditionBuilder(page);
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
        await jsonPanel(page).getByLabel('Action name').fill('');
        await pasteSample(page, '{"a": 1,}');
        await expect(jsonPanel(page).getByRole('alert')).toBeVisible();
        await scan('JSON reference with errors');
      });
    }
});

test('the core task works by keyboard alone, with a visible focus ring (SC-005)', async ({ page }) => {
  await open(page);
  const focusRing = () => page.evaluate(() => getComputedStyle(document.activeElement as Element).boxShadow);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Screen:/ })).toBeFocused();
  // Header controls draw their focus ring as an outline rather than a box-shadow.
  expect(await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  const jsonItem = page.getByRole('menuitemradio', { name: 'JSON reference', exact: true });
  for (let step = 0; step < 3 && !(await jsonItem.evaluate((el) => el === document.activeElement)); step++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(jsonItem).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Screen: JSON reference' })).toBeVisible();

  // Payload strip: the selected tab, New payload, then search, before the root radios.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: 'Payload 1, payload 1' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '+ New payload' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Search all payloads' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(jsonPanel(page).getByRole('radio', { name: 'Action · Full output' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(jsonPanel(page).getByLabel('Action name')).toBeFocused();
  await page.keyboard.type('Get items');
  await page.keyboard.press('Tab');
  await expect(jsonPanel(page).getByLabel('Sample JSON')).toBeFocused();
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
  expect(await focusRing()).not.toBe('none');

  // Reference info, then the inline copy, then the bare Copy.
  await page.keyboard.press('Tab');
  await expect(jsonPanel(page).getByRole('button', { name: 'Reference info' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(jsonPanel(page).getByRole('button', { name: 'Copy @{}' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(referenceCopy(page)).toBeFocused();
  expect(await focusRing()).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Expression copied')).toBeVisible();
  expect(await clipboardText(page)).toBe(EMAIL);
});

test('switching builders leaves the document and Export byte-identical (SC-003)', async ({ page }) => {
  await open(page);
  await addTwoRules(page);
  // The Functions dock also labels a preview "Generated expression"; only one is visible.
  const expression = page.getByLabel('Generated expression').locator('visible=true');
  const expressionBefore = await expression.textContent();
  await page.getByRole('button', { name: 'Export' }).click();
  const exportBefore = await clipboardText(page);

  await loadEmailReference(page);
  await referenceCopy(page).click();
  await openConditionBuilder(page);

  await expect(expression).toHaveText(expressionBefore ?? '');
  await page.getByRole('button', { name: 'Export' }).click();
  expect(await clipboardText(page)).toBe(exportBefore);
});

test('the JSON reference view follows the host theme (FR-091)', async ({ page }) => {
  await open(page, { theme: 'light' });
  await openJsonReference(page);
  const card = jsonPanel(page).locator('.eb-json-source');
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

for (const theme of THEMES) {
  test(`every viewport keeps all three screens inside the page width in the ${theme} theme (SC-011, FR-007, FR-092)`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, { theme });
    await addTwoRules(page);
    await loadEmailReference(page);
    // A second, parsed payload so the strip, tabs and hidden panel are present.
    await page.getByRole('button', { name: '+ New payload', exact: true }).click();
    await jsonPanel(page).getByLabel('Action name').fill('Get manager');
    await pasteSample(page, '{"Email":"boss@example.com"}');
    await expect(payloadMeta(page)).toHaveText('2 values');
    await page.getByRole('tab', { name: /^Get items, payload 1$/ }).click();
    await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
    const views = [
      { name: 'Trigger / Filter', open: openConditionBuilder },
      { name: 'Functions', open: openFunctions },
      { name: 'JSON reference', open: openJsonReference },
    ];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const view of views) {
        await view.open(page);
        const layout = await page.evaluate(() => {
          const visible = (element: Element) => (element as HTMLElement).checkVisibility();
          const controls = [...document.querySelectorAll('button, input, textarea, [role="radio"], [role="tab"]')].filter(visible);
          const header = document.querySelector('.eb-pill-header') as HTMLElement;
          const headerChildren = [...header.children].filter(visible).map((child) => child.getBoundingClientRect());
          return {
            pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            // A control past the edge is reachable when a horizontally scrolling owner (the payload tab strip) that fits the page holds it.
            controlsCutOff: controls
              .filter((control) => {
                const box = control.getBoundingClientRect();
                if (box.width === 0 || (box.left >= 0 && box.right <= window.innerWidth + 0.5)) return false;
                for (let owner = control.parentElement; owner; owner = owner.parentElement) {
                  if (!/auto|scroll/.test(getComputedStyle(owner).overflowX)) continue;
                  const bounds = owner.getBoundingClientRect();
                  return !(bounds.left >= 0 && bounds.right <= window.innerWidth + 0.5);
                }
                return true;
              }).length,
            headerRows: new Set(headerChildren.map((box) => Math.round(box.top + box.height / 2))).size,
          };
        });
        const where = `${view.name} at ${viewport.width}x${viewport.height}`;
        expect(layout.pageScrollsSideways, where).toBe(false);
        expect(layout.controlsCutOff, where).toBe(0);
        if (viewport.width > 900) {
          expect(layout.headerRows, where).toBe(1);
        }

        if (view.name === 'JSON reference') {
          // Final Source, Payload and Reference content is reachable through its owning region.
          const reach = [
            { owner: 'Source', control: jsonPanel(page).getByRole('textbox', { name: 'Sample JSON', exact: true }) },
            { owner: 'Payload', control: jsonPanel(page).getByRole('treeitem').last() },
            { owner: 'Reference', control: jsonPanel(page).getByRole('button', { name: 'Copy item() @{}', exact: true }) },
          ];
          for (const { owner, control } of reach) {
            await control.scrollIntoViewIfNeeded();
            await expect.soft(control, `${owner} end content at ${viewport.width}x${viewport.height}`).toBeInViewport({ ratio: 0.9, timeout: 1500 });
          }
          // The strip stays one local row of controls; five-tab overflow scrolls inside .eb-payload-tabs.
          await expect.soft(page.locator('.eb-payload-strip'), where).toBeInViewport();
          await expect.soft(page.getByRole('combobox', { name: 'Search all payloads' }), where).toBeInViewport();
        }
      }
    }
  });
}

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

/** Page-level overflow and header geometry; payload tabs scroll inside their own strip, so only the strip must fit. */
const measureLayout = (page: Page) =>
  page.evaluate(() => {
    const visible = (element: Element) => (element as HTMLElement).checkVisibility();
    const controls = [...document.querySelectorAll('button, input, textarea, [role="radio"], [role="tab"]')]
      .filter((control) => visible(control) && !control.closest('.eb-payload-tabs'));
    const header = document.querySelector('.eb-pill-header') as HTMLElement;
    const headerChildren = [...header.children].filter(visible).map((child) => child.getBoundingClientRect());
    return {
      pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      bodyScrollsSideways: document.body.scrollWidth > document.body.clientWidth,
      controlsCutOff: controls
        .map((control) => control.getBoundingClientRect())
        .filter((box) => box.width > 0 && (box.left < 0 || box.right > window.innerWidth + 0.5)).length,
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

// One viewport per layout class (stacked, two-column, short desktop, wide desktop); the others share a class and are covered above.
const LAYOUT_CLASSES = ['375x667', '900x700', '1280x420', '1440x900'];

for (const viewport of VIEWPORTS.filter(({ width, height }) => LAYOUT_CLASSES.includes(`${width}x${height}`))) {
  const size = `${viewport.width}x${viewport.height}`;
  test(`five long-named payloads stay reachable, scroll their tabs locally and keep the pane arrangement at ${size} (AC-5.2 to AC-5.4)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page, { theme: 'dark' });
    await openJsonReference(page);
    // A small sample: the Reference card's own height at 900x700 is covered by the end-content checks above.
    const layoutSample = JSON.stringify({ value: [{ Title: 'Laptop refresh', Email: 'dana@contoso.com' }] });
    for (let position = 1; position <= 5; position++) {
      if (position > 1) await page.getByRole('button', { name: '+ New payload', exact: true }).click();
      await jsonPanel(page).getByLabel('Action name').fill(longName(position));
      await pasteSample(page, layoutSample);
      await expect(payloadMeta(page)).toHaveText('5 values');
    }
    // The active (last) payload shows its named-loop block, the tallest Reference content.
    await select(page, ['value', '[0]', 'Title']);
    await jsonPanel(page).getByLabel('Loop name').fill('Check it');
    const tabAt = (position: number) => page.getByRole('tab', { name: new RegExp(`, payload ${position}$`) });
    const strip = page.locator('.eb-payload-tabs');

    await test.step('JSON reference fits and every control is reachable', async () => {
      const layout = await measureLayout(page);
      expect(layout.pageScrollsSideways, size).toBe(false);
      expect(layout.bodyScrollsSideways, size).toBe(false);
      expect(layout.controlsCutOff, size).toBe(0);
      if (viewport.width > 900) expect(layout.headerRows, size).toBe(1);
      expect(
        await page.evaluate(findUnreachable, ['.eb-json-session [role="tabpanel"]:not([hidden]) [aria-label="Loop items() reference"]']),
        `${size}: every control reachable`,
      ).toEqual([]);
    });

    await test.step('panes keep their arrangement per width class, with or without search open', async () => {
      await tabAt(5).click();
      const arranged = await paneArrangement(page);
      const [source, payload, reference] = arranged;
      if (viewport.width <= 600) {
        expect(source.top + source.height, `${size}: stacked`).toBeLessThanOrEqual(payload.top);
        expect(payload.top + payload.height, `${size}: stacked`).toBeLessThanOrEqual(reference.top);
        expect([payload.left, reference.left], size).toEqual([source.left, source.left]);
      } else if (viewport.width <= 900) {
        expect(source.left + source.width, size).toBeLessThanOrEqual(payload.left);
        expect(payload.top + payload.height, size).toBeLessThanOrEqual(reference.top);
        expect(reference.left, size).toBe(payload.left);
      } else {
        expect(source.left + source.width, size).toBeLessThanOrEqual(payload.left);
        expect(payload.left + payload.width, size).toBeLessThanOrEqual(reference.left);
        expect([payload.top, reference.top], size).toEqual([source.top, source.top]);
      }

      // Five long names overflow the strip, which scrolls on its own and keeps the focused tab in view.
      const overflow = await strip.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
      expect(overflow.scroll, `${size}: tabs overflow`).toBeGreaterThan(overflow.client);
      for (const [from, key, position] of [[1, 'End', 5], [5, 'Home', 1]] as const) {
        await tabAt(from).click();
        await tabAt(from).press(key);
        await expect(tabAt(position)).toBeFocused();
        await expect(async () => {
          const [bounds, box, close] = await Promise.all([
            strip.boundingBox(),
            tabAt(position).boundingBox(),
            page.locator('.eb-payload-tab').nth(position - 1).locator('.eb-payload-close').boundingBox(),
          ]);
          for (const inner of [box, close]) {
            expect(inner).not.toBeNull();
            expect(inner!.x).toBeGreaterThanOrEqual(bounds!.x - 1);
            expect(inner!.x + inner!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
          }
        }, `${size}: tab ${position} and its Close fully in the strip`).toPass({ timeout: 5_000 });
      }
      expect((await measureLayout(page)).pageScrollsSideways, size).toBe(false);

      await tabAt(5).click();
      const search = page.getByRole('combobox', { name: 'Search all payloads' });
      await search.fill('email');
      await expect(page.locator('.eb-payload-search-popup')).toBeVisible();
      await search.press('Escape');
      await expect(page.locator('.eb-payload-search-popup')).toHaveCount(0);
      expect(await paneArrangement(page), `${size}: arrangement unchanged`).toEqual(arranged);
    });

    await test.step('Functions with five expanded source groups fits and stays reachable', async () => {
      await openFunctions(page);
      await page.getByRole('button', { name: /^Parsed Value \d+$/ }).click();
      for (const summary of await page.locator('details.eb-pv-source > summary').all()) await summary.click();
      const layout = await measureLayout(page);
      expect(layout.pageScrollsSideways, `Functions at ${size}`).toBe(false);
      expect(layout.bodyScrollsSideways, `Functions at ${size}`).toBe(false);
      expect(layout.controlsCutOff, `Functions at ${size}`).toBe(0);
      if (viewport.width > 900) expect(layout.headerRows, `Functions at ${size}`).toBe(1);
      expect(await page.evaluate(findUnreachable, ['[aria-label="Generated expression"]']), `Functions at ${size}: every control reachable`).toEqual([]);
      for (const name of ['Copy expression', 'Copy as @{…}']) {
        const button = page.getByRole('button', { name });
        await button.scrollIntoViewIfNeeded();
        await expect(button, `Functions at ${size}`).toBeInViewport();
      }
    });
  });
}

test('at 1280x860 the reference and Copy are visible without scrolling; at 1280x420 the cards scroll inside, not the workspace (FR-092)', async ({ page }) => {
  await open(page);
  await page.setViewportSize({ width: 1280, height: 860 });
  await loadEmailReference(page);

  await expect(jsonPanel(page).getByLabel('Reference expression')).toBeInViewport();
  await expect(referenceCopy(page)).toBeInViewport();
  expect(await jsonPanel(page).locator('.eb-json-workspace').evaluate((element) => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 1280, height: 420 });
  const workspace = jsonPanel(page).locator('.eb-json-workspace');
  // Cards are bounded to the host frame, so the tree and reference body
  // scroll inside their cards and the workspace itself never needs a scrollbar.
  expect(await workspace.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await referenceCopy(page).scrollIntoViewIfNeeded();
  await expect(referenceCopy(page)).toBeInViewport();
});

test('samples at the limits parse and expand within 1 second (FR-039, SC-006 guard)', async ({ page }) => {
  await open(page);
  await openJsonReference(page);
  await jsonPanel(page).getByRole('radio', { name: 'Trigger · Full output' }).click();
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
    await expect(jsonPanel(page).getByRole('tree')).toBeVisible();
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: 'SC-006 parse', description: `${name}: ${elapsed} ms` });
    expect(elapsed, `${name} parse`).toBeLessThan(1_000);
  }

  // The widest node: collapse the root, then time its expansion.
  const root = treeRow(page, 'triggerOutputs()');
  await root.locator('[data-chevron]').click();
  const started = Date.now();
  await root.locator('[data-chevron]').click();
  await expect(jsonPanel(page).getByRole('treeitem', { name: 'Show 9499 more' })).toBeVisible();
  const elapsed = Date.now() - started;
  test.info().annotations.push({ type: 'SC-006 expand', description: `9,999-member object: ${elapsed} ms` });
  expect(elapsed).toBeLessThan(1_000);
});
