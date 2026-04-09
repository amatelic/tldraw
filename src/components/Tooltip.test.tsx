import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render children without tooltip initially', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show tooltip after delay on mouse enter', async () => {
    render(
      <Tooltip content="Test tooltip" delay={300}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Hover me' });
    fireEvent.mouseEnter(button);

    // Tooltip should not be visible immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance timers by delay
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Test tooltip')).toBeInTheDocument();
    });
  });

  it('should hide tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Test tooltip" delay={100}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Hover me' });
    
    // Show tooltip
    fireEvent.mouseEnter(button);
    vi.advanceTimersByTime(100);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    // Hide tooltip
    fireEvent.mouseLeave(button);
    
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('should cancel tooltip if mouse leaves before delay', () => {
    render(
      <Tooltip content="Test tooltip" delay={300}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Hover me' });
    fireEvent.mouseEnter(button);
    
    // Leave before delay
    vi.advanceTimersByTime(100);
    fireEvent.mouseLeave(button);
    
    // Advance past original delay
    vi.advanceTimersByTime(300);
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should use default delay of 300ms', async () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Hover me' });
    fireEvent.mouseEnter(button);

    // Should not show before 300ms
    vi.advanceTimersByTime(299);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Should show at 300ms
    vi.advanceTimersByTime(1);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('should render tooltip with different positions', () => {
    const { rerender } = render(
      <Tooltip content="Top tooltip" position="top">
        <button>Button</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    vi.advanceTimersByTime(300);

    rerender(
      <Tooltip content="Bottom tooltip" position="bottom">
        <button>Button</button>
      </Tooltip>
    );

    rerender(
      <Tooltip content="Left tooltip" position="left">
        <button>Button</button>
      </Tooltip>
    );

    rerender(
      <Tooltip content="Right tooltip" position="right">
        <button>Button</button>
      </Tooltip>
    );
  });

  it('should be accessible with keyboard focus', async () => {
    render(
      <Tooltip content="Focus tooltip" delay={100}>
        <button>Focusable</button>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Focusable' });
    
    // Focus should show tooltip
    fireEvent.focus(button);
    vi.advanceTimersByTime(100);
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    // Blur should hide tooltip
    fireEvent.blur(button);
    
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
