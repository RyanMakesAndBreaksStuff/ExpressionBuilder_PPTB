import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ExpressionPreview } from '../components/ExpressionPreview';
import { ActionButton } from './controls/ActionButton';
import { ChevronDownIcon, CopyIcon } from './icons/BuilderIcons';
import type { CopyFormat, FunctionsDerived } from './functionsState';

export interface FunctionsDockProps {
  derived: FunctionsDerived;
  copyState: 'idle' | 'copied';
  /** T14 performs the clipboard write; this component only reports intent. */
  onCopy: (format: CopyFormat) => void;
}

export function FunctionsDock({ derived, copyState, onCopy }: FunctionsDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const open = menuOpen && derived.valid;

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    function handlePointerDown(event: PointerEvent) {
      if (!splitRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function copyFromMenu(format: CopyFormat) {
    setMenuOpen(false);
    chevronRef.current?.focus();
    onCopy(format);
  }

  function handleChevronKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    setMenuOpen(true);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : items.length - 1;
        items[(index + step) % items.length]?.focus();
        break;
      }
      case 'Escape':
        event.preventDefault();
        setMenuOpen(false);
        chevronRef.current?.focus();
        break;
      case 'Tab':
        setMenuOpen(false);
        break;
    }
  }

  const menuItems: Array<{ format: CopyFormat; label: string; text: string }> = [
    { format: 'expression', label: 'Copy expression', text: derived.expression },
    { format: 'wrapped', label: 'Copy with @{ }', text: derived.wrapped },
  ];

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
          <div className="eb-fn-dock-actions" ref={splitRef}>
            <div className="eb-fn-split">
              <ActionButton
                variant="primary"
                icon={<CopyIcon />}
                disabled={!derived.valid}
                onClick={() => onCopy('expression')}
              >
                {copyState === 'copied' ? 'Copied' : 'Copy expression'}
              </ActionButton>
              <button
                ref={chevronRef}
                className="eb-fn-split-toggle"
                type="button"
                aria-label="More copy formats"
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={!derived.valid}
                onClick={() => setMenuOpen((value) => !value)}
                onKeyDown={handleChevronKeyDown}
              >
                <ChevronDownIcon />
              </button>
            </div>
            {open ? (
              <div className="eb-fn-copy-menu" role="menu" aria-label="Copy formats" onKeyDown={handleMenuKeyDown}>
                {menuItems.map((item, index) => (
                  <button
                    key={item.format}
                    ref={(element) => { itemRefs.current[index] = element; }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => copyFromMenu(item.format)}
                  >
                    <span>{item.label}</span>
                    <code>{item.text}</code>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ minHeight: 0, overflow: 'auto' }}>
          <ExpressionPreview expression={derived.expression} label="Generated expression" />
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
