import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a friendly fallback with retry and refresh options', () => {
    const BrokenChild = () => {
      throw new Error('Canvas crashed');
    };

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('The board needs a quick reset.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh app' })).toBeInTheDocument();
    expect(screen.getByText('Error details')).toBeInTheDocument();
  });

  it('can retry rendering children after an error', () => {
    let shouldThrow = true;
    const RecoverableChild = () => {
      if (shouldThrow) {
        throw new Error('First render failed');
      }

      return <div>Canvas recovered</div>;
    };

    render(
      <ErrorBoundary>
        <RecoverableChild />
      </ErrorBoundary>
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Canvas recovered')).toBeInTheDocument();
  });
});
