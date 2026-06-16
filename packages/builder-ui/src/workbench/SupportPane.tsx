import type { SupportPaneProps } from './types';
import { DockPane } from './controls/DockPane';
import { TabStrip } from './controls/TabStrip';
import { DiagnosticList } from './DiagnosticList';
import { ModeContextPanel } from './ModeContextPanel';

export function SupportPane({
  activeTab,
  collapsed,
  diagnostics,
  mode,
  onTabChange,
  onToggleCollapsed,
}: SupportPaneProps) {
  return (
    <DockPane
      title="Support Pane"
      side="right"
      collapsed={collapsed}
      meta="Right pane"
      tabs={
        <TabStrip
          label="Support tabs"
          activeTab={activeTab}
          tabs={[
            { id: 'diagnostics', label: 'Diagnostics' },
            { id: 'modeContext', label: 'Mode Context' },
          ]}
          onChange={onTabChange}
        />
      }
      onToggleCollapsed={onToggleCollapsed}
    >
      {activeTab === 'diagnostics' ? <DiagnosticList diagnostics={diagnostics} /> : <ModeContextPanel mode={mode} />}
    </DockPane>
  );
}
