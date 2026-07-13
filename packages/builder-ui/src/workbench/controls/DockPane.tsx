import { useId, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/BuilderIcons';

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
  const bodyId = useId();
  const ToggleIcon = side === 'left'
    ? (collapsed ? ChevronRightIcon : ChevronLeftIcon)
    : (collapsed ? ChevronLeftIcon : ChevronRightIcon);

  return (
    <aside
      className={`eb-dock-pane ${collapsed ? 'eb-dock-collapsed' : ''}`}
      role="complementary"
      aria-label={title}
      data-side={side}
    >
      <div className="eb-pane-chrome">
        <span className="eb-pane-title">
          {title}
        </span>
        {!collapsed ? <span className="eb-dock-meta">{meta}</span> : null}
        <button
          type="button"
          className="eb-icon-btn"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={onToggleCollapsed}
        >
          <ToggleIcon />
        </button>
      </div>
      {!collapsed ? tabs : null}
      {!collapsed ? <div className="eb-pane-body" id={bodyId}>{children}</div> : null}
    </aside>
  );
}
