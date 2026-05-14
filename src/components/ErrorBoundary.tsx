import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled app error', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="error-boundary" role="alert" aria-live="assertive">
        <section className="error-boundary__panel">
          <div>
            <p className="error-boundary__eyebrow">Unexpected error</p>
            <h1 className="error-boundary__title">The board needs a quick reset.</h1>
            <p className="error-boundary__message">
              Your workspace data is still stored locally. Try the board again, or refresh the app if
              the problem keeps happening.
            </p>
          </div>

          <div className="error-boundary__actions">
            <button className="error-boundary__button error-boundary__button--primary" type="button" onClick={this.handleRetry}>
              Try again
            </button>
            <button className="error-boundary__button" type="button" onClick={this.handleRefresh}>
              Refresh app
            </button>
          </div>

          <details className="error-boundary__details">
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
        </section>
      </main>
    );
  }
}
