import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';

interface DockPaneProps {
  title: string;
  side: 'left' | 'right';
  collapsed: boolean;
  children: ReactNode;
  tabs?: ReactNode;
  meta?: string;
  onToggleCollapsed: () => void;
}

export function DockPane({ title, side, collapsed, children, tabs, onToggleCollapsed }: DockPaneProps) {
  const toggleLabel = `${collapsed ? 'Expand' : 'Collapse'} ${title}`;
  const toggleGlyph = side === 'left' ? (collapsed ? '>' : '<') : collapsed ? '<' : '>';

  return (
    <aside
      className={`eb-dock-pane ${collapsed ? 'eb-dock-collapsed' : ''}`}
      role="complementary"
      aria-label={title}
      aria-expanded={!collapsed}
      data-side={side}
    >
      <div className="eb-pane-chrome">
        <ActionButton variant="icon" label={toggleLabel} title={toggleLabel} icon={<span>{toggleGlyph}</span>} onClick={onToggleCollapsed} />
      </div>
      {!collapsed ? tabs : null}
      {!collapsed ? <div className="eb-pane-body">{children}</div> : null}
    </aside>
  );
}
