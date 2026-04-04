import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertiesPanel } from '../components/PropertiesPanel';
import type { ShapeStyle } from '../types';

describe('PropertiesPanel', () => {
  const defaultStyle: ShapeStyle = {
    color: '#000000',
    fillColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'none',
    opacity: 1,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
  };

  const mockOnChange = () => {};

  it('should render PropertiesPanel with title', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Properties')).toBeDefined();
  });

  it('should render stroke color options', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Stroke Color')).toBeDefined();
  });

  it('should render fill color options', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Fill Color')).toBeDefined();
  });

  it('should render stroke width options', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Stroke Width')).toBeDefined();
  });

  it('should render stroke style dropdown', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Stroke Style')).toBeDefined();
  });

  it('should render opacity slider', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('Opacity')).toBeDefined();
  });

  it('should show text properties when hasTextSelection is true', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={true}
      />
    );
    expect(screen.getByText('Font Size')).toBeDefined();
  });

  it('should not show text properties when hasTextSelection is false', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.queryByText('Font Size')).toBeNull();
  });

  it('should display correct opacity value', () => {
    const styleWithOpacity: ShapeStyle = { ...defaultStyle, opacity: 0.5 };
    render(
      <PropertiesPanel
        style={styleWithOpacity}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('should display 100% opacity by default', () => {
    render(
      <PropertiesPanel
        style={defaultStyle}
        onChange={mockOnChange}
        hasTextSelection={false}
      />
    );
    expect(screen.getByText('100%')).toBeDefined();
  });
});
