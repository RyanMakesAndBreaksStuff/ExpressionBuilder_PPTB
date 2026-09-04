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

    expect(screen.getByRole('button', { name: 'Expand expression preview' })).toHaveAttribute('aria-expanded', 'false');
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

    expect(screen.getByRole('status')).toHaveTextContent('Expression copied');
  });

  it('keeps the copy live region mounted but empty while idle', () => {
    render(
      <ExpressionDocumentPanel
        expression="@equals(item()?['Status'],'Approved')"
        collapsed={false}
        copyState="idle"
        onToggleCollapsed={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    // Mounted, so the later update is announced; empty, so nothing is read on
    // traversal (opacity:0 hides it visually but not from assistive tech).
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
