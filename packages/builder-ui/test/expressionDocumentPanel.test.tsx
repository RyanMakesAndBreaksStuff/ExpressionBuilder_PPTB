// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionDocumentPanel } from '../src/workbench/ExpressionDocumentPanel';

afterEach(() => cleanup());

describe('ExpressionDocumentPanel', () => {
  it('keeps the generated expression accessible when expanded', () => {
    render(
      <ExpressionDocumentPanel
        expression="@equals(triggerBody()?['Status'],'Approved')"
        collapsed={false}
        copyState="idle"
        onToggleCollapsed={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Generated expression')).toHaveTextContent("triggerBody()?['Status']");
  });

  it('uses aria-expanded for document panel collapse', async () => {
    const onToggle = vi.fn();

    render(
      <ExpressionDocumentPanel
        expression="@equals(item()?['Status'],'Approved')"
        collapsed={true}
        copyState="idle"
        onToggleCollapsed={onToggle}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Expression Preview' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Expand expression preview' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('announces copied state', () => {
    render(
      <ExpressionDocumentPanel
        expression="@equals(item()?['Status'],'Approved')"
        collapsed={false}
        copyState="copied"
        onToggleCollapsed={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByRole('status', { name: 'copy status' })).toHaveTextContent('Expression copied');
  });
});
