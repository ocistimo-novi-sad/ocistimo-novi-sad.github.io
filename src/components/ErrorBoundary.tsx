import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';

/**
 * Catches a render error anywhere below it. Without it React unmounts the whole
 * app and leaves an empty page, so the visitor gets a short message and a way
 * to reload instead (#124).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <EmptyState
          icon={<TriangleAlert size={20} />}
          title="Nešto nije u redu"
          description="Osveži stranicu."
          action={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Osveži
            </button>
          }
        />
      </main>
    );
  }
}
