import { expect, test, type Page } from 'playwright/test';

test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
});

type Screen = 'Functions' | 'Trigger / Filter' | 'JSON reference';

/** Loads the web build with onboarding dismissed and every host notification recorded. */
async function start(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('eb.onboarding.seen.v1', '1');
    const log: string[] = [];
    Object.assign(window, { __toasts: log });
    // The web adapter's notify() appends a fixed-position status/alert element to <body>.
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.parentElement === document.body &&
            node.style.position === 'fixed' &&
            ['status', 'alert'].includes(node.getAttribute('role') ?? '')
          ) log.push(node.textContent ?? '');
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
}

/** Every notice the web adapter has been asked to show, in order, even after the toast is gone. */
const toasts = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts.slice());

/** Lets a just-committed notice reach the adapter before asserting it did not. */
const settle = (page: Page) => page.waitForTimeout(150);

async function openScreen(page: Page, name: Screen): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name, exact: true }).click();
}

const openJsonReference = (page: Page) => openScreen(page, 'JSON reference');

/** Leaves the 600ms window intact: the menu item's own click waits for animation to settle. */
async function openScreenPromptly(page: Page, name: Screen): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', { name, exact: true }).dispatchEvent('click');
}

const editorOf = (page: Page) =>
  page.getByRole('textbox', { name: 'Sample JSON', exact: true });
const nameOf = (page: Page) => page.getByRole('textbox', { name: 'Action name' });
const payloadStatus = (page: Page) =>
  page.getByRole('region', { name: 'Payload' }).locator('.eb-json-help');
const reference = (page: Page) =>
  page.locator('[aria-label="Reference expression"]:visible');
const tabAt = (page: Page, position: number) =>
  page.getByRole('tab', { name: new RegExp(`, payload ${position}$`) });
const newPayload = (page: Page) =>
  page.getByRole('button', { name: 'New payload', exact: true });
const addPayload = (page: Page) => newPayload(page).click();
const treeRow = (page: Page, label: string) =>
  page.getByRole('treeitem', {
    name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, `),
  });

/** Pastes through the real clipboard into the visible Sample JSON textarea. */
async function pasteSample(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  const editor = editorOf(page);
  await editor.focus();
  await editor.press('Control+V');
}

/** Ordinary typing (not a paste): the automatic-validation route. */
const typeSample = (page: Page, text: string) => editorOf(page).fill(text);

/** Waits for the active payload's automatic validation to land. */
const validated = (page: Page, text: string | RegExp) =>
  expect(payloadStatus(page)).toHaveText(text, { timeout: 3_000 });

/** One round trip, so "immediately after" is not stretched by several awaits. */
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const pane = [...document.querySelectorAll('[role="tabpanel"]')]
      .find((candidate) => !(candidate as HTMLElement).hidden)!;
    const label = [...pane.querySelectorAll('label')]
      .find((candidate) => candidate.textContent === 'Action name');
    return {
      text: pane.querySelector('textarea')!.value,
      name: (document.getElementById(label!.htmlFor) as HTMLInputElement).value,
      rows: [...pane.querySelectorAll('[role="treeitem"]')]
        .map((row) => row.getAttribute('aria-label')),
      reference: pane.querySelector('[aria-label="Reference expression"]')
        ?.textContent ?? null,
    };
  });

/** Presses a native history key and returns the first view in which the textarea shows `text`. */
async function history(page: Page, key: string, text: string) {
  await editorOf(page).press(key);
  let view = await snapshot(page);
  await expect.poll(async () => (view = await snapshot(page)).text).toBe(text);
  return view;
}

const sampleOf = (domain: string, count: number, extra: object = {}) =>
  JSON.stringify({
    ...extra,
    value: Array.from({ length: count }, (_, index) => ({
      Email: `e${index}@${domain}`,
    })),
  });

/** Names the active payload and parses a sample into it through a native paste. */
async function seed(
  page: Page,
  { name, root, sample }: { name?: string; root?: string; sample: string },
): Promise<void> {
  if (root) await page.getByRole('radio', { name: root }).click();
  if (name !== undefined) await nameOf(page).fill(name);
  await pasteSample(page, sample);
  await expect(payloadStatus(page)).toHaveText(/^Parsed · \d+ values?$/);
}

test('keeps samples independent and preserves native paste undo (AC-4.1, AC-4.2)', async ({
  page,
}) => {
  await start(page);
  await openJsonReference(page);
  const editor = editorOf(page);

  await test.step('a paste replaces the whole field, parses at once and names a blank action', async () => {
    await pasteSample(page, '{"old":1}');
    await expect(editor).toHaveValue('{"old":1}');
    await expect(nameOf(page)).toHaveValue('Action');
    await expect(treeRow(page, 'old')).toBeVisible();
    await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values']);
  });

  await test.step('a partial selection is replaced as a whole by the next paste', async () => {
    await editor.evaluate((element) =>
      (element as HTMLTextAreaElement).setSelectionRange(2, 5),
    );
    await pasteSample(page, '{"new":2}');
    await expect(editor).toHaveValue('{"new":2}');
    await expect(treeRow(page, 'new')).toBeVisible();
    await expect.poll(() => toasts(page)).toHaveLength(2);
  });

  await test.step('the selection belongs to the new tree', async () => {
    await treeRow(page, 'new').click();
    await expect(reference(page)).toHaveText("outputs('Action')?['new']");
  });

  await test.step('native Undo restores the text only; automatic validation follows 600ms later', async () => {
    await editor.focus();
    const during = await history(page, 'Control+Z', '{"old":1}');
    expect(during.name).toBe('Action');
    expect(during.rows.some((row) => row?.startsWith('new, '))).toBe(true);
    expect(during.rows.some((row) => row?.startsWith('old, '))).toBe(false);
    expect(during.reference).toBe("outputs('Action')?['new']");

    await validated(page, 'Parsed · 2 values');
    const after = await snapshot(page);
    expect(after.rows.some((row) => row?.startsWith('old, '))).toBe(true);
    expect(after.rows.some((row) => row?.startsWith('new, '))).toBe(false);
    // The selected path no longer exists, so the ordinary rules reset it.
    expect(after.reference).toBe("outputs('Action')");
    await expect.poll(() => toasts(page)).toEqual([
      'Parsed · 2 values',
      'Parsed · 2 values',
      'Payload updated · 2 values',
    ]);
  });

  await test.step('native Redo behaves the same way', async () => {
    const during = await history(page, 'Control+Y', '{"new":2}');
    expect(during.rows.some((row) => row?.startsWith('old, '))).toBe(true);
    expect(during.rows.some((row) => row?.startsWith('new, '))).toBe(false);

    await validated(page, 'Parsed · 2 values');
    await expect(treeRow(page, 'new')).toBeVisible();
    await expect(treeRow(page, 'old')).toHaveCount(0);
    await expect.poll(() => toasts(page)).toHaveLength(4);
  });

  await test.step('undoing back past the first paste keeps its action name and the retained output', async () => {
    await history(page, 'Control+Z', '{"old":1}');
    const during = await history(page, 'Control+Z', '');
    expect(during.name).toBe('Action');
    expect(during.rows.some((row) => row?.startsWith('new, '))).toBe(true);

    await expect(page.getByRole('alert')).toHaveText(/Paste a sample before parsing/, { timeout: 3_000 });
    await expect(payloadStatus(page)).toHaveText('Could not parse. Showing last successful payload.');
    await expect(treeRow(page, 'new')).toBeVisible();
    await expect(nameOf(page)).toHaveValue('Action');

    await history(page, 'Control+Y', '{"old":1}');
    await history(page, 'Control+Y', '{"new":2}');
    await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 3_000 });
    await validated(page, 'Parsed · 2 values');
    await settle(page);
    expect(await toasts(page)).toHaveLength(4);
  });

  await test.step('payload editors stay independent', async () => {
    await addPayload(page);
    await expect(editor).toHaveValue('');
    await pasteSample(page, '{"second":3}');
    await expect(treeRow(page, 'second')).toBeVisible();
    await tabAt(page, 1).click();
    await expect(editor).toHaveValue('{"new":2}');
    await expect(nameOf(page)).toHaveValue('Action');
    await tabAt(page, 2).click();
    await expect(editor).toHaveValue('{"second":3}');
  });
});

test('repeats an identical paste as one notice per paste, never replayed (AC-4.7)', async ({
  page,
}) => {
  await start(page);
  await openJsonReference(page);
  await nameOf(page).fill('Entered name');

  await pasteSample(page, '{"same":1}');
  await expect(nameOf(page)).toHaveValue('Entered name');
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 2 values']);

  await pasteSample(page, '{"same":1}');
  await expect.poll(() => toasts(page)).toEqual([
    'Parsed · 2 values',
    'Parsed · 2 values',
  ]);

  // Revisiting tabs and screens, and recreating the presentation, never replays a notice.
  await addPayload(page);
  await tabAt(page, 1).click();
  await openScreen(page, 'Functions');
  await openScreen(page, 'Trigger / Filter');
  await openJsonReference(page);
  await page.setViewportSize({ width: 600, height: 700 });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.waitForTimeout(800);
  expect(await toasts(page)).toHaveLength(2);
});

test('treats equivalent edits as non-material and real changes as material (AC-4.5, AC-4.6, AC-2.2)', async ({
  page,
}) => {
  const note = (tail: string) => `${'x'.repeat(150)}${tail}`;
  const original = `{"b":1,"a":[1,2],"note":"${note('END1')}"}`;
  await start(page);
  await openJsonReference(page);
  await pasteSample(page, original);
  await expect.poll(() => toasts(page)).toEqual(['Parsed · 6 values']);
  const total = 'Parsed · 6 values';

  await test.step('a preview is shortened but the full value is what is compared', async () => {
    const preview = await treeRow(page, 'note').textContent();
    expect(preview).not.toContain('END1');
  });

  await test.step('whitespace, key order and numeric spelling refresh feedback without a notice', async () => {
    await treeRow(page, 'a').locator('[data-chevron]').click();
    await treeRow(page, 'a').click();
    await expect(treeRow(page, 'a')).toHaveAttribute('aria-selected', 'true');

    await typeSample(page, `{ "note": "${note('END1')}",\n "a": [1, 2], "b": 1.0 }`);
    await expect(payloadStatus(page)).toHaveText(
      'Sample changed. Waiting for valid JSON.',
    );
    await validated(page, total);
    await settle(page);
    expect(await toasts(page)).toHaveLength(1);
    await expect(treeRow(page, 'a')).toHaveAttribute('aria-selected', 'true');
    await expect(treeRow(page, 'a')).toHaveAttribute('aria-expanded', 'true');
    await expect(treeRow(page, '[1]')).toBeVisible();
  });

  const material = [
    ['array order', `{"note":"${note('END1')}","a":[2,1],"b":1}`],
    ['a value beyond the preview', `{"note":"${note('END2')}","a":[2,1],"b":1}`],
    ['a value type', `{"note":"${note('END2')}","a":[2,1],"b":"1"}`],
    ['a key', `{"note":"${note('END2')}","a":[2,1],"c":"1"}`],
  ] as const;
  for (const [index, [what, text]] of material.entries()) {
    await test.step(`${what} is a material change`, async () => {
      await typeSample(page, text);
      await expect.poll(() => toasts(page), { timeout: 3_000 }).toHaveLength(index + 2);
      expect((await toasts(page)).at(-1)).toBe('Payload updated · 6 values');
      await validated(page, total);
    });
  }

  await test.step('a new tab reports its first automatic parse, singular counts included', async () => {
    await addPayload(page);
    await typeSample(page, '7');
    await expect.poll(() => toasts(page), { timeout: 3_000 }).toHaveLength(6);
    expect((await toasts(page)).at(-1)).toBe('Parsed · 1 value');
  });
});

test('keeps output for invalid automatic edits and clears it for an invalid paste (AC-4.8, AC-4.9)', async ({
  page,
}) => {
  const original = '{"keep":1,"list":[1,2]}';
  await start(page);
  await openJsonReference(page);
  await pasteSample(page, original);
  await treeRow(page, 'keep').click();
  await expect.poll(() => toasts(page)).toHaveLength(1);

  const retained = async (error: RegExp) => {
    await expect(page.getByRole('alert')).toHaveText(error, { timeout: 3_000 });
    await expect(payloadStatus(page)).toHaveText(
      'Could not parse. Showing last successful payload.',
    );
    await expect(treeRow(page, 'keep')).toHaveAttribute('aria-selected', 'true');
    await expect(reference(page)).toHaveText("outputs('Action')?['keep']");
    await settle(page);
    expect(await toasts(page)).toHaveLength(1);
  };

  await test.step('invalid text keeps the last successful tree and references', async () => {
    await typeSample(page, '{"keep":');
    await retained(/^Not valid JSON/);
  });
  await test.step('empty text keeps them too', async () => {
    await typeSample(page, '');
    await retained(/Paste a sample before parsing/);
  });
  await test.step('over-limit text keeps them too', async () => {
    await typeSample(page, `[${'0,'.repeat(10_000)}0]`);
    await retained(/more than 10,000 values/);
  });
  await test.step('correcting to semantically identical data clears the error without a notice', async () => {
    await typeSample(page, '{ "list": [1, 2], "keep": 1 }');
    await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 3_000 });
    await validated(page, 'Parsed · 5 values');
    await settle(page);
    expect(await toasts(page)).toHaveLength(1);
  });

  await test.step('an invalid paste clears the tree and selection and shows the error', async () => {
    await pasteSample(page, '{"broken":');
    await expect(page.getByRole('alert')).toHaveText(/^Not valid JSON/);
    await expect(page.getByRole('tree')).toHaveCount(0);
    await expect(payloadStatus(page)).toHaveText('Could not parse');
    await expect(reference(page)).toHaveCount(0);
    await settle(page);
    expect(await toasts(page)).toHaveLength(1);
  });

  await test.step('the semantic baseline survives: equal data is not material, changed data is', async () => {
    await typeSample(page, '{"list":[1,2],"keep":1}');
    await validated(page, 'Parsed · 5 values');
    await expect(treeRow(page, 'keep')).toBeVisible();
    await settle(page);
    expect(await toasts(page)).toHaveLength(1);

    await pasteSample(page, '{"broken":');
    await expect(page.getByRole('tree')).toHaveCount(0);
    await typeSample(page, '{"list":[1,2,3],"keep":1}');
    await expect.poll(() => toasts(page), { timeout: 3_000 }).toHaveLength(2);
    expect((await toasts(page)).at(-1)).toBe('Payload updated · 6 values');
  });
});

test('cancels a pending validation on tab, screen and close changes (AC-4.3, AC-4.4)', async ({
  page,
}) => {
  await start(page);
  await openJsonReference(page);
  await pasteSample(page, '{"a":1}');
  await addPayload(page);
  await pasteSample(page, '{"b":1}');
  await tabAt(page, 1).click();
  await expect.poll(() => toasts(page)).toHaveLength(2);

  /** Returning to the pending payload starts a fresh 600ms delay, then only it is validated. */
  const resumes = async (text: string) => {
    await expect(editorOf(page)).toHaveValue(text);
    await expect(payloadStatus(page)).toHaveText(
      'Sample changed. Waiting for valid JSON.',
    );
    const returned = Date.now();
    await validated(page, 'Parsed · 2 values');
    expect(Date.now() - returned).toBeGreaterThan(450);
  };

  await test.step('switching tabs before the delay parses nothing', async () => {
    await typeSample(page, '{"a":2}');
    await tabAt(page, 2).click();
    await page.waitForTimeout(1_000);
    await expect(editorOf(page)).toHaveValue('{"b":1}');
    expect(await toasts(page)).toHaveLength(2);
    const returned = Date.now();
    await tabAt(page, 1).click();
    await expect(payloadStatus(page)).toHaveText(
      'Sample changed. Waiting for valid JSON.',
    );
    await expect(editorOf(page)).toHaveValue('{"a":2}');
    await validated(page, 'Parsed · 2 values');
    expect(Date.now() - returned).toBeGreaterThan(450);
    await expect.poll(() => toasts(page)).toHaveLength(3);
    await tabAt(page, 2).click();
    await expect(editorOf(page)).toHaveValue('{"b":1}');
    await expect(treeRow(page, 'b')).toBeVisible();
  });

  await test.step('switching screens before the delay parses nothing', async () => {
    await tabAt(page, 1).click();
    await typeSample(page, '{"a":3}');
    await openScreenPromptly(page, 'Functions');
    await page.waitForTimeout(1_000);
    expect(await toasts(page)).toHaveLength(3);
    await openJsonReference(page);
    await resumes('{"a":3}');
    await expect.poll(() => toasts(page)).toHaveLength(4);
  });

  await test.step('closing a pending payload cannot parse another', async () => {
    await tabAt(page, 2).click();
    await typeSample(page, '{"b":2}');
    await page.getByRole('button', { name: /^Close .*, payload 2$/ }).click();
    await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(1);
    await expect(editorOf(page)).toHaveValue('{"a":3}');
    await page.waitForTimeout(1_000);
    expect(await toasts(page)).toHaveLength(4);
    await expect(treeRow(page, 'a')).toBeVisible();
  });

  await test.step('a completed paste cancels the pending edit without a duplicate notice', async () => {
    await typeSample(page, '{"a":4}');
    await pasteSample(page, '{"a":5}');
    await expect.poll(() => toasts(page)).toHaveLength(5);
    await expect(payloadStatus(page)).toHaveText('Parsed · 2 values');
    await page.waitForTimeout(900);
    expect(await toasts(page)).toEqual([
      'Parsed · 2 values',
      'Parsed · 2 values',
      'Payload updated · 2 values',
      'Payload updated · 2 values',
      'Parsed · 2 values',
    ]);
    await expect(editorOf(page)).toHaveValue('{"a":5}');
  });
});

test('gives each tab its own notices when samples are identical (AC-4.10)', async ({
  page,
}) => {
  const sample = '{"same":[1,2]}';
  await start(page);
  await openJsonReference(page);

  await typeSample(page, sample);
  await expect.poll(() => toasts(page), { timeout: 3_000 }).toEqual(['Parsed · 4 values']);
  await addPayload(page);
  await typeSample(page, sample);
  await expect.poll(() => toasts(page), { timeout: 3_000 }).toEqual([
    'Parsed · 4 values',
    'Parsed · 4 values',
  ]);

  await typeSample(page, '{"same":[1,3]}');
  await expect.poll(() => toasts(page), { timeout: 3_000 }).toHaveLength(3);
  expect((await toasts(page)).at(-1)).toBe('Payload updated · 4 values');

  // The first tab's baseline is untouched: its identical re-edit is still non-material.
  await tabAt(page, 1).click();
  await typeSample(page, '{ "same": [1, 2] }');
  await validated(page, 'Parsed · 4 values');
  await settle(page);
  expect(await toasts(page)).toHaveLength(3);
});

test('restores each payload exactly, enforces the limit and closes predictably (AC-1.1 to AC-1.7)', async ({
  page,
}) => {
  const first = sampleOf('cust.example', 25);
  const second = JSON.stringify({ headers: { a: 1 }, body: { customer: { name: 'Contoso' } } });
  await start(page);
  await openJsonReference(page);

  await test.step('a fresh session has one empty Action / Full output payload (AC-1.1)', async () => {
    await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(1);
    await expect(tabAt(page, 1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('radio', { name: 'Action · Full output' })).toBeChecked();
    await expect(nameOf(page)).toHaveValue('');
    await expect(editorOf(page)).toHaveValue('');
    await expect(page.getByRole('tree')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);
  });

  await test.step('payload 1 keeps its own root, name, tree state and loop name (AC-1.4)', async () => {
    await seed(page, { name: 'Get customer', root: 'Action · Body only', sample: first });
    await treeRow(page, 'value').locator('[data-chevron]').click();
    await page.getByRole('treeitem', { name: 'Show 5 more' }).click();
    await treeRow(page, '[22]').locator('[data-chevron]').click();
    await treeRow(page, 'Email').click();
    await page.getByRole('textbox', { name: 'Loop name' }).fill('Each customer');
  });

  await test.step('New payload appends an empty active payload and leaves the first alone (AC-1.2)', async () => {
    await addPayload(page);
    await expect(tabAt(page, 2)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('2 / 5')).toBeVisible();
    await expect(editorOf(page)).toHaveValue('');
    await expect(page.getByRole('radio', { name: 'Action · Full output' })).toBeChecked();
    await seed(page, { root: 'Trigger · Full output', sample: second });
    await treeRow(page, 'body').locator('[data-chevron]').click();
    await treeRow(page, 'customer').click();
  });

  await test.step('switching back and forth restores each payload (AC-1.4, AC-1.7)', async () => {
    await expect(tabAt(page, 1)).toHaveAccessibleName('Get customer, payload 1');
    await expect(tabAt(page, 2)).toHaveAccessibleName('Trigger, payload 2');
    await tabAt(page, 1).click();
    await expect(page.getByRole('radio', { name: 'Action · Body only' })).toBeChecked();
    await expect(nameOf(page)).toHaveValue('Get customer');
    await expect(editorOf(page)).toHaveValue(first);
    await expect(treeRow(page, '[22]')).toHaveAttribute('aria-expanded', 'true');
    await expect(treeRow(page, 'Email')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('textbox', { name: 'Loop name' })).toHaveValue('Each customer');
    await expect(reference(page)).toHaveText("body('Get_customer')?['value'][22]?['Email']");

    await tabAt(page, 2).click();
    await expect(page.getByRole('radio', { name: 'Trigger · Full output' })).toBeChecked();
    await expect(editorOf(page)).toHaveValue(second);
    await expect(treeRow(page, 'customer')).toHaveAttribute('aria-selected', 'true');
    await expect(reference(page)).toHaveText("triggerOutputs()?['body']?['customer']");
  });

  await test.step('equal names stay distinguishable and edits stay local (AC-1.7)', async () => {
    await page.getByRole('radio', { name: 'Action · Full output' }).click();
    await nameOf(page).fill('Get customer');
    await expect(tabAt(page, 1)).toHaveAccessibleName('Get customer, payload 1');
    await expect(tabAt(page, 2)).toHaveAccessibleName('Get customer, payload 2');
    await nameOf(page).fill('Second');
    await expect(tabAt(page, 1)).toHaveAccessibleName('Get customer, payload 1');
    await expect(tabAt(page, 2)).toHaveAccessibleName('Second, payload 2');
  });

  await test.step('a sixth payload is unavailable (AC-1.3)', async () => {
    for (const label of ['Third', 'Fourth', 'Fifth']) {
      await addPayload(page);
      await nameOf(page).fill(label);
    }
    await expect(page.getByText('5 / 5')).toBeVisible();
    await expect(newPayload(page)).toBeDisabled();
    await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(5);
  });

  await test.step('closing an inactive payload keeps the active one (AC-1.5)', async () => {
    await page.getByRole('button', { name: 'Close Second, payload 2' }).click();
    await expect(page.getByRole('tab', { name: 'Fifth, payload 4' })).toHaveAttribute('aria-selected', 'true');
    await expect(nameOf(page)).toHaveValue('Fifth');
    await expect(newPayload(page)).toBeEnabled();
  });

  await test.step('closing the active payload activates the tab in its position, or the one before it (AC-1.5)', async () => {
    await page.getByRole('tab', { name: 'Third, payload 2' }).click();
    await page.getByRole('button', { name: 'Close Third, payload 2' }).click();
    await expect(page.getByRole('tab', { name: 'Fourth, payload 2' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Fifth, payload 3' }).click();
    await page.getByRole('button', { name: 'Close Fifth, payload 3' }).click();
    await expect(page.getByRole('tab', { name: 'Fourth, payload 2' })).toHaveAttribute('aria-selected', 'true');
  });

  await test.step('the last payload cannot be closed and keeps its data (AC-1.6)', async () => {
    await page.getByRole('button', { name: 'Close Fourth, payload 2' }).click();
    await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);
    await expect(nameOf(page)).toHaveValue('Get customer');
    await expect(editorOf(page)).toHaveValue(first);
    await expect(treeRow(page, '[22]')).toBeVisible();
  });
});

test('finds paths across payloads by label and by full value (AC-2.1 to AC-2.3, AC-2.6, AC-2.7)', async ({
  page,
}) => {
  const suffix = 'TAILSUFFIX';
  await start(page);
  await openJsonReference(page);
  const search = page.getByRole('combobox', { name: 'Search all payloads' });
  const options = page.getByRole('option');
  const heading = page.locator('.eb-payload-search-popup [role="status"]');

  await seed(page, {
    name: 'Get customer',
    sample: JSON.stringify({ Email: 'a@contoso.example', note: `${'n'.repeat(120)}${suffix}` }),
  });
  await addPayload(page);
  await seed(page, {
    name: 'Get manager',
    sample: JSON.stringify({ Email: 'm@contoso.example', bio: 'Write to EMAIL first' }),
  });

  await test.step('matches ignore case and show payload, path and value (AC-2.1)', async () => {
    await search.fill('email');
    await expect(options).toHaveCount(3);
    await expect(heading).toHaveText('3 matches · 2 parsed payloads');
    await expect(options.nth(0)).toContainText('Get customer');
    await expect(options.nth(0)).toContainText('Email');
    await expect(options.nth(0)).toContainText('"a@contoso.example"');
    await expect(options.nth(2)).toContainText('Get manager');
    await expect(options.nth(2)).toContainText('bio');
  });

  await test.step('a match beyond the shortened preview is found (AC-2.2)', async () => {
    await search.fill(suffix.toLowerCase());
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('note');
    await expect(options.first()).not.toContainText(suffix);
  });

  await test.step('blank queries open nothing; no matches say so (AC-2.6)', async () => {
    await search.fill('   ');
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await search.fill('no-such-value');
    await expect(page.getByText('No matches in parsed payloads.')).toBeVisible();
    await expect(heading).toHaveText('0 matches · 2 parsed payloads');
  });

  await test.step('more than eight matches list eight in order and state the total (AC-2.3)', async () => {
    await addPayload(page);
    await seed(page, {
      name: 'Many',
      sample: JSON.stringify(Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [`zz${index}`, index]),
      )),
    });
    await search.fill('zz');
    await expect(options).toHaveCount(8);
    await expect(heading).toHaveText('12 matches · 3 parsed payloads');
    await expect(options.first()).toContainText('zz0');
    await expect(options.last()).toContainText('zz7');
    await search.press('Escape');
  });

  await test.step('only displayed parsed data is searched (AC-2.7)', async () => {
    // Payload 4 has nothing parsed; payload 1 keeps its payload after an invalid automatic edit.
    await addPayload(page);
    await tabAt(page, 1).click();
    await typeSample(page, '{"Email":');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 3_000 });
    // Payload 3 is parsed but its action name is blank.
    await tabAt(page, 3).click();
    await nameOf(page).fill('');
    await search.fill('zz1');
    await expect(heading).toHaveText('3 matches · 3 parsed payloads');
    await expect(options.first()).toContainText('zz1');

    await search.fill('email');
    await expect(heading).toHaveText('3 matches · 3 parsed payloads');
    await search.press('Enter');
    await expect(tabAt(page, 1)).toHaveAttribute('aria-selected', 'true');
    await expect(treeRow(page, 'Email')).toBeFocused();

    await search.fill('zz1');
    await search.press('Enter');
    await expect(tabAt(page, 3)).toHaveAttribute('aria-selected', 'true');
    await expect(treeRow(page, 'zz1')).toHaveAttribute('aria-selected', 'true');
    // An unnamed source is revealed but never becomes copyable.
    await expect(reference(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toHaveCount(0);
  });
});

test('groups Functions references by payload and keeps inserted text (AC-3.1 to AC-3.9, FR-3)', async ({
  page,
}) => {
  const customer = JSON.stringify({ Email: 'c@cust.example', items: [{ Email: 'i0@cust.example' }] });
  const manager = JSON.stringify({ Email: 'm@mgr.example', items: [{ Email: 'i0@mgr.example' }] });
  await start(page);
  const parsedValue = page.getByRole('button', { name: /^Parsed Value \d+$/ });
  const args = page.locator('input[data-arg]');
  const sources = page.locator('details.eb-pv-source');
  const group = (label: string) => sources.filter({ hasText: label });
  const emailRow = (label: string) =>
    group(label).getByRole('button', { name: 'Email', exact: true });
  const customerItem = "body('Get_customer')?['items'][0]?['Email']";

  await test.step('with nothing parsed the group says where to parse (AC-3.1)', async () => {
    await openScreen(page, 'Functions');
    await parsedValue.click();
    await expect(page.getByText('Parse a sample in JSON reference')).toBeVisible();
    await parsedValue.click();
  });

  await openJsonReference(page);
  await seed(page, { name: 'Get customer', root: 'Action · Body only', sample: customer });
  await addPayload(page);
  await seed(page, { name: 'Get manager', root: 'Action · Body only', sample: manager });
  await addPayload(page);
  await seed(page, { name: 'Temporary', root: 'Action · Body only', sample: customer });
  await nameOf(page).fill('');
  await openScreen(page, 'Functions');
  await parsedValue.click();

  await test.step('one collapsed group per parsed payload, in tab order (AC-3.2)', async () => {
    await expect(sources.locator('> summary')).toHaveText([
      "Get customer · body('Get_customer') · 2",
      "Get manager · body('Get_manager') · 2",
      "Payload 3 · body('Action_name') · 0",
    ]);
    for (const source of await sources.all()) {
      await expect(source).not.toHaveJSProperty('open', true);
    }
  });

  await test.step('an unnamed source offers nothing to insert (AC-3.7)', async () => {
    await sources.last().locator('summary').click();
    await expect(sources.last()).toContainText('Set an action name in JSON reference');
    await expect(sources.last().locator('.eb-pv-row')).toHaveCount(0);
    await expect(sources.first().locator('.eb-pv-row')).toHaveCount(2);
  });

  await test.step('array items start collapsed and open independently per source (AC-3.6)', async () => {
    await sources.first().locator('summary').first().click();
    await sources.nth(1).locator('summary').first().click();
    const items = page.locator('details.eb-pv-item:not(.eb-pv-source)');
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) await expect(item).not.toHaveJSProperty('open', true);
    await items.first().locator('summary').click();
    await expect(items.first()).toHaveJSProperty('open', true);
    await expect(items.last()).not.toHaveJSProperty('open', true);
  });

  await test.step('with no argument focused, Enter fills the first empty one and focuses it (AC-3.4)', async () => {
    const row = emailRow('Get customer');
    await row.focus();
    await row.press('Enter');
    await expect(args.first()).toHaveValue("body('Get_customer')?['Email']");
    await expect(args.first()).toBeFocused();
  });

  await test.step('with another argument last focused, double-click fills that one (AC-3.3, AC-3.4)', async () => {
    await args.nth(1).click();
    await emailRow('Get manager').dblclick();
    await expect(args.nth(1)).toHaveValue("body('Get_manager')?['Email']");
    await expect(args.nth(1)).toBeFocused();
  });

  await test.step('the last focused argument is replaced, not appended to (AC-3.4)', async () => {
    await args.first().click();
    await sources.first().getByRole('button', { name: 'items[0].Email' }).dblclick();
    await expect(args.first()).toHaveValue(customerItem);
    await expect(args.first()).toBeFocused();
    await expect(args.nth(1)).toHaveValue("body('Get_manager')?['Email']");
  });

  await test.step('inserted text equals each source JSON reference (AC-3.3)', async () => {
    await openJsonReference(page);
    await tabAt(page, 1).click();
    await treeRow(page, 'items').locator('[data-chevron]').click();
    await treeRow(page, '[0]').locator('[data-chevron]').click();
    await page.getByRole('treeitem', { name: /^Email, string, "i0@/ }).click();
    await expect(reference(page)).toHaveText(customerItem);
    await tabAt(page, 2).click();
    await treeRow(page, 'Email').click();
    await expect(reference(page)).toHaveText("body('Get_manager')?['Email']");
  });

  await test.step('renaming a source updates its group but not inserted text (AC-3.9)', async () => {
    await nameOf(page).fill('Get boss');
    await openScreen(page, 'Functions');
    await expect(sources.locator('> summary')).toHaveText([
      "Get customer · body('Get_customer') · 2",
      "Get boss · body('Get_boss') · 2",
      "Payload 3 · body('Action_name') · 0",
    ]);
    await expect(args.nth(1)).toHaveValue("body('Get_manager')?['Email']");
    await expect(args.first()).toHaveValue(customerItem);
  });

  await test.step('closing sources leaves the single-source list and the arguments alone (AC-3.9, AC-3.1)', async () => {
    await openJsonReference(page);
    await page.getByRole('button', { name: 'Close Get boss, payload 2' }).click();
    await page.getByRole('button', { name: 'Close Payload 2, payload 2' }).click();
    await openScreen(page, 'Functions');
    await expect(sources).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Email', exact: true })).toBeVisible();
    await expect(args.nth(1)).toHaveValue("body('Get_manager')?['Email']");
    await expect(args.first()).toHaveValue(customerItem);
  });
});

test('keeps Functions to 200 rows across sources, allocated in tab order (AC-3.5)', async ({
  page,
}) => {
  const keys = (prefix: string, count: number) => JSON.stringify(
    Object.fromEntries(Array.from({ length: count }, (_, index) => [`${prefix}${index}`, index])),
  );
  await start(page);
  await openJsonReference(page);
  await seed(page, { name: 'Alpha', root: 'Action · Body only', sample: keys('alpha', 150) });
  await addPayload(page);
  await seed(page, { name: 'Beta', root: 'Action · Body only', sample: keys('beta', 100) });

  await openScreen(page, 'Functions');
  await page.getByRole('button', { name: /^Parsed Value \d+$/ }).click();
  await expect(page.getByRole('button', { name: 'Parsed Value 200' })).toBeVisible();
  await expect(page.locator('.eb-pv-row')).toHaveCount(200);
  await expect(page.getByText('+50 more — narrow with search')).toBeVisible();
  await expect(page.locator('details.eb-pv-source > summary')).toHaveText([
    "Alpha · body('Alpha') · 150",
    "Beta · body('Beta') · 100",
  ]);

  // Filtering precedes the shared cap, so leaves from the later source can appear.
  await page.getByRole('searchbox', { name: 'Search functions' }).fill('beta99');
  await expect(page.getByRole('button', { name: 'Parsed Value 1' })).toBeVisible();
  await expect(page.locator('.eb-pv-row')).toHaveText(['beta99']);
});

test('keeps conditions, Functions arguments and payloads through navigation; reload starts empty (AC-1.8, FR-6)', async ({
  page,
}) => {
  await start(page);
  const generated = page.locator('[aria-label="Generated expression"]:visible');
  const args = page.locator('input[data-arg]');

  await page.getByRole('button', { name: 'Load sample fields' }).first().click();
  const addRule = page.getByRole('button', { name: 'Add rule to group root' });
  await addRule.click();
  await addRule.click();
  const conditionExpression = await generated.textContent();
  await page.getByRole('button', { name: 'Export' }).click();
  const conditionExport = await page.evaluate(() => navigator.clipboard.readText());
  expect(conditionExport).not.toBe('');

  await openJsonReference(page);
  await seed(page, { name: 'Get customer', root: 'Action · Body only', sample: '{"Email":"c@x.example"}' });
  await addPayload(page);
  await seed(page, { name: 'Get manager', root: 'Action · Body only', sample: '{"Email":"m@x.example"}' });

  await openScreen(page, 'Functions');
  await page.getByRole('button', { name: /^Parsed Value \d+$/ }).click();
  for (const [index, label] of ['Get customer', 'Get manager'].entries()) {
    await page.locator('details.eb-pv-source', { hasText: label }).locator('summary').click();
    await args.nth(index).click();
    await page.locator('details.eb-pv-source', { hasText: label })
      .getByRole('button', { name: 'Email', exact: true }).dblclick();
  }
  const argValues = [
    "body('Get_customer')?['Email']",
    "body('Get_manager')?['Email']",
  ];
  await expect(args.nth(0)).toHaveValue(argValues[0]);
  await expect(args.nth(1)).toHaveValue(argValues[1]);
  const functionsExpression = await generated.textContent();

  for (const screen of ['Trigger / Filter', 'JSON reference', 'Functions', 'Trigger / Filter', 'Functions', 'JSON reference'] as const) {
    await test.step(`visiting ${screen} changes nothing`, async () => {
      await openScreen(page, screen);
      if (screen === 'Trigger / Filter') {
        await expect(generated).toHaveText(conditionExpression ?? '');
        await page.getByRole('button', { name: 'Export' }).click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(conditionExport);
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
    });
  }
  await page.waitForTimeout(800);
  // Nothing was re-parsed or re-announced by all that navigation.
  expect((await toasts(page)).filter((message) => message.startsWith('Payload updated'))).toEqual([]);

  await page.reload();
  await openJsonReference(page);
  await expect(page.getByRole('tab', { name: /, payload \d$/ })).toHaveCount(1);
  await expect(tabAt(page, 1)).toHaveAccessibleName('Payload 1, payload 1');
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(editorOf(page)).toHaveValue('');
  await expect(nameOf(page)).toHaveValue('');
  await expect(page.getByRole('radio', { name: 'Action · Full output' })).toBeChecked();
  await expect(page.getByRole('tree')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Close / })).toHaveCount(0);
});
