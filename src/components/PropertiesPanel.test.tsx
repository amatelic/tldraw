import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { DEFAULT_STYLE } from '../types';

describe('PropertiesPanel', () => {
  const onChange = vi.fn();
  const onAlign = vi.fn();
  const onDistribute = vi.fn();
  const onTidy = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
    onAlign.mockClear();
    onDistribute.mockClear();
    onTidy.mockClear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('renders the inspector shell and primary sections', () => {
    const { container } = render(
      <PropertiesPanel
        style={DEFAULT_STYLE}
        onChange={onChange}
        selectedCount={1}
        layoutBounds={{ x: 24, y: 32, width: 180, height: 96 }}
      />
    );

    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /color#000000/i })).toBeInTheDocument();
    expect(container.querySelector('.panel-header')).toBeInTheDocument();
    expect(container.querySelector('.panel-badge')).toHaveTextContent('1 layer');
    expect(container.querySelectorAll('.color-control-card')).toHaveLength(2);
    expect(container.querySelector('.color-swatch-grid')).toBeInTheDocument();
  });

  it('renders layout measurements from the current selection bounds', () => {
    render(
      <PropertiesPanel
        style={DEFAULT_STYLE}
        onChange={onChange}
        selectedCount={1}
        layoutBounds={{ x: 118, y: 42, width: 264, height: 128 }}
      />
    );

    expect(screen.getByDisplayValue('118')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    expect(screen.getByDisplayValue('264')).toBeInTheDocument();
    expect(screen.getByDisplayValue('128')).toBeInTheDocument();
  });

  it('opens the stroke color picker from the redesigned color controls', () => {
    const { container } = render(
      <PropertiesPanel style={DEFAULT_STYLE} onChange={onChange} selectedCount={1} />
    );

    fireEvent.click(screen.getByTitle('Edit stroke color'));

    expect(container.querySelector('.floating-color-picker-layer')).not.toBeInTheDocument();
    expect(document.body.querySelector('.floating-color-picker-layer')).toBeInTheDocument();
    expect(document.body.querySelector('.color-picker-topbar')).toBeInTheDocument();
    expect(document.body.querySelector('.color-picker-tabs')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Variables' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('supports toggling fill off from the inline fill chip', () => {
    render(
      <PropertiesPanel
        style={{ ...DEFAULT_STYLE, fillStyle: 'solid', fillColor: '#FF0000' }}
        onChange={onChange}
        selectedCount={1}
      />
    );

    fireEvent.click(screen.getByTitle('Disable fill'));

    expect(onChange).toHaveBeenCalledWith({ fillStyle: 'none' });
  });

  it('lets the fill picker enable a linear gradient background', () => {
    render(
      <PropertiesPanel
        style={{ ...DEFAULT_STYLE, fillStyle: 'solid', fillColor: '#2563EB' }}
        onChange={onChange}
        selectedCount={1}
      />
    );

    fireEvent.click(screen.getByTitle('Edit fill color'));
    fireEvent.click(screen.getByRole('button', { name: 'Linear' }));

    expect(onChange).toHaveBeenCalledWith({
      fillStyle: 'solid',
      fillColor: '#2563EB',
      fillGradient: {
        type: 'linear',
        startColor: '#2563EB',
        endColor: '#7c3aed',
        angle: 45,
      },
    });
  });

  it('shows the embedded gradient controls inside the fill picker', () => {
    const { container } = render(
      <PropertiesPanel
        style={{
          ...DEFAULT_STYLE,
          fillStyle: 'solid',
          fillColor: '#16A34A',
          fillGradient: {
            type: 'radial',
            startColor: '#BBF7D0',
            endColor: '#15803D',
            angle: 45,
          },
        }}
        onChange={onChange}
        selectedCount={1}
      />
    );

    fireEvent.click(screen.getByTitle('Edit fill color'));

    expect(container.querySelector('.gradient-builder')).not.toBeInTheDocument();
    expect(document.body.querySelector('.floating-color-picker-layer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rounded' })).toBeInTheDocument();
    expect(screen.getByLabelText('Gradient preview')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gradient angle')).not.toBeInTheDocument();
    expect(screen.getByTitle('Edit gradient start color')).toBeInTheDocument();
    expect(screen.getByTitle('Edit gradient end color')).toBeInTheDocument();
  });

  it('lets the stroke width picker switch between comparison variants', () => {
    render(<PropertiesPanel style={DEFAULT_STYLE} onChange={onChange} selectedCount={1} />);

    expect(screen.getByRole('tab', { name: 'Visual' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    expect(onChange).toHaveBeenLastCalledWith({ strokeWidth: 4 });

    fireEvent.click(screen.getByRole('tab', { name: 'Slider' }));
    expect(screen.getByText('Live preview')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Stroke width slider'), { target: { value: '4' } });
    expect(onChange).toHaveBeenLastCalledWith({ strokeWidth: 12 });

    fireEvent.click(screen.getByRole('tab', { name: 'Compact' }));
    fireEvent.click(screen.getByRole('radio', { name: '8px' }));
    expect(onChange).toHaveBeenLastCalledWith({ strokeWidth: 8 });
  });

  it('renders text controls when a text selection is active', () => {
    render(
      <PropertiesPanel
        style={DEFAULT_STYLE}
        onChange={onChange}
        hasTextSelection
        selectedCount={1}
      />
    );

    expect(screen.getByRole('button', { name: /type/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Typeface')).toBeInTheDocument();
    expect(screen.getByText('No Text Style')).toBeInTheDocument();
  });

  it('shows multi-select arrange tools and fires tidy', () => {
    render(
      <PropertiesPanel
        style={DEFAULT_STYLE}
        onChange={onChange}
        onAlign={onAlign}
        onDistribute={onDistribute}
        onTidy={onTidy}
        selectedCount={3}
      />
    );

    fireEvent.click(screen.getByTitle('Tidy Selection'));

    expect(onTidy).toHaveBeenCalled();
    expect(screen.getByTitle('Align Left')).toBeInTheDocument();
    expect(screen.getByTitle('Distribute Horizontally')).toBeInTheDocument();
  });

  it('falls back safely for legacy styles missing newer fields', () => {
    const legacyStyle = { ...DEFAULT_STYLE } as Partial<typeof DEFAULT_STYLE>;
    delete legacyStyle.shadows;
    delete legacyStyle.blendMode;
    delete legacyStyle.fontFamily;

    render(
      <PropertiesPanel
        style={legacyStyle as typeof DEFAULT_STYLE}
        onChange={onChange}
        selectedCount={1}
      />
    );

    expect(screen.getByRole('button', { name: /effectsadd depth/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /effectsadd depth/i }));
    expect(screen.getByText('No shadows yet. Add one to give the selection more depth.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stylenormal/i })).toBeInTheDocument();
  });

  it('shows the shadow color picker before the shadow input and opacity controls', () => {
    const { container } = render(
      <PropertiesPanel
        style={{
          ...DEFAULT_STYLE,
          shadows: [{ x: 0, y: 4, blur: 8, color: '#000000', opacity: 0.2 }],
        }}
        onChange={onChange}
        selectedCount={1}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /effects1 shadow/i }));
    fireEvent.click(screen.getByTitle('Shadow Color'));

    const shadowItem = container.querySelector('.shadow-item');
    const shadowGrid = shadowItem?.querySelector('.shadow-grid');
    const opacityRow = shadowItem?.querySelector('.shadow-opacity-row');

    expect(document.body.querySelector('.floating-color-picker-layer')).toBeInTheDocument();
    expect(shadowGrid).toBeInTheDocument();
    expect(opacityRow).toBeInTheDocument();
    expect(shadowItem?.querySelector('.shadow-color-picker-container')).not.toBeInTheDocument();
  });
});
