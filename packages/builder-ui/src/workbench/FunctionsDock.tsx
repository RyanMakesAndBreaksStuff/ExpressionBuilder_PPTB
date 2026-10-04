import { useRef, type KeyboardEvent } from 'react';
import { ExpressionPreview } from '../components/ExpressionPreview';
import { ActionButton } from './controls/ActionButton';
import { CopyIcon } from './icons/BuilderIcons';
import type { CopyFormat, FunctionsDerived } from './functionsState';

const COPY_FORMATS: CopyFormat[] = ['expression', 'wrapped'];

export interface FunctionsDockProps {
  derived: FunctionsDerived;
  copyFormat: CopyFormat;
  copyState: 'idle' | 'copied';
  onCopyFormatChange: (format: CopyFormat) => void;
  /** T14 performs the clipboard write; this component only reports intent. */
  onCopy: (format: CopyFormat) => void;
}

export function FunctionsDock({
  derived,
  copyFormat,
  copyState,
  onCopyFormatChange,
  onCopy,
}: FunctionsDockProps) {
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleFormatKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % COPY_FORMATS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index + COPY_FORMATS.length - 1) % COPY_FORMATS.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = COPY_FORMATS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onCopyFormatChange(COPY_FORMATS[nextIndex]);
    radioRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="eb-fn-dock">
      <div className="eb-fn-dock-code" style={{ minWidth: 0 }}>
        <div
          className="eb-fn-dock-header"
          role="group"
          aria-label="Expression controls"
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
        >
          <span style={{ textTransform: 'uppercase' }}>Expression</span>
          <span
            className={`eb-json-status ${derived.valid ? 'is-good' : 'is-danger'}`}
            data-tone={derived.valid ? 'good' : 'danger'}
          >
            {derived.valid ? 'Valid' : 'Invalid'}
          </span>
          <div className="eb-choice-segmented" role="radiogroup" aria-label="Expression format">
            {COPY_FORMATS.map((format, index) => (
              <button
                key={format}
                ref={(element) => { radioRefs.current[index] = element; }}
                type="button"
                role="radio"
                aria-checked={copyFormat === format}
                tabIndex={copyFormat === format ? 0 : -1}
                onClick={() => onCopyFormatChange(format)}
                onKeyDown={(event) => handleFormatKeyDown(event, index)}
              >
                {format === 'expression' ? 'Expression' : '@{…}'}
              </button>
            ))}
          </div>
          <div className="eb-fn-dock-actions">
            <ActionButton
              variant="primary"
              icon={<CopyIcon />}
              disabled={!derived.valid}
              onClick={() => onCopy(copyFormat)}
            >
              {copyState === 'copied' ? 'Copied' : 'Copy expression'}
            </ActionButton>
            <button
              className="eb-fn-copy-wrapped"
              type="button"
              disabled={!derived.valid}
              onClick={() => onCopy('wrapped')}
            >
              Copy as @{'{…}'}
            </button>
          </div>
        </div>
        <div style={{ minHeight: 0, overflow: 'auto' }}>
          <ExpressionPreview
            expression={copyFormat === 'wrapped' ? derived.wrapped : derived.expression}
            label="Generated expression"
          />
        </div>
        <hr aria-hidden="true" style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />
        <div>
          {derived.crumbs.map((crumb, index) => (
            <span key={crumb.label + '-' + index}>
              {index > 0 ? <span aria-hidden="true">›</span> : null}
              <span className="eb-fn-crumb" data-tone={crumb.tone}>{crumb.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
