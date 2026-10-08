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
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name, exact: true }).click();
}

const panel = (page: Page) => page.getByRole('tabpanel');
const editorOf = (page: Page) =>
  panel(page).getByRole('textbox', { name: 'Sample JSON', exact: true });
const nameOf = (page: Page) => panel(page).getByLabel('Action name');
const statusOf = (page: Page) => panel(page).locator('.eb-json-payload > .eb-json-help');
const newPayload = (page: Page) => page.getByRole('button', ARIA_BUTTON('New payload'));
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
  await page.getByRole('tab', {
    name: /^Action, payload 1$/,
  }).click();
  await expect(editor).toHaveValue('{"new":2}');
});

test('starts with one empty payload, enforces the 1 and 5 limits and restores one empty payload on reload', async ({ page }) => {
  await start(page);

  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Payload 1, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(panel(page).getByRole('radio', { name: 'Action · Full output' })).toHaveAttribute('aria-checked', 'true');
  await expect(nameOf(page)).toHaveValue('');
  await expect(panel(page).getByLabel('Loop name')).toHaveCount(0);
  await expect(editorOf(page)).toHaveValue('');
  // The last payload offers no close action.
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);

  for (let count = 2; count <= 5; count++) await newPayload(page).click();
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByText('5 / 5')).toBeVisible();
  await expect(newPayload(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(5);

  await pasteSample(page, '{"kept":1}');
  await expect(editorOf(page)).toHaveValue('{"kept":1}');
  await page.reload();
  await openScreen(page, 'JSON reference');
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Payload 1, payload 1' })).toBeVisible();
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
    const overflow = await strip.evaluate((element) => ({
      scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
    // Overflow stays local: the page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const tabs = page.getByRole('tab');
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
  const tab = (name: string) => page.getByRole('tab', { name: new RegExp(`^${name}, payload \\d$`) });
  await tab('Charlie').focus();

  async function expectSelectedAndFocused(name: string, position: number): Promise<void> {
    await expect(tab(name)).toBeFocused();
    await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
    await expect(tab(name)).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('tab', { selected: true })).toHaveCount(1);
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
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expectSelectedAndFocused('Charlie', 2);

  // Closing the last tab falls back to its predecessor.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expectSelectedAndFocused('Alpha', 1);
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);

  // New payload by keyboard appends, activates and focuses the new tab.
  await page.keyboard.press('Tab');
  await expect(newPayload(page)).toBeFocused();
  await expectVisibleFocusRing(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab')).toHaveCount(2);
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

  await expect(page.getByRole('tab', { name: 'Get items, payload 1' })).toHaveAttribute('aria-selected', 'true');
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
  await page.getByRole('button', { name: /^Parsed Value / }).click();
  const group = (label: string) => page.locator('details.eb-pv-source')
    .filter({ has: page.locator('summary', { hasText: new RegExp(`^${label}`) }) });
  await expect(page.locator('details.eb-pv-source')).toHaveCount(2);
  await expect(page.locator('details.eb-pv-source[open]')).toHaveCount(0);
  await group('Get customer').locator('summary').click();
  await group('Get manager').locator('summary').click();
  await expect(page.locator('details.eb-pv-source[open]')).toHaveCount(2);

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
  await page.getByRole('tab', { name: 'Get customer, payload 1' }).click();
  await nameOf(page).fill('Get client');
  await page.getByRole('button', ARIA_BUTTON('Close Get manager, payload 2')).click();
  await expect(page.getByRole('tab')).toHaveCount(1);

  await openScreen(page, 'Functions');
  await expect(text1).toHaveValue(customerEmail);
  await expect(text2).toHaveValue(managerEmail);
  // Only the surviving source remains, with its current root.
  await expect(page.locator('details.eb-pv-source')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Email', exact: true }))
    .toHaveAccessibleDescription("body('Get_client')?['Email']");
});

test('Functions tells an unnamed Action source apart and keeps usable sources insertable', async ({ page }) => {
  await start(page);
  await pasteSample(page, '{"Email":"a@x.com"}');
  await nameOf(page).fill('');
  await addPayload(page, 'Named', '{"Email":"n@x.com"}');
  await openScreen(page, 'Functions');
  await page.getByRole('button', { name: /^Parsed Value / }).click();
  await expect(page.locator('details.eb-pv-source')).toHaveCount(2);
  await page.locator('details.eb-pv-source > summary').nth(0).click();
  await expect(page.getByText('Set an action name in JSON reference')).toBeVisible();
  await page.locator('details.eb-pv-source > summary').nth(1).click();
  await page.locator('details.eb-pv-source').nth(1).getByRole('button', { name: 'Email', exact: true }).dblclick();
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
  await expect(page.getByRole('tab', { name: 'Keep me, payload 1' })).toBeVisible();

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
  await page.getByRole('tab', { name: 'Action, payload 1' }).click();
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
  await expect(page.getByRole('tab', { name: 'Get items, payload 1' })).toHaveAccessibleDescription(/Could not parse/);

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
  await page.getByRole('tab', { name: 'First, payload 1' }).click();
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
  await page.getByRole('tab', { name: 'One, payload 1' }).click();
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);
  await pauseClock(page);

  // Tab change: the edited payload is not parsed while inactive, nor is another payload changed.
  await editorOf(page).fill('{"tab":1}');
  await page.getByRole('tab', { name: 'Two, payload 2' }).click();
  await page.clock.runFor(900);
  await expect(editorOf(page)).toHaveValue('');
  await expect(statusOf(page)).toHaveText('Nothing parsed yet');
  expect(await toasts(page)).toEqual(['Parsed · 2 values']);
  // Returning starts a fresh 600ms delay.
  await page.getByRole('tab', { name: 'One, payload 1' }).click();
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
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Two, payload 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(editorOf(page)).toHaveValue('');
  await expect(statusOf(page)).toHaveText('Nothing parsed yet');
  expect(await toasts(page)).toEqual(['Parsed · 2 values', 'Payload updated · 2 values', 'Payload updated · 2 values']);
});
