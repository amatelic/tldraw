import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
  });

  it('should render with default props', () => {
    render(<ColorPicker color="#2f80ed" onChange={mockOnChange} />);

    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeDisabled();
    expect(screen.getByLabelText('H')).toBeInTheDocument();
    expect(screen.getByLabelText('S')).toBeInTheDocument();
    expect(screen.getByLabelText('L')).toBeInTheDocument();
  });

  it('should display current color in hex input', () => {
    render(<ColorPicker color="#ff0000" onChange={mockOnChange} />);
    
    const hexInput = screen.getByLabelText('#');
    expect(hexInput).toHaveValue('FF0000');
  });

  it('should call onChange when hex input changes', () => {
    render(<ColorPicker color="#ffffff" onChange={mockOnChange} />);
    
    const hexInput = screen.getByLabelText('#');
    fireEvent.change(hexInput, { target: { value: 'FF0000' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('#FF0000', 1);
  });

  it('should call onClose when close button clicked', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} onClose={mockOnClose} />);
    
    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update HSL values when color prop changes', () => {
    const { rerender } = render(<ColorPicker color="#000000" onChange={mockOnChange} />);
    
    rerender(<ColorPicker color="#ffffff" onChange={mockOnChange} />);
    
    const hexInput = screen.getByLabelText('#');
    expect(hexInput).toHaveValue('FFFFFF');
  });

  it('should handle alpha when showAlpha is true', () => {
    render(<ColorPicker color="#000000" alpha={0.5} onChange={mockOnChange} showAlpha />);
    
    const alphaInput = screen.getByLabelText('A');
    expect(alphaInput).toHaveValue(50);
  });

  it('should not show alpha controls when showAlpha is false', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} showAlpha={false} />);
    
    expect(screen.queryByLabelText('A')).not.toBeInTheDocument();
  });

  it('should clamp HSL values to valid ranges', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} />);
    
    const hInput = screen.getByLabelText('H');
    fireEvent.change(hInput, { target: { value: '400' } });
    
    expect(hInput).toHaveValue(360);
  });

  it('should handle invalid hex input gracefully', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} />);
    
    const hexInput = screen.getByLabelText('#');
    fireEvent.change(hexInput, { target: { value: 'GGG' } });
    
    expect(hexInput).toHaveValue('');
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
