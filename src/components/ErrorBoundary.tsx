import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onRefresh?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  resetCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    resetCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application error boundary caught an error', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      errorMessage: null,
      resetCount: prev.resetCount + 1,
    }));
  };

  private handleRefresh = (): void => {
    if (this.props.onRefresh) {
      this.props.onRefresh();
      return;
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background:
              'radial-gradient(circle at top, rgba(235, 241, 255, 0.92), rgba(250, 248, 255, 0.98) 45%, #ffffff 100%)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              padding: '28px',
              borderRadius: '28px',
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'rgba(255, 255, 255, 0.94)',
              boxShadow: '0 24px 64px rgba(15, 23, 42, 0.12)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5b65f5',
                }}
              >
                Application Error
              </p>
              <h1 style={{ margin: 0, fontSize: '32px', lineHeight: 1.1, color: '#111827' }}>
                Something went wrong.
              </h1>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#4b5563' }}>
                The editor hit an unexpected problem. You can retry the current session or refresh
                the app for a clean restart.
              </p>
            </div>

            {this.state.errorMessage && (
              <div
                role="alert"
                style={{
                  padding: '14px 16px',
                  borderRadius: '18px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#991b1b',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  minHeight: '42px',
                  padding: '0 18px',
                  borderRadius: '999px',
                  border: '1px solid rgba(91, 101, 245, 0.2)',
                  background: '#5b65f5',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.handleRefresh}
                style={{
                  minHeight: '42px',
                  padding: '0 18px',
                  borderRadius: '999px',
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  background: '#ffffff',
                  color: '#111827',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <div key={this.state.resetCount}>{this.props.children}</div>;
  }
}
