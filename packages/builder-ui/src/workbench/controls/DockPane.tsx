import type { ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, GripIcon } from '../icons/BuilderIcons';

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
  const ToggleIcon = side === 'left'
    ? (collapsed ? ChevronRightIcon : ChevronLeftIcon)
    : (collapsed ? ChevronLeftIcon : ChevronRightIcon);

  return (
    <aside
      className={`eb-dock-pane ${collapsed ? 'eb-dock-collapsed' : ''}`}
      role="complementary"
      aria-label={title}
      aria-expanded={!collapsed}
      data-side={side}
    >
      <div className="eb-pane-chrome">
        <span className="eb-drag-dots">
          <GripIcon />
        </span>
        <span className="eb-pane-title">
          {title}
        </span>
        {collapsed ? (
          <span className="eb-collapsed-rail-label">{title}</span>
        ) : (
          <span className="eb-dock-meta">{meta}</span>
        )}
        <button
          type="button"
          className="eb-icon-btn"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleCollapsed}
        >
          <ToggleIcon />
        </button>
      </div>
      {!collapsed ? tabs : null}
      {!collapsed ? <div className="eb-pane-body">{children}</div> : null}
    </aside>
  );
}
