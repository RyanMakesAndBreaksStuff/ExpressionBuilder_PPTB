// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter } from '@ryanmakes/eb_platformadapter';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';
import { sampleDocument } from '../src/app/sampleData';

beforeEach(() => {
  vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1280, 800));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createAdapter(): PlatformAdapter {
  return {
    copyToClipboard: vi.fn(),
    notify: vi.fn(),
    getTheme: vi.fn(async () => 'light'),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: {
      get: vi.fn(async (key: string) => (key === 'eb.onboarding.seen.v1' ? '1' : null)),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    getDataverseFields: vi.fn(async () => []),
  };
}

const conditionExpression = () =>
  within(screen.getByLabelText('Trigger / Filter')).getByLabelText('Generated expression');

describe('ImportSchemaDialog', () => {
  it('stays usable and leaves the current document unchanged for an unsupported schema', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} initialDocument={sampleDocument} />);
    const expressionBefore = conditionExpression().textContent;

    await user.click(screen.getByRole('button', { name: 'Data source menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Import schema…' }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await user.click(within(dialog).getByRole('tab', { name: 'Schema', hidden: true }));

    const input = within(dialog).getByLabelText('Schema input');
    await user.click(input);
    await user.paste('null');

    expect(within(dialog).getByText('Unsupported JSON Schema shape.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Import', hidden: true })).toBeDisabled();
    expect(conditionExpression().textContent).toBe(expressionBefore);
    expect(screen.queryByText(/^x ·/)).not.toBeInTheDocument();

    await user.clear(input);
    await user.paste('{"properties":{"x":null}}');
    expect(within(dialog).getByText('Unsupported JSON Schema shape.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Import', hidden: true })).toBeDisabled();
    expect(conditionExpression().textContent).toBe(expressionBefore);

    await user.clear(input);
    await user.paste('{"properties":[]}');
    expect(within(dialog).getByText('Schema has no "properties" object.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Import', hidden: true })).toBeDisabled();

    await user.clear(input);
    await user.paste('{"properties":{"name":{"type":"string","title":"Name"}}}');
    expect(within(dialog).queryByText('Unsupported JSON Schema shape.')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Name · string')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Import', hidden: true })).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel', hidden: true }));
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
    expect(conditionExpression().textContent).toBe(expressionBefore);
    expect(screen.queryByText('Name · string')).not.toBeInTheDocument();
    expect(document.querySelector('[data-node-id="rule-status"]')).toHaveClass('is-selected');
    expect(screen.getByRole('group', { name: /Status equals Approved/i, hidden: true })).toBeInTheDocument();
  });

  it('imports a dotted key and a nested path as different fields', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Data source menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Import schema…' }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await user.click(within(dialog).getByRole('tab', { name: 'Sample', hidden: true }));
    const input = within(dialog).getByLabelText('Sample input');
    await user.click(input);
    await user.paste('{"a.b":1,"a":{"b":2}}');

    expect(within(dialog).getByText('A B · number')).toBeInTheDocument();
    expect(within(dialog).getByText('B · number')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Import', hidden: true }));

    await user.click(screen.getByRole('button', { name: 'Add a rule for A B, number', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Add a rule for B, number', hidden: true }));

    const expression = conditionExpression().textContent ?? '';
    expect(expression).toContain("triggerBody()?['a.b']");
    expect(expression).toContain("triggerBody()?['a']?['b']");
  });

  it('keeps numeric and boolean enum values typed in the emitted expression', async () => {
    const user = userEvent.setup();
    render(<ExpressionBuilderShell adapter={createAdapter()} />);

    await user.click(screen.getByRole('button', { name: 'Data source menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Import schema…' }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await user.click(within(dialog).getByRole('tab', { name: 'Schema', hidden: true }));
    const input = within(dialog).getByLabelText('Schema input');
    await user.click(input);
    await user.paste('{"properties":{"level":{"title":"Level","type":"integer","enum":[2,3]},"flag":{"title":"Flag","enum":[true,false]}}}');
    await user.click(within(dialog).getByRole('button', { name: 'Import', hidden: true }));

    await user.click(screen.getByRole('button', { name: /Add a rule for Level/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /Add a rule for Flag/, hidden: true }));

    const expression = conditionExpression().textContent ?? '';
    expect(expression).toContain("triggerBody()?['level'], 2)");
    expect(expression).not.toContain("'2'");
    expect(expression).toMatch(/triggerBody\(\)\?\['flag'\], (true|false)\)/);
  });
});
