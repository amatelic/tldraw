import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../components/ZoomControls';

describe('ZoomControls', () => {
  const mockOnZoomIn = vi.fn();
  const mockOnZoomOut = vi.fn();
  const mockOnReset = vi.fn();

  const defaultProps = {
    zoom: 1,
    onZoomIn: mockOnZoomIn,
    onZoomOut: mockOnZoomOut,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render zoom controls', () => {
    render(<ZoomControls {...defaultProps} />);
    expect(screen.getByTitle('Zoom Out')).toBeDefined();
    expect(screen.getByTitle('Zoom In')).toBeDefined();
    expect(screen.getByTitle('Reset Zoom')).toBeDefined();
  });

  it('should display current zoom percentage', () => {
    render(<ZoomControls {...defaultProps} zoom={1.5} />);
    expect(screen.getByText('150%')).toBeDefined();
  });

  it('should display 100% at default zoom', () => {
    render(<ZoomControls {...defaultProps} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('should display 50% at half zoom', () => {
    render(<ZoomControls {...defaultProps} zoom={0.5} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('should display 200% at double zoom', () => {
    render(<ZoomControls {...defaultProps} zoom={2} />);
    expect(screen.getByText('200%')).toBeDefined();
  });

  it('should call onZoomIn when zoom in button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(mockOnZoomIn).toHaveBeenCalledTimes(1);
  });

  it('should call onZoomOut when zoom out button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(mockOnZoomOut).toHaveBeenCalledTimes(1);
  });

  it('should call onReset when zoom level button is clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Reset Zoom'));
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });
});
