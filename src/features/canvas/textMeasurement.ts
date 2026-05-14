import type { Bounds, TextTypography } from '../../types';

export type MeasureTextWidth = (text: string, font: string) => number;

export const MIN_TEXT_EDIT_WIDTH = 200;
export const MIN_TEXT_EDIT_HEIGHT = 100;
export const TEXT_EDIT_HORIZONTAL_PADDING = 20;
export const TEXT_EDIT_LINE_HEIGHT_MULTIPLIER = 1.2;

export function getTextMeasurementFont(typography: TextTypography): string {
  return `${typography.fontStyle} ${typography.fontWeight} ${typography.fontSize}px ${typography.fontFamily}`;
}

export function measureTextEditBounds(
  text: string,
  currentBounds: Bounds,
  typography: TextTypography,
  measureTextWidth: MeasureTextWidth
): Bounds {
  const font = getTextMeasurementFont(typography);
  const lineHeight = typography.fontSize * TEXT_EDIT_LINE_HEIGHT_MULTIPLIER;
  const lines = text.split('\n');
  let maxWidth = MIN_TEXT_EDIT_WIDTH;
  let totalHeight = lineHeight;

  lines.forEach((line) => {
    maxWidth = Math.max(maxWidth, measureTextWidth(line, font) + TEXT_EDIT_HORIZONTAL_PADDING);
    totalHeight += lineHeight;
  });

  return {
    ...currentBounds,
    width: maxWidth,
    height: Math.max(MIN_TEXT_EDIT_HEIGHT, totalHeight),
  };
}
