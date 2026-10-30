import { expect, test, type Locator, type Page } from 'playwright/test';

test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
});

type Toasts = { __toasts: string[] };

const ARIA_BUTTON = (name: string) => ({ name, exact: true });

async function start(page: Page, size?: { width: number; height: number }): Promise<void> {
  // The web adapter renders notices as fixed, auto-expiring toasts; record every
  // one so assertions count delivered notices rather than race their removal.
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
    const seen: string[] = [];
    (window as unknown as Toasts).__toasts = seen;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.parentElement === document.body &&
              node.style.position === 'fixed' && node.style.zIndex === '9999') {
            seen.push(node.textContent ?? '');
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  if (size) await page.setViewportSize(size);
  await page.goto('/');
  await openScreen(page, 'JSON reference');
}

const toasts = (page: Page) =>
  page.evaluate(() => (window as unknown as Toasts).__toasts.slice());

async function openScreen(
  page: Page,
  name: 'Functions' | 'Trigger / Filter' | 'JSON reference',
): Promise<void> {
  await page.getByRole('tablist', { name: 'Screen' }).getByRole('tab', { name, exact: true }).click();
}

// The header's screen tabs are tabs too, so payload tab queries stay inside the payload tablist.
const payloadTabs = (page: Page) => page.getByRole('tablist', { name: 'Payloads' });

const panel = (page: Page) => page.getByRole('tabpanel');
const editorOf = (page: Page) =>
  panel(page).getByRole('textbox', { name: 'Sample JSON', exact: true });
const nameOf = (page: Page) => panel(page).getByLabel('Action', { exact: true });
const statusOf = (page: Page) => panel(page).locator('.eb-json-source .eb-json-status');
const newPayload = (page: Page) => page.getByRole('button', ARIA_BUTTON('+ Add'));
const treeRow = (page: Page, label: string) =>
  panel(page).getByRole('treeitem', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `) });

async function writeClipboard(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
}

/** Native whole-field paste: real clipboard plus Control+V, never a synthetic event. */
async function pasteSample(page: Page, text: string): Promise<void> {
  await writeClipboard(page, text);
  const editor = editorOf(page);
  await editor.focus();
  await editor.press('Control+V');
}

/** Appends a payload (which activates) and names it. */
async function addPayload(page: Page, name: string, sample?: string): Promise<void> {
  await newPayload(page).click();
  await nameOf(page).fill(name);
  if (sample !== undefined) await pasteSample(page, sample);
}

const items = (count: number) => JSON.stringify({
  items: Array.from({ length: count }, (_, id) => ({ id, Email: `user${id}@x.com` })),
});

const emails = (domain: string, count: number) => JSON.stringify({
  value: Array.from({ length: count }, (_, index) => ({ Email: `e${index}@${domain}` })),
});

const tabAt = (page: Page, position: number) =>
  payloadTabs(page).getByRole('tab', { name: new RegExp(`, payload ${position}$`) });
const referenceOf = (page: Page) => panel(page).getByLabel('Reference expression');
const chooseRoot = (page: Page, root: string) => panel(page).getByRole('radio', { name: root }).click();
const parsedValue = (page: Page) => page.getByRole('button', { name: /^Parsed Value \d+$/ });
const sourceToggle = (page: Page, label: string) =>
  page.getByRole('button', { name: new RegExp(`^${label} \\d+$`) });
const sourceGroup = (page: Page, label: string) =>
  page.locator('[data-pv-group]').filter({ has: sourceToggle(page, label) });

/** Freezes the page clock so the 600ms debounce only advances through runFor(). */
async function pauseClock(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 100);
}

async function expectInside(inner: Locator, outer: Locator): Promise<void> {
  const [a, b] = await Promise.all([inner.boundingBox(), outer.boundingBox()]);
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(a!.x).toBeGreaterThanOrEqual(b!.x - 1);
  expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x + b!.width + 1);
}

async function expectVisibleFocusRing(page: Page): Promise<void> {
  const ring = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return {
      outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow !== 'none',
    };
  });
  expect(ring.outline || ring.shadow).toBe(true);
}

test('keeps samples independent and preserves native paste undo', async ({
  page,
}) => {
  await start(page);

  await pasteSample(page, '{"old":1}');
  const editor = editorOf(page);

  await editor.evaluate((element) =>
    (element as HTMLTextAreaElement).setSelectionRange(2, 5),
  );
  await pasteSample(page, '{"new":2}');
  await expect(editor).toHaveValue('{"new":2}');

  await editor.press('Control+Z');
  await expect(editor).toHaveValue('{"old":1}');
  await editor.press('Control+Y');
  await expect(editor).toHaveValue('{"new":2}');

  await newPayload(page).click();
  await expect(editor).toHaveValue('');

  await pasteSample(page, '{"second":3}');
  await payloadTabs(page).getByRole('tab', {
    name: /^Action, payload 1$/,
  }).click();
  await expect(editor).toHaveValue('{"new":2}');
});

test('starts with one empty payload, enforces the 1 and 5 limits and restores one empty payload on reload', async ({ page }) => {
  await start(page);

  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expect(payloadTabs(page).getByRole('tab', { name: 'Payload 1, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(panel(page).getByRole('radio', { name: 'Action · Full output' })).toHaveAttribute('aria-checked', 'true');
  await expect(nameOf(page)).toHaveValue('');
  await expect(panel(page).getByLabel('Loop name')).toHaveCount(0);
  await expect(editorOf(page)).toHaveValue('');
  // The last payload offers no close action.
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);

  for (let count = 2; count <= 5; count++) await newPayload(page).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(5);
  await expect(page.getByText('5 / 5')).toBeVisible();
  await expect(newPayload(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(5);

  await pasteSample(page, '{"kept":1}');
  await expect(editorOf(page)).toHaveValue('{"kept":1}');
  await page.reload();
  await openScreen(page, 'JSON reference');
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expect(payloadTabs(page).getByRole('tab', { name: 'Payload 1, payload 1' })).toBeVisible();
  await expect(editorOf(page)).toHaveValue('');
  await expect(page.getByText('1 / 5')).toBeVisible();
});

for (const size of [
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`five long-named tabs scroll inside the strip and keep the focused tab visible at ${size.width}x${size.height}`, async ({ page }) => {
    await start(page, size);
    await nameOf(page).fill('Get customer account details from the Dataverse list rows action 1');
    for (let index = 2; index <= 5; index++) {
      await addPayload(page, `Get customer account details from the Dataverse list rows action ${index}`);
    }
    await expect(newPayload(page)).toBeDisabled();

    const strip = page.locator('.eb-payload-tabs');
    // Five 168px cards only exceed a wide strip's width when it is narrower than their total, so cap the strip at 640px to keep this overflow case real at every viewport.
    await strip.evaluate((element) => { element.style.maxWidth = '640px'; });
    const overflow = await strip.evaluate((element) => ({
      scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
    // Overflow stays local: the page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const tabs = payloadTabs(page).getByRole('tab');
    await tabs.last().focus();
    for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowLeft', 'Home', 'ArrowLeft']) {
      await page.keyboard.press(key);
      const focused = page.locator('[role="tab"]:focus');
      await expect(focused).toHaveCount(1);
      await expect(focused).toHaveAttribute('aria-selected', 'true');
      await expectInside(focused, strip);
    }
    await expectVisibleFocusRing(page);
    // Every tab remains discoverable by its full accessible name even though its label is truncated.
    await expect(tabs.nth(0)).toHaveAccessibleName('Get customer account details from the Dataverse list rows action 1, payload 1');
  });
}

for (const size of [
  { width: 375, height: 667 },
  { width: 1280, height: 420 },
  { width: 1440, height: 900 },
]) {
  test(`search results stay inside the viewport at ${size.width}x${size.height}`, async ({ page }) => {
    await start(page, size);
    await nameOf(page).fill('Get items');
    await pasteSample(page, items(30));
    await expect(statusOf(page)).toHaveText('Parsed · 92 values');

    const search = page.getByRole('combobox', { name: 'Search all payloads' });
    await search.fill('email');
    const popup = page.locator('.eb-payload-search-popup');
    await expect(popup).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(8);
    await expect(popup.getByRole('status')).toHaveText('30 matches · 1 parsed payloads');

    const box = await popup.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    // The list scrolls inside its popup, so the last option is reachable.
    await page.getByRole('option').last().scrollIntoViewIfNeeded();
    await expect(page.getByRole('option').last()).toBeInViewport();
  });
}

test('payload tabs work by keyboard: arrows wrap, Home/End jump, close moves focus to the replacement, add focuses the new tab', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Alpha');
  await addPayload(page, 'Bravo');
  await addPayload(page, 'Charlie');
  const tab = (name: string) => payloadTabs(page).getByRole('tab', { name: new RegExp(`^${name}, payload \\d$`) });
  await tab('Charlie').focus();

  async function expectSelectedAndFocused(name: string, position: number): Promise<void> {
    await expect(tab(name)).toBeFocused();
    await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
    await expect(tab(name)).toHaveAttribute('tabindex', '0');
    await expect(payloadTabs(page).getByRole('tab', { selected: true })).toHaveCount(1);
    await expect(panel(page)).toHaveAccessibleName(`${name}, payload ${position}`);
    await expectVisibleFocusRing(page);
  }

  await page.keyboard.press('Home');
  await expectSelectedAndFocused('Alpha', 1);
  await page.keyboard.press('ArrowLeft');
  await expectSelectedAndFocused('Charlie', 3);
  await page.keyboard.press('ArrowRight');
  await expectSelectedAndFocused('Alpha', 1);
  await page.keyboard.press('End');
  await expectSelectedAndFocused('Charlie', 3);
  await page.keyboard.press('ArrowLeft');
  await expectSelectedAndFocused('Bravo', 2);

  // Tab reaches the focused payload's own close control; Enter closes it and the
  // tab now occupying that position becomes active and receives focus.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', ARIA_BUTTON('Close Bravo, payload 2'))).toBeFocused();
  await expectVisibleFocusRing(page);
  await page.keyboard.press('Enter');
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(2);
  await expectSelectedAndFocused('Charlie', 2);

  // Closing the last tab falls back to its predecessor.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expectSelectedAndFocused('Alpha', 1);
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);

  // + Add by keyboard appends, activates and focuses the new tab.
  await page.keyboard.press('Tab');
  await expect(newPayload(page)).toBeFocused();
  await expectVisibleFocusRing(page);
  await page.keyboard.press('Enter');
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(2);
  await expectSelectedAndFocused('Payload 2', 2);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Search all payloads' })).toBeFocused();
  await expectVisibleFocusRing(page);
});

test('search by keyboard reveals item 24 in the tree, selects and focuses its row and shows its exact reference', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Get items');
  await pasteSample(page, items(30));
  await expect(statusOf(page)).toHaveText('Parsed · 92 values');
  await addPayload(page, 'Other', '{"Email":"other@x.com"}');
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');

  const search = page.getByRole('combobox', { name: 'Search all payloads' });
  const options = page.getByRole('option');
  await search.focus();
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.type('email');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(options).toHaveCount(8);
  await expect(page.getByRole('status').filter({ hasText: 'matches' })).toHaveText('31 matches · 2 parsed payloads');
  await expect(options.first()).toContainText('Get items');
  await expect(options.first()).toContainText('items[0].Email');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  const activeId = (index: number) => options.nth(index).getAttribute('id');

  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  expect(await search.getAttribute('aria-activedescendant')).toBe(await activeId(1));
  await page.keyboard.press('ArrowUp');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(options.nth(7)).toHaveAttribute('aria-selected', 'true');
  await expect(search).toBeFocused();

  // Escape clears and closes while focus stays in search.
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.eb-payload-search-popup')).toHaveCount(0);
  await expect(search).toBeFocused();

  // A whitespace-only query opens nothing; an unmatched one says so.
  await page.keyboard.type('   ');
  await expect(page.locator('.eb-payload-search-popup')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.type('zzz-nothing');
  await expect(page.getByText('No matches in parsed payloads.')).toBeVisible();
  await page.keyboard.press('Escape');

  // Search a value beyond the first 20 array children, from the other payload's tab.
  await page.keyboard.type('user24@');
  await expect(options).toHaveCount(1);
  await page.keyboard.press('Enter');

  await expect(payloadTabs(page).getByRole('tab', { name: 'Get items, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(search).toHaveValue('');
  await expect(page.locator('.eb-payload-search-popup')).toHaveCount(0);
  const row = treeRow(page, 'Email');
  await expect(row).toBeFocused();
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(row).toHaveAttribute('aria-label', 'Email, string, "user24@x.com"');
  await expect(row).toBeInViewport();
  await expect(panel(page).getByLabel('Reference expression'))
    .toHaveText("outputs('Get_items')?['items'][24]?['Email']");
  await expectVisibleFocusRing(page);

  // Tree keyboard: Up/Down rove, Home/End jump, Left moves to the parent.
  await page.keyboard.press('ArrowUp');
  await expect(treeRow(page, 'id')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(treeRow(page, '[24]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(panel(page).getByRole('treeitem').first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(panel(page).getByRole('treeitem').last()).toBeFocused();

  // Source root radios by keyboard: arrows move selection and focus together.
  const full = panel(page).getByRole('radio', { name: 'Action · Full output' });
  await full.focus();
  await page.keyboard.press('ArrowRight');
  const bodyOnly = panel(page).getByRole('radio', { name: 'Action · Body only' });
  await expect(bodyOnly).toBeFocused();
  await expect(bodyOnly).toHaveAttribute('aria-checked', 'true');
  await expectVisibleFocusRing(page);
  await page.keyboard.press('ArrowLeft');
  await expect(full).toHaveAttribute('aria-checked', 'true');
});

test('Show more is operable by keyboard and moves focus to the first revealed child', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Get items');
  await pasteSample(page, items(30));
  await expect(statusOf(page)).toHaveText('Parsed · 92 values');
  await treeRow(page, 'items').locator('[data-chevron]').click();
  const more = panel(page).getByRole('treeitem', { name: 'Show 10 more' });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(more).toHaveCount(0);
  await expect(treeRow(page, '[20]')).toBeFocused();
});

test('Functions groups every parsed source and inserts correctly rooted references that survive source changes', async ({ page }) => {
  await start(page);
  await panel(page).getByRole('radio', { name: 'Action · Body only' }).click();
  await nameOf(page).fill('Get customer');
  await pasteSample(page, '{"Email":"c@x.com"}');
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  // The second payload keeps the default Action / Full output root.
  await addPayload(page, 'Get manager', '{"Email":"m@x.com"}');
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');

  await openScreen(page, 'Functions');
  await expect(parsedValue(page)).toHaveCount(0);
  await sourceToggle(page, 'Get customer').click();
  await sourceToggle(page, 'Get manager').click();
  const group = (label: string) => sourceGroup(page, label);

  const customerEmail = "body('Get_customer')?['Email']";
  const managerEmail = "outputs('Get_manager')?['Email']";
  const customerRow = group('Get customer').getByRole('button', { name: 'Email', exact: true });
  const managerRow = group('Get manager').getByRole('button', { name: 'Email', exact: true });
  // The accessible description names the source and carries its exact expression.
  await expect(customerRow).toHaveAccessibleDescription(new RegExp(`^Get customer, .*\\. ${customerEmail.replace(/[()[\]?]/g, '\\$&')}$`));
  await expect(managerRow).toHaveAccessibleDescription(new RegExp(`^Get manager, .*\\. ${managerEmail.replace(/[()[\]?]/g, '\\$&')}$`));

  const text1 = page.getByRole('textbox', { name: 'text1', exact: true });
  const text2 = page.getByRole('textbox', { name: 'text2', exact: true });
  // No argument focused since selecting the function: the first empty one receives the reference.
  await customerRow.dblclick();
  await expect(text1).toHaveValue(customerEmail);
  await expect(text1).toBeFocused();
  // Otherwise the last focused argument is replaced.
  await text2.focus();
  await managerRow.focus();
  await page.keyboard.press('Enter');
  await expect(text2).toHaveValue(managerEmail);
  await expect(text2).toBeFocused();
  await expect(text1).toHaveValue(customerEmail);

  // Rename one source and close the other: inserted text stays as it was.
  await openScreen(page, 'JSON reference');
  await payloadTabs(page).getByRole('tab', { name: 'Get customer, payload 1' }).click();
  await nameOf(page).fill('Get client');
  await page.getByRole('button', ARIA_BUTTON('Close Get manager, payload 2')).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);

  await openScreen(page, 'Functions');
  await expect(text1).toHaveValue(customerEmail);
  await expect(text2).toHaveValue(managerEmail);
  // Only the surviving source remains, with its current root.
  await expect(page.locator('[data-pv-group]')).toHaveCount(1);
  await expect(sourceToggle(page, 'Get client')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Email', exact: true }))
    .toHaveAccessibleDescription("body('Get_client')?['Email']");
});

test('Alt+Down in a Functions argument opens the first source group and picks its first reference by keyboard alone', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Get customer');
  await pasteSample(page, '{"Email":"c@x.com"}');
  await addPayload(page, 'Get manager', '{"Email":"m@x.com"}');
  await openScreen(page, 'Functions');

  const text1 = page.getByRole('textbox', { name: 'text1', exact: true });
  const text2 = page.getByRole('textbox', { name: 'text2', exact: true });
  await text1.focus();
  await page.keyboard.press('Tab');
  await expect(text2).toBeFocused();
  await expect(text2).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowDown');

  // Alt+Down opens the first source group and lands on its first reference.
  await page.keyboard.press('Alt+ArrowDown');
  await expect(sourceToggle(page, 'Get customer')).toHaveAttribute('aria-expanded', 'true');
  await expect(sourceToggle(page, 'Get manager')).toHaveAttribute('aria-expanded', 'false');
  await expect(sourceGroup(page, 'Get customer').getByRole('button', { name: 'Email', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(text2).toHaveValue("outputs('Get_customer')?['Email']");
  await expect(text1).toHaveValue('');
  await expect(text2).toBeFocused();
});

test('Functions tells an unnamed Action source apart and keeps usable sources insertable', async ({ page }) => {
  await start(page);
  await pasteSample(page, '{"Email":"a@x.com"}');
  await nameOf(page).fill('');
  await addPayload(page, 'Named', '{"Email":"n@x.com"}');
  await openScreen(page, 'Functions');
  await sourceToggle(page, 'Payload 1').click();
  await expect(page.getByText('Set an action name in JSON reference')).toBeVisible();
  await sourceToggle(page, 'Named').click();
  await sourceGroup(page, 'Named').getByRole('button', { name: 'Email', exact: true }).dblclick();
  await expect(page.getByRole('textbox', { name: 'text1', exact: true })).toHaveValue("outputs('Named')?['Email']");
});

test('native Undo restores the textarea at once without reverting the parsed tree or name; validation follows after 600ms', async ({ page }) => {
  await page.clock.install();
  await start(page);
  await pasteSample(page, '{"old":1}');
  await expect(treeRow(page, 'old')).toBeVisible();
  await expect(nameOf(page)).toHaveValue('Action');
  await nameOf(page).fill('Keep me');
  await pasteSample(page, '{"new":2}');
  await expect(treeRow(page, 'new')).toBeVisible();
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');

  const editor = editorOf(page);
  await pauseClock(page);
  await editor.press('Control+Z');
  // Immediately: the textarea is restored, but tree and name are untouched and validation is pending.
  await expect(editor).toHaveValue('{"old":1}');
  await expect(treeRow(page, 'new')).toBeVisible();
  await expect(treeRow(page, 'old')).toHaveCount(0);
  await expect(nameOf(page)).toHaveValue('Keep me');
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await expect(payloadTabs(page).getByRole('tab', { name: 'Keep me, payload 1' })).toBeVisible();

  // Nothing validates before 600ms ...
  await page.clock.runFor(599);
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await expect(treeRow(page, 'new')).toBeVisible();
  // ... and at 600ms the ordinary automatic result applies.
  await page.clock.runFor(1);
  await expect(treeRow(page, 'old')).toBeVisible();
  await expect(treeRow(page, 'new')).toHaveCount(0);
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await expect(nameOf(page)).toHaveValue('Keep me');
  expect((await toasts(page)).filter((text) => text.startsWith('Payload updated'))).toEqual(['Payload updated · 2 values']);

  await editor.press('Control+Y');
  await expect(editor).toHaveValue('{"new":2}');
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await page.clock.runFor(600);
  await expect(treeRow(page, 'new')).toBeVisible();
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
});

test('every valid paste, including a repeated identical one, requests exactly one notice and revisits replay none', async ({ page }) => {
  await start(page);
  await pasteSample(page, '{"same":1}');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values']);
  await pasteSample(page, '{"same":1}');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values', 'Parsed · 2 values']);

  await newPayload(page).click();
  await payloadTabs(page).getByRole('tab', { name: 'Action, payload 1' }).click();
  await openScreen(page, 'Functions');
  await openScreen(page, 'Trigger / Filter');
  await openScreen(page, 'JSON reference');
  await page.waitForTimeout(800);
  expect(await toasts(page)).toEqual(['Parsed · 2 values', 'Parsed · 2 values']);
});

test('automatic edits keep prior output on invalid text; invalid paste clears it; semantic equality requests no notice', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Get items');
  await pasteSample(page, '{"a":1}');
  await expect(treeRow(page, 'a')).toBeVisible();
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values']);

  // Invalid automatic edit: previous output and references survive, with retained-output feedback.
  const editor = editorOf(page);
  await editor.fill('{"a":');
  await expect(statusOf(page)).toHaveText('Could not parse. Showing last successful payload.');
  await expect(panel(page).getByRole('alert')).toBeVisible();
  await expect(treeRow(page, 'a')).toBeVisible();
  await treeRow(page, 'a').click();
  await expect(panel(page).getByLabel('Reference expression')).toHaveText("outputs('Get_items')?['a']");
  await expect(payloadTabs(page).getByRole('tab', { name: 'Get items, payload 1' })).toHaveAccessibleDescription(/Could not parse/);

  // Semantically identical correction clears the error without a success notice.
  await editor.fill('{ "a" : 1.0 }');
  await expect(panel(page).getByRole('alert')).toHaveCount(0);
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await expect(treeRow(page, 'a')).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(700);
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);

  // Invalid paste clears the tree, selection and reference at once.
  await pasteSample(page, '{"a": 1,}');
  await expect(panel(page).getByRole('alert')).toBeVisible();
  await expect(panel(page).getByRole('tree')).toHaveCount(0);
  await expect(panel(page).getByText('No sample yet')).toBeVisible();
  await expect(panel(page).getByLabel('Reference expression')).toHaveCount(0);
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);
});

test('notices and baselines belong to their own payload', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('First');
  await editorOf(page).fill('{"x":1}');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values']);
  await addPayload(page, 'Second');
  await editorOf(page).fill('{"x":1}');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values', 'Parsed · 2 values']);

  // A material change in the second payload only produces one update notice for it.
  await editorOf(page).fill('{"x":2,"y":3}');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values', 'Parsed · 2 values', 'Payload updated · 3 values']);
  await payloadTabs(page).getByRole('tab', { name: 'First, payload 1' }).click();
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await expect(editorOf(page)).toHaveValue('{"x":1}');
  await page.waitForTimeout(800);
  expect(await toasts(page)).toHaveLength(3);
});

test('pending automatic validation is cancelled by tab change, screen change and close, then restarts when the payload returns', async ({ page }) => {
  await page.clock.install();
  await start(page);
  await nameOf(page).fill('One');
  await editorOf(page).fill('{"base":1}');
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await addPayload(page, 'Two');
  await payloadTabs(page).getByRole('tab', { name: 'One, payload 1' }).click();
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);
  await pauseClock(page);

  // Tab change: the edited payload is not parsed while inactive, nor is another payload changed.
  await editorOf(page).fill('{"tab":1}');
  await payloadTabs(page).getByRole('tab', { name: 'Two, payload 2' }).click();
  await page.clock.runFor(900);
  await expect(editorOf(page)).toHaveValue('');
  await expect(statusOf(page)).toHaveText('Nothing parsed yet');
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);
  // Returning starts a fresh 600ms delay.
  await payloadTabs(page).getByRole('tab', { name: 'One, payload 1' }).click();
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await page.clock.runFor(599);
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await expect(treeRow(page, 'base')).toBeVisible();
  await page.clock.runFor(1);
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await expect(treeRow(page, 'tab')).toBeVisible();
  expect(await toasts(page)).toEqual(['Parsed · 2 values', 'Payload updated · 2 values']);

  // Screen change: same cancellation, fresh delay on return.
  await editorOf(page).fill('{"screen":1}');
  await openScreen(page, 'Functions');
  await page.clock.runFor(900);
  await openScreen(page, 'JSON reference');
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await page.clock.runFor(599);
  await expect(statusOf(page)).toHaveText('Sample changed. Waiting for valid JSON.');
  await expect(treeRow(page, 'tab')).toBeVisible();
  await page.clock.runFor(1);
  await expect(statusOf(page)).toHaveText('Parsed · 2 values');
  await expect(treeRow(page, 'screen')).toBeVisible();
  expect(await toasts(page)).toEqual(['Parsed · 2 values', 'Payload updated · 2 values', 'Payload updated · 2 values']);

  // Close: the pending parse cannot touch the surviving payload.
  await editorOf(page).fill('{"closing":1}');
  await page.getByRole('button', ARIA_BUTTON('Close One, payload 1')).click();
  await page.clock.runFor(900);
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expect(payloadTabs(page).getByRole('tab', { name: 'Two, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(editorOf(page)).toHaveValue('');
  await expect(statusOf(page)).toHaveText('Nothing parsed yet');
  expect(await toasts(page)).toEqual(['Parsed · 2 values', 'Payload updated · 2 values', 'Payload updated · 2 values']);
});

test('each payload restores its own root, text, expanded nodes, revealed children, selection and loop name (AC-1.4)', async ({ page }) => {
  const first = emails('cust.example', 25);
  const second = JSON.stringify({ headers: { a: 1 }, body: { customer: { name: 'Contoso' } } });
  await start(page);

  await chooseRoot(page, 'Action · Body only');
  await nameOf(page).fill('Get customer');
  await pasteSample(page, first);
  await expect(statusOf(page)).toHaveText('Parsed · 52 values');
  await treeRow(page, 'value').locator('[data-chevron]').click();
  await panel(page).getByRole('treeitem', { name: 'Show 5 more' }).click();
  await treeRow(page, '[22]').locator('[data-chevron]').click();
  await treeRow(page, 'Email').click();
  await panel(page).getByLabel('Loop name').fill('Each customer');

  await newPayload(page).click();
  await expect(editorOf(page)).toHaveValue('');
  await expect(panel(page).getByRole('radio', { name: 'Action · Full output' })).toHaveAttribute('aria-checked', 'true');
  await chooseRoot(page, 'Trigger · Full output');
  await pasteSample(page, second);
  await expect(statusOf(page)).toHaveText('Parsed · 6 values');
  await treeRow(page, 'body').locator('[data-chevron]').click();
  await treeRow(page, 'customer').click();

  await tabAt(page, 1).click();
  await expect(panel(page).getByRole('radio', { name: 'Action · Body only' })).toHaveAttribute('aria-checked', 'true');
  await expect(nameOf(page)).toHaveValue('Get customer');
  await expect(editorOf(page)).toHaveValue(first);
  await expect(statusOf(page)).toHaveText('Parsed · 52 values');
  // The revealed children and the expanded item survive; nothing is collapsed or re-paged.
  await expect(panel(page).getByRole('treeitem', { name: /^Show \d+ more/ })).toHaveCount(0);
  await expect(treeRow(page, '[22]')).toHaveAttribute('aria-expanded', 'true');
  await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page).getByLabel('Loop name')).toHaveValue('Each customer');
  await expect(referenceOf(page)).toHaveText("body('Get_customer')?['value'][22]?['Email']");

  await tabAt(page, 2).click();
  await expect(panel(page).getByRole('radio', { name: 'Trigger · Full output' })).toHaveAttribute('aria-checked', 'true');
  await expect(editorOf(page)).toHaveValue(second);
  await expect(statusOf(page)).toHaveText('Parsed · 6 values');
  await expect(treeRow(page, 'body')).toHaveAttribute('aria-expanded', 'true');
  await expect(treeRow(page, 'customer')).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page).getByLabel('Loop name')).toHaveCount(0);
  await expect(referenceOf(page)).toHaveText("triggerOutputs()?['body']?['customer']");
});

test('closing an inactive payload keeps the active one and its selection (AC-1.5)', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Alpha');
  await pasteSample(page, '{"a":1}');
  await addPayload(page, 'Bravo', '{"b":1}');
  await addPayload(page, 'Charlie', '{"c":{"y":2}}');
  await treeRow(page, 'c').locator('[data-chevron]').click();
  await treeRow(page, 'y').click();
  const charlieReference = "outputs('Charlie')?['c']?['y']";
  await expect(referenceOf(page)).toHaveText(charlieReference);

  // An inactive tab before the active one: positions shift, the active payload does not.
  await page.getByRole('button', ARIA_BUTTON('Close Alpha, payload 1')).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(2);
  await expect(payloadTabs(page).getByRole('tab', { name: 'Charlie, payload 2' })).toHaveAttribute('aria-selected', 'true');
  await expect(payloadTabs(page).getByRole('tab', { name: 'Bravo, payload 1' })).toHaveAttribute('aria-selected', 'false');
  await expect(nameOf(page)).toHaveValue('Charlie');
  await expect(editorOf(page)).toHaveValue('{"c":{"y":2}}');
  await expect(treeRow(page, 'y')).toHaveAttribute('aria-selected', 'true');
  await expect(referenceOf(page)).toHaveText(charlieReference);

  // An inactive last tab: the active payload before it is unchanged.
  await tabAt(page, 1).click();
  await expect(editorOf(page)).toHaveValue('{"b":1}');
  await page.getByRole('button', ARIA_BUTTON('Close Charlie, payload 2')).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expect(payloadTabs(page).getByRole('tab', { name: 'Bravo, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(nameOf(page)).toHaveValue('Bravo');
  await expect(editorOf(page)).toHaveValue('{"b":1}');
});

test('equal action names and repeated Trigger roots stay distinguishable by position, and edits stay local (AC-1.7)', async ({ page }) => {
  await start(page);
  await nameOf(page).fill('Same');
  await pasteSample(page, '{"one":1}');
  await addPayload(page, 'Same', '{"two":2}');
  await expect(tabAt(page, 1)).toHaveAccessibleName('Same, payload 1');
  await expect(tabAt(page, 2)).toHaveAccessibleName('Same, payload 2');

  // Editing the active payload leaves its namesake alone; activating each shows its own text.
  await nameOf(page).fill('Other');
  await expect(tabAt(page, 1)).toHaveAccessibleName('Same, payload 1');
  await expect(tabAt(page, 2)).toHaveAccessibleName('Other, payload 2');
  await nameOf(page).fill('Same');
  await tabAt(page, 1).click();
  await expect(editorOf(page)).toHaveValue('{"one":1}');
  await tabAt(page, 2).click();
  await expect(editorOf(page)).toHaveValue('{"two":2}');

  // Trigger payloads are numbered in their current tab order.
  for (let count = 3; count <= 4; count++) {
    await newPayload(page).click();
    await chooseRoot(page, 'Trigger · Full output');
  }
  await expect(tabAt(page, 3)).toHaveAccessibleName('Trigger, payload 3');
  await expect(tabAt(page, 4)).toHaveAccessibleName('Trigger 2, payload 4');

  // Closing the first Trigger renumbers the second; the others are untouched.
  await page.getByRole('button', ARIA_BUTTON('Close Trigger, payload 3')).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(3);
  await expect(tabAt(page, 3)).toHaveAccessibleName('Trigger, payload 3');
  await expect(tabAt(page, 3)).toHaveAttribute('aria-selected', 'true');
  await expect(tabAt(page, 1)).toHaveAccessibleName('Same, payload 1');
  await expect(tabAt(page, 2)).toHaveAccessibleName('Same, payload 2');

  // Closing one of the two equal names removes only that payload.
  await page.getByRole('button', ARIA_BUTTON('Close Same, payload 1')).click();
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(2);
  await expect(tabAt(page, 1)).toHaveAccessibleName('Same, payload 1');
  await tabAt(page, 1).click();
  await expect(editorOf(page)).toHaveValue('{"two":2}');
});

test('search matches labels and values case-insensitively, including a value past its shortened preview (AC-2.1, AC-2.2)', async ({ page }) => {
  const suffix = 'TAILSUFFIX';
  await start(page);
  await nameOf(page).fill('Get customer');
  await pasteSample(page, JSON.stringify({ Email: 'a@contoso.example', note: `${'n'.repeat(120)}${suffix}` }));
  await addPayload(page, 'Get manager', JSON.stringify({ Email: 'm@contoso.example', bio: 'Write to EMAIL first' }));
  const search = page.getByRole('combobox', { name: 'Search all payloads' });
  const options = page.getByRole('option');

  await search.fill('email');
  await expect(options).toHaveCount(3);
  await expect(page.locator('.eb-payload-search-popup').getByRole('status')).toHaveText('3 matches · 2 parsed payloads');
  await expect(options.nth(0)).toContainText('Get customer');
  await expect(options.nth(0)).toContainText('Email');
  await expect(options.nth(0)).toContainText('"a@contoso.example"');
  await expect(options.nth(1)).toContainText('Get manager');
  await expect(options.nth(2)).toContainText('Get manager');
  await expect(options.nth(2)).toContainText('bio');

  await search.fill(suffix.toLowerCase());
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText('note');
  await expect(options.first()).not.toContainText(suffix);
  await search.press('Enter');
  await expect(tabAt(page, 1)).toHaveAttribute('aria-selected', 'true');
  await expect(treeRow(page, 'note')).toHaveAttribute('aria-selected', 'true');
  await expect(referenceOf(page)).toHaveText("outputs('Get_customer')?['note']");
});

test('search covers displayed data only: it skips unparsed text, keeps retained output and reveals an unnamed source without enabling copy (AC-2.7)', async ({ page }) => {
  await page.clock.install();
  await start(page);
  const search = page.getByRole('combobox', { name: 'Search all payloads' });
  const options = page.getByRole('option');
  const heading = page.locator('.eb-payload-search-popup').getByRole('status');

  await nameOf(page).fill('Retained');
  await pasteSample(page, '{"Email":"kept@contoso.example"}');
  await addPayload(page, 'Draft only');
  await addPayload(page, 'Unnamed', '{"Email":"u@contoso.example"}');
  await nameOf(page).fill('');
  await expect(tabAt(page, 3)).toHaveAccessibleName('Payload 3, payload 3');
  await pauseClock(page);

  // Payload 2 never parsed; payload 1 keeps its earlier payload after an invalid automatic edit.
  await tabAt(page, 2).click();
  await editorOf(page).fill('{"Hidden":');
  await page.clock.runFor(600);
  await expect(statusOf(page)).toHaveText('Could not parse');
  await tabAt(page, 1).click();
  await editorOf(page).fill('{"Email":');
  await page.clock.runFor(600);
  await expect(statusOf(page)).toHaveText('Could not parse. Showing last successful payload.');

  await search.fill('hidden');
  await expect(page.getByText('No matches in parsed payloads.')).toBeVisible();
  await expect(heading).toHaveText('0 matches · 2 parsed payloads');

  await search.fill('contoso');
  await expect(options).toHaveCount(2);
  await expect(heading).toHaveText('2 matches · 2 parsed payloads');
  await expect(options.nth(0)).toContainText('Retained');
  await expect(options.nth(1)).toContainText('Payload 3');

  await search.press('Enter');
  await expect(tabAt(page, 1)).toHaveAttribute('aria-selected', 'true');
  await expect(treeRow(page, 'Email')).toBeFocused();
  await expect(referenceOf(page)).toHaveText("outputs('Retained')?['Email']");

  await search.fill('contoso');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(tabAt(page, 3)).toHaveAttribute('aria-selected', 'true');
  await expect(treeRow(page, 'Email')).toBeFocused();
  await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
  await expect(referenceOf(page)).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Copy', exact: true })).toHaveCount(0);
});

test('Parsed Value says where to parse when nothing is parsed and gives one parsed source its own group (AC-3.1)', async ({ page }) => {
  await start(page);
  await openScreen(page, 'Functions');
  await parsedValue(page).click();
  await expect(page.getByText('Parse a sample in JSON reference')).toBeVisible();
  await parsedValue(page).click();

  await openScreen(page, 'JSON reference');
  await nameOf(page).fill('Get customer');
  await pasteSample(page, '{"Email":"c@x.com","items":[{"Email":"i@x.com"}]}');
  await addPayload(page, 'Draft only');
  await openScreen(page, 'Functions');
  // An empty second payload is not a source: only the parsed one gets a group.
  await expect(parsedValue(page)).toHaveCount(0);
  await expect(page.locator('[data-pv-group]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Get customer 2', exact: true }).click();
  await expect(page.getByText('Parse a sample in JSON reference')).toHaveCount(0);
  await expect(page.locator('.eb-pv-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Email', exact: true }))
    .toHaveAccessibleDescription("outputs('Get_customer')?['Email']");
});

test('Functions keeps to 200 rows across sources in tab order, and filtering precedes the shared cap (AC-3.5)', async ({ page }) => {
  const keys = (prefix: string, count: number) => JSON.stringify(
    Object.fromEntries(Array.from({ length: count }, (_, index) => [`${prefix}${index}`, index])),
  );
  await start(page);
  await nameOf(page).fill('Alpha');
  await pasteSample(page, keys('alpha', 150));
  await addPayload(page, 'Beta', keys('beta', 100));

  await openScreen(page, 'Functions');
  await page.getByRole('button', { name: 'Alpha 150', exact: true }).click();
  await page.getByRole('button', { name: 'Beta 100', exact: true }).click();
  await expect(page.locator('.eb-pv-row')).toHaveCount(200);
  await expect(sourceGroup(page, 'Alpha').locator('.eb-pv-row')).toHaveCount(150);
  await expect(sourceGroup(page, 'Beta').locator('.eb-pv-row')).toHaveCount(50);
  await expect(page.getByText('+50 more — narrow with search')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search functions' }).fill('beta99');
  await expect(page.getByRole('button', { name: 'Beta 1', exact: true })).toBeVisible();
  await expect(page.locator('.eb-pv-row')).toHaveText(['beta99']);
  await expect(page.getByText(/more — narrow with search/)).toHaveCount(0);
});

test('array items start collapsed in every source and open independently (AC-3.6)', async ({ page }) => {
  const sample = JSON.stringify({ items: [{ Email: 'i0@x.com' }] });
  await start(page);
  await nameOf(page).fill('Get customer');
  await pasteSample(page, sample);
  await addPayload(page, 'Get manager', sample);
  await openScreen(page, 'Functions');
  await sourceToggle(page, 'Get customer').click();
  await sourceToggle(page, 'Get manager').click();

  const arrayItems = page.locator('details.eb-pv-item');
  await expect(arrayItems).toHaveCount(2);
  for (const item of await arrayItems.all()) await expect(item).not.toHaveJSProperty('open', true);
  await arrayItems.first().locator('summary').click();
  await expect(arrayItems.first()).toHaveJSProperty('open', true);
  await expect(arrayItems.last()).not.toHaveJSProperty('open', true);
});

test('conditions, Functions arguments and payloads survive all three screens and a reload starts empty (AC-1.8)', async ({ page }) => {
  await page.clock.install();
  await start(page);
  const generated = page.locator('[aria-label="Generated expression"]:visible');
  const args = page.locator('input[data-arg]');
  const group = (label: string) => sourceGroup(page, label);

  /** Export copies the condition document; a sentinel proves the read is this export's. */
  async function exportCondition(): Promise<string> {
    await writeClipboard(page, 'pending-export');
    await page.getByRole('button', { name: 'Export' }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe('pending-export');
    return page.evaluate(() => navigator.clipboard.readText());
  }

  await chooseRoot(page, 'Action · Body only');
  await nameOf(page).fill('Get customer');
  await pasteSample(page, '{"Email":"c@x.example"}');
  await newPayload(page).click();
  await chooseRoot(page, 'Action · Body only');
  await nameOf(page).fill('Get manager');
  await pasteSample(page, '{"Email":"m@x.example"}');

  await openScreen(page, 'Trigger / Filter');
  await page.getByRole('button', { name: 'Load sample fields' }).first().click();
  const addRule = page.getByRole('button', { name: 'Add rule to group root' });
  await addRule.click();
  await addRule.click();
  const conditionExpression = await generated.textContent();
  const conditionExport = await exportCondition();
  expect(conditionExport).not.toBe('');

  await openScreen(page, 'Functions');
  for (const [index, label] of ['Get customer', 'Get manager'].entries()) {
    await sourceToggle(page, label).click();
    await args.nth(index).click();
    await group(label).getByRole('button', { name: 'Email', exact: true }).dblclick();
  }
  const argValues = ["body('Get_customer')?['Email']", "body('Get_manager')?['Email']"];
  await expect(args.nth(0)).toHaveValue(argValues[0]);
  await expect(args.nth(1)).toHaveValue(argValues[1]);
  const functionsExpression = await generated.textContent();
  const payloadNotices = async () => (await toasts(page)).filter((text) => /^(Parsed|Payload updated)/.test(text));
  const noticesBefore = await payloadNotices();

  await pauseClock(page);
  for (const screen of ['JSON reference', 'Trigger / Filter', 'Functions'] as const) {
    await openScreen(page, screen);
    if (screen === 'Trigger / Filter') {
      await expect(generated).toHaveText(conditionExpression ?? '');
      expect(await exportCondition()).toBe(conditionExport);
    } else if (screen === 'Functions') {
      await expect(args.nth(0)).toHaveValue(argValues[0]);
      await expect(args.nth(1)).toHaveValue(argValues[1]);
      await expect(generated).toHaveText(functionsExpression ?? '');
    } else {
      await expect(tabAt(page, 2)).toHaveAttribute('aria-selected', 'true');
      await expect(editorOf(page)).toHaveValue('{"Email":"m@x.example"}');
      await tabAt(page, 1).click();
      await expect(editorOf(page)).toHaveValue('{"Email":"c@x.example"}');
      await tabAt(page, 2).click();
    }
  }
  // Past the 600ms validation window, navigation has re-parsed and re-announced nothing.
  await page.clock.runFor(1000);
  expect(await payloadNotices()).toEqual(noticesBefore);

  await page.clock.resume();
  await page.reload();
  await openScreen(page, 'JSON reference');
  await expect(payloadTabs(page).getByRole('tab')).toHaveCount(1);
  await expect(tabAt(page, 1)).toHaveAccessibleName('Payload 1, payload 1');
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(editorOf(page)).toHaveValue('');
  await expect(nameOf(page)).toHaveValue('');
  await expect(panel(page).getByRole('radio', { name: 'Action · Full output' })).toHaveAttribute('aria-checked', 'true');
  await expect(panel(page).getByRole('tree')).toHaveCount(0);
});

test('at 375x667 a long-named second tab keeps its Close button inside the strip once scrolled into view (AC-5.4)', async ({ page }) => {
  const longName = 'Get customer account details from the Dataverse list rows action';
  await start(page, { width: 375, height: 667 });
  await nameOf(page).fill('Short');
  await addPayload(page, longName);
  const strip = page.locator('.eb-payload-strip');
  const tabs = page.locator('.eb-payload-tabs');
  const second = payloadTabs(page).getByRole('tab', { name: `${longName}, payload 2`, exact: true });
  const close = page.getByRole('button', ARIA_BUTTON(`Close ${longName}, payload 2`));

  // The strip scrolls inside .eb-payload-tabs, which clips there: the tab and its Close must fit that box, not merely the strip.
  async function expectTabAndCloseInside(): Promise<void> {
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(async () => {
      await expectInside(second, tabs);
      await expectInside(close, tabs);
      await expectInside(close, strip);
    }).toPass({ timeout: 5_000 });
  }

  await second.focus();
  for (const keys of [['Home', 'ArrowRight'], ['Home', 'End'], ['ArrowLeft', 'ArrowLeft']]) {
    for (const key of keys) await page.keyboard.press(key);
    await expectTabAndCloseInside();
  }
});
