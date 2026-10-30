import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { ActionButton } from '../workbench/controls/ActionButton';

interface ErrorBoundaryState {
  failed: boolean;
  key: number;
}

/** Contains a render failure to its subtree; Reset remounts the children via a new key. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, key: 0 };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Render failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return <Fragment key={this.state.key}>{this.props.children}</Fragment>;
    return (
      <div role="alert">
        <p>Something went wrong</p>
        <ActionButton onClick={() => this.setState(({ key }) => ({ failed: false, key: key + 1 }))}>
          Reset
        </ActionButton>
      </div>
    );
  }
}
