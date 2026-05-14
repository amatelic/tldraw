import type { BlendMode, Bounds, FillGradient } from '../../types';
import type { LayoutDraftValues, StrokeWidthPickerVariant } from './types';

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  'source-over': 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity',
};

export const MIXED_SELECT_VALUE = '__mixed__';

export const STROKE_WIDTH_VARIANTS: Array<{
  value: StrokeWidthPickerVariant;
  label: string;
}> = [
  { value: 'visual', label: 'Visual' },
  { value: 'slider', label: 'Slider' },
  { value: 'compact', label: 'Compact' },
];

export function formatHex(color: string): string {
  return color.replace('#', '').toUpperCase();
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatMeasurement(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return `${Math.round(value)}`;
}

export function buildLayoutDraft(layoutBounds?: Bounds | null): LayoutDraftValues {
  return {
    x: formatMeasurement(layoutBounds?.x),
    y: formatMeasurement(layoutBounds?.y),
    width: formatMeasurement(layoutBounds?.width),
    height: formatMeasurement(layoutBounds?.height),
  };
}

export function getGradientPreview(fillGradient: FillGradient): string {
  return fillGradient.type === 'linear'
    ? `linear-gradient(${fillGradient.angle}deg, ${fillGradient.startColor}, ${fillGradient.endColor})`
    : `radial-gradient(circle at center, ${fillGradient.startColor}, ${fillGradient.endColor})`;
}
