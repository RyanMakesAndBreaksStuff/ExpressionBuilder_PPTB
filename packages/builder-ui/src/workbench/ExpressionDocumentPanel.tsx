import { useId } from 'react';
import { ExpressionPreview } from '../components/ExpressionPreview';
import type { ExpressionDocumentPanelProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, CodeIcon } from './icons/BuilderIcons';

export function ExpressionDocumentPanel({
  collapsed,
  copyState,
  expression,
  onCopy,
  onToggleCollapsed,
}: ExpressionDocumentPanelProps) {
  const bodyId = useId();
  return (
    <section className={`eb-preview-card ${collapsed ? 'eb-preview-collapsed' : ''}`} role="region" aria-label="Expression Preview">
      <div className="eb-preview-header">
        <h2>
          <CodeIcon />
          Expression Preview
        </h2>
        <span className="eb-dock-meta"></span>
        <button
          type="button"
          className="eb-icon-btn"
          title={collapsed ? 'Expand expression preview' : 'Collapse expression preview'}
          aria-label={collapsed ? 'Expand expression preview' : 'Collapse expression preview'}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>
      {!collapsed ? (
        <div className="eb-preview-body" id={bodyId}>
          <ExpressionPreview expression={expression} />
          <div className="eb-copy-row">
            <ActionButton onClick={onCopy} icon={<CopyIcon />}>
              Copy
            </ActionButton>
            <span className={`eb-copy-state ${copyState === 'copied' ? 'on' : ''}`} role="status" aria-label="copy status">
              Expression copied
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
