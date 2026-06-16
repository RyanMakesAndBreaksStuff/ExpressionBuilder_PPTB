import { ExpressionPreview } from '../components/ExpressionPreview';
import type { ExpressionDocumentPanelProps } from './types';
import { ActionButton } from './controls/ActionButton';
import { CopyIcon } from './icons/BuilderIcons';

export function ExpressionDocumentPanel({
  collapsed,
  copyState,
  expression,
  onCopy,
  onToggleCollapsed,
}: ExpressionDocumentPanelProps) {
  return (
    <section className={`eb-preview-card ${collapsed ? 'eb-preview-collapsed' : ''}`} role="region" aria-label="Expression Preview" aria-expanded={!collapsed}>
      <div className="eb-preview-header">
        <h2>Expression Preview</h2>
        <ActionButton onClick={onToggleCollapsed}>
          {collapsed ? 'Expand expression preview' : 'Collapse expression preview'}
        </ActionButton>
      </div>
      {!collapsed ? (
        <div className="eb-preview-body">
          <div className="eb-copy-row">
            <ActionButton onClick={onCopy} icon={<CopyIcon />}>
              Copy preview expression
            </ActionButton>
            {copyState === 'copied' ? (
              <span className="eb-copy-state" role="status" aria-label="copy status">
                Expression copied
              </span>
            ) : null}
          </div>
          <ExpressionPreview expression={expression} />
        </div>
      ) : null}
    </section>
  );
}
