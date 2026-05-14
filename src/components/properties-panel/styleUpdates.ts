import type { FillGradient, ShadowStyle, ShapeStyle } from '../../types';

export function getShadowColorChange(
  shadows: ShadowStyle[],
  index: number,
  color: string,
  opacity: number
): ShadowStyle[] {
  return shadows.map((shadow, shadowIndex) =>
    shadowIndex === index ? { ...shadow, color, opacity } : shadow
  );
}

export function getFillGradientChange(
  gradient: FillGradient | null,
  fallbackFillColor: string
): Partial<ShapeStyle> {
  return {
    fillStyle: 'solid',
    fillColor: gradient?.startColor ?? fallbackFillColor,
    fillGradient: gradient,
  };
}
