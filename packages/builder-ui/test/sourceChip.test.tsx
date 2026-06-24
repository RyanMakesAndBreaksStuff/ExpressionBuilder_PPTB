// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SourceChip } from '../src/workbench/SourceChip';

const handlers = {
  onSwitchTable: vi.fn(),
  onImport: vi.fn(),
  onAddField: vi.fn(),
  onLoadSamples: vi.fn(),
  onManageProfiles: vi.fn(),
  onRefresh: vi.fn(),
};

function renderChip(kind: 'dataverse' | 'unknown') {
  return render(
    <FluentProvider theme={webLightTheme}>
      <SourceChip source={{ kind, label: kind === 'dataverse' ? 'Account' : undefined }} {...handlers} />
    </FluentProvider>,
  );
}

describe('SourceChip', () => {
  afterEach(cleanup);

  it('shows refresh only for dataverse', () => {
    const { rerender } = renderChip('unknown');
    expect(screen.queryByRole('button', { name: 'Refresh fields' })).toBeNull();
    rerender(
      <FluentProvider theme={webLightTheme}>
        <SourceChip source={{ kind: 'dataverse', label: 'Account' }} {...handlers} />
      </FluentProvider>,
    );
    expect(screen.getByRole('button', { name: 'Refresh fields' })).toBeTruthy();
  });

  it('dispatches menu actions', async () => {
    const localHandlers = {
      onSwitchTable: vi.fn(),
      onImport: vi.fn(),
      onAddField: vi.fn(),
      onLoadSamples: vi.fn(),
      onManageProfiles: vi.fn(),
      onRefresh: vi.fn(),
    };
    const { container } = render(
      <FluentProvider theme={webLightTheme}>
        <SourceChip source={{ kind: 'dataverse', label: 'Account' }} {...localHandlers} />
      </FluentProvider>,
    );
    await userEvent.click(within(container).getByRole('button', { name: 'Data source menu' }));
    await userEvent.click(screen.getByText('Import schema…'));
    expect(localHandlers.onImport).toHaveBeenCalled();
  });
});
