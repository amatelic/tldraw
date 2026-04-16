import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnGradientChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
    mockOnGradientChange.mockClear();
  });

  it('renders the custom tab with editable HSL and hex controls', () => {
    render(<ColorPicker color="#2f80ed" onChange={mockOnChange} />);

    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Custom' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Variables' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('H')).toBeInTheDocument();
    expect(screen.getByLabelText('S')).toBeInTheDocument();
    expect(screen.getByLabelText('L')).toBeInTheDocument();
    expect(screen.getByLabelText('#')).toHaveValue('2F80ED');
  });

  it('lets the variables tab apply a preset swatch', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    fireEvent.click(screen.getByRole('button', { name: /Ocean/i }));

    expect(mockOnChange).toHaveBeenCalledWith('#2563EB', 1);
    expect(screen.getByRole('tab', { name: 'Variables' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches formats and exposes RGBA controls', () => {
    render(<ColorPicker color="#ff0000" onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HSLA' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'RGBA' }));

    expect(screen.getByRole('button', { name: 'RGBA' })).toBeInTheDocument();
    expect(screen.getByLabelText('R')).toHaveValue(255);
    expect(screen.getByLabelText('G')).toHaveValue(0);
    expect(screen.getByLabelText('B')).toHaveValue(0);
  });

  it('updates the color from RGBA inputs', () => {
    render(<ColorPicker color="#ff0000" onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'HSLA' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'RGBA' }));
    fireEvent.change(screen.getByLabelText('G'), { target: { value: '128' } });

    expect(mockOnChange).toHaveBeenLastCalledWith('#FF8000', 1);
  });

  it('displays and updates the hex input', () => {
    render(<ColorPicker color="#ffffff" onChange={mockOnChange} />);

    const hexInput = screen.getByLabelText('#');
    fireEvent.change(hexInput, { target: { value: 'FF0000' } });

    expect(hexInput).toHaveValue('FF0000');
    expect(mockOnChange).toHaveBeenCalledWith('#FF0000', 1);
  });

  it('calls onClose when close button clicked', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('Close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates HSL values when the color prop changes', () => {
    const { rerender } = render(<ColorPicker color="#000000" onChange={mockOnChange} />);

    rerender(<ColorPicker color="#ffffff" onChange={mockOnChange} />);

    expect(screen.getByLabelText('#')).toHaveValue('FFFFFF');
    expect(screen.getByLabelText('L')).toHaveValue(100);
  });

  it('shows alpha controls when enabled', () => {
    render(<ColorPicker color="#000000" alpha={0.5} onChange={mockOnChange} showAlpha />);

    expect(screen.getByLabelText('Alpha')).toHaveValue(50);
    expect(screen.getByLabelText('Hex alpha')).toHaveValue(50);
    expect(screen.getByText('A 50%')).toBeInTheDocument();
  });

  it('hides alpha controls when showAlpha is false', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} showAlpha={false} />);

    expect(screen.queryByText(/^A \d+%$/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hex alpha')).not.toBeInTheDocument();
  });

  it('clamps HSL values to valid ranges', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} />);

    const hInput = screen.getByLabelText('H');
    fireEvent.change(hInput, { target: { value: '400' } });

    expect(hInput).toHaveValue(360);
  });

  it('handles invalid hex input gracefully', () => {
    render(<ColorPicker color="#000000" onChange={mockOnChange} />);

    const hexInput = screen.getByLabelText('#');
    fireEvent.change(hexInput, { target: { value: 'GGG' } });

    expect(hexInput).toHaveValue('');
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('enables a linear gradient directly from the picker', () => {
    render(
      <ColorPicker
        color="#2563EB"
        onChange={mockOnChange}
        showAlpha={false}
        allowGradient
        onGradientChange={mockOnGradientChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Linear' }));

    expect(mockOnGradientChange).toHaveBeenCalledWith({
      type: 'linear',
      startColor: '#2563EB',
      endColor: '#7c3aed',
      angle: 45,
    });
  });

  it('updates the active gradient stop from the embedded color controls', () => {
    render(
      <ColorPicker
        color="#2563EB"
        onChange={mockOnChange}
        showAlpha={false}
        allowGradient
        gradientValue={{
          type: 'linear',
          startColor: '#2563EB',
          endColor: '#7C3AED',
          angle: 45,
        }}
        onGradientChange={mockOnGradientChange}
      />
    );

    fireEvent.click(screen.getByTitle('Edit gradient end color'));
    fireEvent.change(screen.getByLabelText('#'), { target: { value: '00FF00' } });

    expect(mockOnGradientChange).toHaveBeenLastCalledWith({
      type: 'linear',
      startColor: '#2563EB',
      endColor: '#00FF00',
      angle: 45,
    });
  });

  it('updates the linear gradient angle inside the picker', () => {
    render(
      <ColorPicker
        color="#2563EB"
        onChange={mockOnChange}
        showAlpha={false}
        allowGradient
        gradientValue={{
          type: 'linear',
          startColor: '#2563EB',
          endColor: '#7C3AED',
          angle: 45,
        }}
        onGradientChange={mockOnGradientChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Gradient angle'), { target: { value: '120' } });

    expect(mockOnGradientChange).toHaveBeenCalledWith({
      type: 'linear',
      startColor: '#2563EB',
      endColor: '#7C3AED',
      angle: 120,
    });
  });
});
