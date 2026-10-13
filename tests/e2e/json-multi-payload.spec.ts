import { expect, test, type Page } from 'playwright/test';

test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
});

async function openJsonReference(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Screen:/ }).click();
  await page.getByRole('menuitemradio', {
    name: 'JSON reference',
    exact: true,
  }).click();
}

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

test('keeps samples independent and preserves native paste undo', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('eb.onboarding.seen.v1', '1'),
  );
  await page.goto('/');
  await openJsonReference(page);

  await pasteSample(page, '{"old":1}');
  const editor = page.getByRole('textbox', {
    name: 'Sample JSON',
    exact: true,
  });

  await editor.evaluate((element) =>
    (element as HTMLTextAreaElement).setSelectionRange(2, 5),
  );
  await pasteSample(page, '{"new":2}');
  await expect(editor).toHaveValue('{"new":2}');

  await editor.press('Control+Z');
  await expect(editor).toHaveValue('{"old":1}');
  await editor.press('Control+Y');
  await expect(editor).toHaveValue('{"new":2}');

  await page.getByRole('button', {
    name: 'New payload',
    exact: true,
  }).click();
  await expect(editor).toHaveValue('');

  await pasteSample(page, '{"second":3}');
  await page.getByRole('tab', {
    name: /^Action, payload 1$/,
  }).click();
  await expect(editor).toHaveValue('{"new":2}');
});
