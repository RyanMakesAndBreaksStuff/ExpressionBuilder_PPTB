import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import {
  fixtureA1,
  triggerBodySample,
  triggerFullSample,
} from '../../packages/builder-ui/test/fixtures/jsonReferenceFixtures';

type Build = 'web' | 'pptb';
type Theme = 'light' | 'dark';

declare global {
  interface Window {
    toolboxAPI?: unknown;
    __copied?: string[];
    __notices?: Array<{ title: string; body: string; type: string }>;
    __audit?: { enabled: boolean; writes: string[] };
  }
}

const URLS: Record<Build, string> = { web: 'http://127.0.0.1:5173/', pptb: 'http://127.0.0.1:5174/' };
const BUILDS: Build[] = ['web', 'pptb'];
const THEMES: Theme[] = ['light', 'dark'];
const EMAIL = "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']";
const NO_CLIPBOARD = 'the host does not provide a clipboard API';
// Today's header: the 46px mode switch row plus 24px padding and a 1px border.
const TODAYS_HEADER_HEIGHT = 71;

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Loads a build with onboarding dismissed; the PPTB build gets a mocked toolboxAPI. */
async function open(page: Page, build: Build, options: { theme?: Theme; clipboard?: boolean } = {}) {
  const { theme = 'light', clipboard = true } = options;
  await page.addInitScript(() => localStorage.setItem('eb.onboarding.seen.v1', '1'));
  if (build === 'pptb') {
    await page.addInitScript(
      ({ theme, clipboard }) => {
        window.__copied = [];
        window.__notices = [];
        window.toolboxAPI = {
          utils: {
            ...(clipboard ? { copyToClipboard: async (text: string) => void window.__copied?.push(text) } : {}),
            showNotification: async (notice: { title: string; body: string; type: string }) =>
              void window.__notices?.push(notice),
            getCurrentTheme: async () => theme,
          },
          settings: {
            get: async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : undefined),
            set: async () => undefined,
            setAll: async () => undefined,
            getAll: async () => ({}),
          },
          events: { on: () => undefined, off: () => undefined, getHistory: async () => [] },
        };
      },
      { theme, clipboard },
    );
  } else {
    await page.emulateMedia({ colorScheme: theme });
  }
  await page.goto(URLS[build]);
  await expect(page.locator('.eb-root')).toHaveAttribute('data-theme', theme);
}

async function clipboardText(page: Page, build: Build): Promise<string | undefined> {
  return build === 'web'
    ? page.evaluate(() => navigator.clipboard.readText())
    : page.evaluate(() => window.__copied?.at(-1));
}

// Assert the parsed result through its Payload count, not the host's global notification region.
const parsedValueCount = (page: Page) => page.getByRole('region', { name: 'Payload' }).getByText(/^\d+ values?$/);

const referenceCopy = (page: Page) =>
  page.getByRole('region', { name: 'Reference' }).getByRole('button', { name: 'Copy', exact: true });

async function expectCopySuccess(page: Page, build: Build) {
  if (build === 'pptb') {
    await expect
      .poll(() => page.evaluate(() => window.__notices?.at(-1)))
      .toEqual({ title: 'Success', body: 'Expression copied', type: 'success' });
  } else {
    await expect(page.getByText('Expression copied', { exact: true }).last()).toBeVisible();
  }
}

const treeRow = (page: Page, label: string) =>
  page.getByRole('treeitem', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) });

async function goToScreen(page: Page, label: string) {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name: label }).click();
}

async function openJsonReference(page: Page) {
  await goToScreen(page, 'JSON reference');
}

async function parseSample(
  page: Page,
  source: { outputFrom: 'Action' | 'Trigger'; name?: string; shape: 'full' | 'body'; sample: string },
  build: Build = 'web',
) {
  const shape = source.shape === 'full' ? 'Full output' : 'Body only';
  await page.getByRole('radio', { name: source.outputFrom + ' · ' + shape }).click();
  if (source.name !== undefined) await page.getByLabel('Action name').fill(source.name);
  await page.getByLabel('Sample JSON').fill(source.sample);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(parsedValueCount(page)).toHaveText(/^\d+ values?$/);
  if (build === 'pptb') {
    const parsedCount = await parsedValueCount(page).innerText();
    await expect
      .poll(() => page.evaluate(() => window.__notices?.at(-1)))
      .toEqual({ title: 'Success', body: 'Parsed · ' + parsedCount, type: 'success' });
  }
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

async function loadEmailReference(page: Page, build: Build = 'web') {
  await openJsonReference(page);
  await parseSample(page, { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 }, build);
  await select(page, ['body', 'value', '[0]', 'Requester', 'Email']);
}

for (const build of BUILDS) {
  test.describe(`${build} build`, () => {
    test('copies a correctly rooted reference for each of the four roots (SC-002)', async ({ page }) => {
      await open(page, build);
      await openJsonReference(page);
      const bodyOnly = JSON.stringify(JSON.parse(fixtureA1).body);
      const cases = [
        { source: { outputFrom: 'Action', name: 'Get items', shape: 'full', sample: fixtureA1 }, path: ['body', 'value', '[0]', 'Requester', 'Email'], expected: EMAIL },
        { source: { outputFrom: 'Action', name: 'Get items', shape: 'body', sample: bodyOnly }, path: ['value', '[0]', 'Title'], expected: "body('Get_items')?['value'][0]?['Title']" },
        { source: { outputFrom: 'Trigger', shape: 'full', sample: triggerFullSample }, path: ['body', 'customer', 'name'], expected: "triggerOutputs()?['body']?['customer']?['name']" },
        { source: { outputFrom: 'Trigger', shape: 'body', sample: triggerBodySample }, path: ['customer', 'name'], expected: "triggerBody()?['customer']?['name']" },
      ] as const;

      for (const { source, path, expected } of cases) {
        await parseSample(page, source, build);
        await select(page, [...path]);
        await expect(page.getByLabel('Reference expression')).toHaveText(expected);
        await referenceCopy(page).click();
        await expectCopySuccess(page, build);
        expect(await clipboardText(page, build)).toBe(expected);
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
      await open(page, build);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        if (window.__audit) window.__audit.enabled = true;
        const api = window.toolboxAPI as { settings?: Record<string, unknown> } | undefined;
        for (const method of ['set', 'setAll'] as const) {
          if (api?.settings) api.settings[method] = async () => void window.__audit?.writes.push(`settings.${method}`);
        }
      });
      page.on('request', (request) => requests.push(request.url()));

      await loadEmailReference(page, build);
      await referenceCopy(page).click();
      await expectCopySuccess(page, build);
      await goToScreen(page, 'Functions');
      await openJsonReference(page);

      expect(requests).toEqual([]);
      expect(await page.evaluate(() => window.__audit?.writes)).toEqual([]);
    });

    for (const theme of THEMES) {
      test(`both views pass the accessibility scan in the ${theme} theme (FR-085)`, async ({ page }) => {
        await open(page, build, { theme });
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
        await loadEmailReference(page, build);
        await scan('JSON reference with a selection');
        await page.getByLabel('Action name').fill('');
        await page.getByLabel('Sample JSON').fill('{"a": 1,}');
        await page.getByRole('button', { name: 'Parse' }).click();
        await expect(page.getByRole('alert')).toBeVisible();
        await scan('JSON reference with errors');
      });
    }
  });
}

test('the core task works by keyboard alone, with a visible focus ring (SC-005)', async ({ page }) => {
  await open(page, 'web');
  const focusRing = () => page.evaluate(() => getComputedStyle(document.activeElement as Element).boxShadow);
  const focusOutline = () => page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);

  const screenChip = page.getByRole('button', { name: /^Screen:/ });
  await page.keyboard.press('Tab');
  await expect(screenChip).toBeFocused();
  expect(await focusOutline()).not.toBe('none');
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Screen: JSON reference' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('radiogroup', { name: 'Reference root' }).getByRole('radio', { name: 'Action · Full output' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Action name')).toBeFocused();
  await page.keyboard.type('Get items');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Sample JSON')).toBeFocused();
  await page.keyboard.insertText(fixtureA1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(parsedValueCount(page)).toHaveText('25 values');

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

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reference info' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Copy @/ }).first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(referenceCopy(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expectCopySuccess(page, 'web');
  expect(await clipboardText(page, 'web')).toBe(EMAIL);
});

test('a PPTB host without a clipboard API reports all three copy failures (SC-007)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await open(page, 'pptb', { clipboard: false });
  const notices = () => page.evaluate(() => window.__notices ?? []);

  await addTwoRules(page);
  await page.getByRole('region', { name: 'Expression Preview' }).getByRole('button', { name: 'Copy' }).click();
  await expect.poll(notices).toContainEqual({ title: 'Error', body: `Could not copy expression: ${NO_CLIPBOARD}`, type: 'error' });
  await page.getByRole('button', { name: 'Export' }).click();
  await expect.poll(notices).toContainEqual({ title: 'Error', body: `Could not copy expression JSON: ${NO_CLIPBOARD}`, type: 'error' });

  await loadEmailReference(page, 'pptb');
  await referenceCopy(page).click();
  await expect.poll(notices).toContainEqual({ title: 'Error', body: 'Could not copy expression: ' + NO_CLIPBOARD, type: 'error' });

  expect((await notices()).some((notice) => notice.type === 'success' && notice.body === 'Expression copied')).toBe(false);
  await expect(page.getByText('Expression copied', { exact: true }).last()).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('switching builders leaves the document and Export byte-identical (SC-003)', async ({ page }) => {
  await open(page, 'web');
  await addTwoRules(page);
  const expression = page.locator('[aria-label="Trigger / Filter"]').getByLabel('Generated expression');
  const expressionBefore = await expression.textContent();
  await page.getByRole('button', { name: 'Export' }).click();
  const exportBefore = await clipboardText(page, 'web');

  await loadEmailReference(page);
  await referenceCopy(page).click();
  await goToScreen(page, 'Trigger / Filter');

  await expect(expression).toHaveText(expressionBefore ?? '');
  await page.getByRole('button', { name: 'Export' }).click();
  expect(await clipboardText(page, 'web')).toBe(exportBefore);
});

test('the JSON reference view follows the host theme (FR-091)', async ({ page }) => {
  await open(page, 'web', { theme: 'light' });
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
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

for (const theme of THEMES) {
  test(`every viewport keeps all three screens inside the page width in the ${theme} theme (SC-011, FR-007, FR-092)`, async ({ page }) => {
    await open(page, 'web', { theme });
    await addTwoRules(page);
    await loadEmailReference(page);
    const views = [
      { name: 'Functions' },
      { name: 'Trigger / Filter' },
      { name: 'JSON reference' },
    ];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const view of views) {
        await goToScreen(page, view.name);
        const layout = await page.evaluate(() => {
          const visible = (element: Element) => (element as HTMLElement).checkVisibility();
          const controls = [...document.querySelectorAll('button, input, textarea, [role="radio"], [role="tab"]')].filter(visible);
          const header = document.querySelector('.eb-pill-header') as HTMLElement;
          const headerChildren = [...header.children].filter(visible).map((child) => child.getBoundingClientRect());
          return {
            pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            controlsCutOff: controls
              .map((control) => control.getBoundingClientRect())
              .filter((box) => box.width > 0 && (box.left < 0 || box.right > window.innerWidth + 0.5)).length,
            headerHeight: header.getBoundingClientRect().height,
            headerRows: new Set(headerChildren.map((box) => Math.round(box.top + box.height / 2))).size,
          };
        });
        const where = `${view.name} at ${viewport.width}x${viewport.height}`;
        expect(layout.pageScrollsSideways, where).toBe(false);
        expect(layout.controlsCutOff, where).toBe(0);
        if (viewport.width > 900) {
          expect(layout.headerRows, where).toBe(1);
          expect(layout.headerHeight, where).toBeLessThanOrEqual(TODAYS_HEADER_HEIGHT);
        }
      }
    }
  });
}

test('at 1280x800 the reference and Copy are visible without scrolling; at 1280x420 the workspace scrolls (FR-092)', async ({ page }) => {
  await open(page, 'web');
  await page.setViewportSize({ width: 1280, height: 800 });
  await loadEmailReference(page);

  await expect(page.getByLabel('Reference expression')).toBeInViewport();
  await expect(referenceCopy(page)).toBeInViewport();
  expect(await page.locator('.eb-json-workspace').evaluate((element) => element.scrollTop)).toBe(0);

  await page.setViewportSize({ width: 1280, height: 420 });
  const workspace = page.locator('.eb-json-workspace');
  expect(await workspace.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await referenceCopy(page).scrollIntoViewIfNeeded();
  await expect(referenceCopy(page)).toBeInViewport();
});

test('samples at the limits parse and expand within 1 second (FR-039, SC-006 guard)', async ({ page }) => {
  await open(page, 'web');
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
    await page.getByLabel('Sample JSON').fill(sample);
    const started = Date.now();
    await page.getByRole('button', { name: 'Parse' }).click();
    await expect(parsedValueCount(page)).toHaveText(/^\d+ values?$/);
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
