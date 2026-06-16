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

export function DockPane({ title, side, collapsed, children, tabs, meta, onToggleCollapsed }: DockPaneProps) {
  const toggleLabel = `${collapsed ? 'Expand' : 'Collapse'} ${title}`;

  return (
    <aside
      className={`eb-dock-pane ${collapsed ? 'eb-dock-collapsed' : ''}`}
      role="complementary"
      aria-label={title}
      aria-expanded={!collapsed}
      data-side={side}
    >
      <div className="eb-pane-chrome">
        <span className="eb-pane-title">{title}</span>
        {collapsed ? <span className="eb-collapsed-rail-label">{title}</span> : <span className="eb-dock-meta">{meta}</span>}
        <ActionButton variant="icon" label={toggleLabel} onClick={onToggleCollapsed}>
          {toggleLabel}
        </ActionButton>
      </div>
      {!collapsed ? tabs : null}
      {!collapsed ? <div className="eb-pane-body">{children}</div> : null}
    </aside>
  );
}
